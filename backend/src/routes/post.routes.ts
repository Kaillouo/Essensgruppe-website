import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma.util';
import { authenticateToken } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticateToken as any);

// Validation schemas
const createPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required').max(10000),
  imageUrl: z.string().url().optional().nullable(),
});

const updatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(10000).optional(),
});

// GET /api/posts — list posts with filters
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { sort = 'new', search } = req.query;

    const where: any = {};
    if (search && typeof search === 'string') {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    let orderBy: any;
    switch (sort) {
      case 'top':
        // We'll sort by vote count after fetching
        orderBy = { createdAt: 'desc' as const };
        break;
      case 'hot':
        // Hot = recent + high votes (we'll compute after fetch)
        orderBy = { createdAt: 'desc' as const };
        break;
      case 'new':
      default:
        orderBy = { createdAt: 'desc' as const };
        break;
    }

    const posts = await prisma.post.findMany({
      where,
      orderBy,
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true },
        },
        _count: {
          select: { comments: true },
        },
      },
    });

    // Get vote counts for all posts
    const postIds = posts.map(p => p.id);
    const votes = await prisma.vote.findMany({
      where: {
        targetId: { in: postIds },
        targetType: 'POST',
      },
    });

    // Get current user's votes
    const userVotes = await prisma.vote.findMany({
      where: {
        userId: req.user!.id,
        targetId: { in: postIds },
        targetType: 'POST',
      },
    });

    const voteMap = new Map<string, number>();
    for (const v of votes) {
      voteMap.set(v.targetId, (voteMap.get(v.targetId) || 0) + v.value);
    }

    const userVoteMap = new Map<string, number>();
    for (const v of userVotes) {
      userVoteMap.set(v.targetId, v.value);
    }

    let result = posts.map(post => ({
      id: post.id,
      title: post.title,
      content: post.content,
      imageUrl: post.imageUrl,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      user: post.user,
      commentCount: post._count.comments,
      voteScore: voteMap.get(post.id) || 0,
      userVote: userVoteMap.get(post.id) || 0,
    }));

    // Sort by vote score for 'top' and 'hot'
    if (sort === 'top') {
      result.sort((a, b) => b.voteScore - a.voteScore);
    } else if (sort === 'hot') {
      // Hot: combination of recency and votes
      const now = Date.now();
      result.sort((a, b) => {
        const ageA = (now - new Date(a.createdAt).getTime()) / 3600000; // hours
        const ageB = (now - new Date(b.createdAt).getTime()) / 3600000;
        const hotA = a.voteScore / Math.pow(ageA + 2, 1.5);
        const hotB = b.voteScore / Math.pow(ageB + 2, 1.5);
        return hotB - hotA;
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// POST /api/posts — create new post
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = createPostSchema.parse(req.body);

    const post = await prisma.post.create({
      data: {
        title: data.title,
        content: data.content,
        imageUrl: data.imageUrl || null,
        userId: req.user!.id,
      },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
    });

    res.status(201).json({
      ...post,
      commentCount: 0,
      voteScore: 0,
      userVote: 0,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// GET /api/posts/:id — get single post with comments
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true },
        },
        comments: {
          include: {
            user: {
              select: { id: true, username: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Get vote score for the post
    const postVotes = await prisma.vote.findMany({
      where: { targetId: post.id, targetType: 'POST' },
    });
    const voteScore = postVotes.reduce((sum, v) => sum + v.value, 0);

    // Get user's vote on this post
    const userPostVote = await prisma.vote.findUnique({
      where: {
        userId_targetId: {
          userId: req.user!.id,
          targetId: post.id,
        },
      },
    });

    // Get vote scores for all comments
    const commentIds = post.comments.map(c => c.id);
    const commentVotes = await prisma.vote.findMany({
      where: {
        targetId: { in: commentIds },
        targetType: 'COMMENT',
      },
    });

    const commentVoteMap = new Map<string, number>();
    for (const v of commentVotes) {
      commentVoteMap.set(v.targetId, (commentVoteMap.get(v.targetId) || 0) + v.value);
    }

    // Get user's votes on comments
    const userCommentVotes = await prisma.vote.findMany({
      where: {
        userId: req.user!.id,
        targetId: { in: commentIds },
        targetType: 'COMMENT',
      },
    });

    const userCommentVoteMap = new Map<string, number>();
    for (const v of userCommentVotes) {
      userCommentVoteMap.set(v.targetId, v.value);
    }

    // Build nested comment tree
    const commentsWithVotes = post.comments.map(comment => ({
      id: comment.id,
      postId: comment.postId,
      parentCommentId: comment.parentCommentId,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      user: comment.user,
      voteScore: commentVoteMap.get(comment.id) || 0,
      userVote: userCommentVoteMap.get(comment.id) || 0,
    }));

    // Build nested tree structure
    const commentMap = new Map<string, any>();
    const rootComments: any[] = [];

    for (const comment of commentsWithVotes) {
      commentMap.set(comment.id, { ...comment, replies: [] });
    }

    for (const comment of commentsWithVotes) {
      const node = commentMap.get(comment.id)!;
      if (comment.parentCommentId) {
        const parent = commentMap.get(comment.parentCommentId);
        if (parent) {
          parent.replies.push(node);
        } else {
          rootComments.push(node);
        }
      } else {
        rootComments.push(node);
      }
    }

    res.json({
      id: post.id,
      title: post.title,
      content: post.content,
      imageUrl: post.imageUrl,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      user: post.user,
      voteScore,
      userVote: userPostVote?.value || 0,
      comments: rootComments,
      commentCount: post.comments.length,
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// PATCH /api/posts/:id — edit own post
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const data = updatePostSchema.parse(req.body);

    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'You can only edit your own posts' });
    }

    const updated = await prisma.post.update({
      where: { id: req.params.id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.content && { content: data.content }),
      },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Update post error:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// DELETE /api/posts/:id — delete own post (or admin)
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }

    // Delete associated votes first (polymorphic, not cascaded by FK)
    await prisma.vote.deleteMany({
      where: { targetId: req.params.id, targetType: 'POST' },
    });

    // Delete votes on comments of this post
    const commentIds = await prisma.comment.findMany({
      where: { postId: req.params.id },
      select: { id: true },
    });
    if (commentIds.length > 0) {
      await prisma.vote.deleteMany({
        where: {
          targetId: { in: commentIds.map(c => c.id) },
          targetType: 'COMMENT',
        },
      });
    }

    await prisma.post.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Post deleted' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// POST /api/posts/:id/comments — add comment
router.post('/:id/comments', async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      content: z.string().min(1, 'Comment cannot be empty').max(5000),
      parentCommentId: z.string().uuid().optional().nullable(),
    });

    const data = schema.parse(req.body);

    // Verify post exists
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Verify parent comment exists if provided
    if (data.parentCommentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: data.parentCommentId },
      });
      if (!parentComment) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content: data.content,
        postId: req.params.id,
        parentCommentId: data.parentCommentId || null,
        userId: req.user!.id,
      },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
    });

    res.status(201).json({
      ...comment,
      voteScore: 0,
      userVote: 0,
      replies: [],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// DELETE /api/comments/:id — delete own comment
router.delete('/comments/:id', async (req: AuthRequest, res: Response) => {
  try {
    const comment = await prisma.comment.findUnique({
      where: { id: req.params.id },
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    // Delete votes on this comment
    await prisma.vote.deleteMany({
      where: { targetId: req.params.id, targetType: 'COMMENT' },
    });

    await prisma.comment.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Comment deleted' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// POST /api/posts/:id/vote — vote on post
router.post('/:id/vote', async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      value: z.number().refine(v => v === 1 || v === -1, 'Value must be 1 or -1'),
    });

    const data = schema.parse(req.body);

    // Verify post exists
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if user already voted
    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_targetId: {
          userId: req.user!.id,
          targetId: req.params.id,
        },
      },
    });

    if (existingVote) {
      if (existingVote.value === data.value) {
        // Same vote — remove it (toggle off)
        await prisma.vote.delete({
          where: { id: existingVote.id },
        });
        return res.json({ userVote: 0 });
      } else {
        // Different vote — update it
        await prisma.vote.update({
          where: { id: existingVote.id },
          data: { value: data.value },
        });
        return res.json({ userVote: data.value });
      }
    }

    // New vote
    await prisma.vote.create({
      data: {
        userId: req.user!.id,
        targetId: req.params.id,
        targetType: 'POST',
        value: data.value,
      },
    });

    res.json({ userVote: data.value });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Vote error:', error);
    res.status(500).json({ error: 'Failed to vote' });
  }
});

// POST /api/posts/comments/:id/vote — vote on comment
router.post('/comments/:id/vote', async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      value: z.number().refine(v => v === 1 || v === -1, 'Value must be 1 or -1'),
    });

    const data = schema.parse(req.body);

    // Verify comment exists
    const comment = await prisma.comment.findUnique({
      where: { id: req.params.id },
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if user already voted
    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_targetId: {
          userId: req.user!.id,
          targetId: req.params.id,
        },
      },
    });

    if (existingVote) {
      if (existingVote.value === data.value) {
        await prisma.vote.delete({
          where: { id: existingVote.id },
        });
        return res.json({ userVote: 0 });
      } else {
        await prisma.vote.update({
          where: { id: existingVote.id },
          data: { value: data.value },
        });
        return res.json({ userVote: data.value });
      }
    }

    await prisma.vote.create({
      data: {
        userId: req.user!.id,
        targetId: req.params.id,
        targetType: 'COMMENT',
        value: data.value,
      },
    });

    res.json({ userVote: data.value });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Comment vote error:', error);
    res.status(500).json({ error: 'Failed to vote' });
  }
});

export default router;
