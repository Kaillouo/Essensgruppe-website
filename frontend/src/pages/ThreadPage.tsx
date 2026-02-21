import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ApiService } from '../services/api.service';
import { PostDetail, Comment as CommentType } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const ThreadPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadPost();
  }, [id]);

  const loadPost = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const data = await ApiService.getPost(id) as PostDetail;
      setPost(data);
      setEditTitle(data.title);
      setEditContent(data.content);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVotePost = async (value: 1 | -1) => {
    if (!post) return;
    try {
      const result = await ApiService.votePost(post.id, value) as { userVote: number };
      const oldVote = post.userVote;
      setPost(prev => prev ? {
        ...prev,
        userVote: result.userVote,
        voteScore: prev.voteScore - oldVote + result.userVote,
      } : null);
    } catch (err: any) {
      console.error('Vote failed:', err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !post) return;

    setIsSubmittingComment(true);
    try {
      const newComment = await ApiService.createComment(post.id, {
        content: commentText.trim(),
      }) as CommentType;
      setPost(prev => prev ? {
        ...prev,
        comments: [...prev.comments, newComment],
        commentCount: prev.commentCount + 1,
      } : null);
      setCommentText('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleEditPost = async () => {
    if (!post) return;
    try {
      await ApiService.updatePost(post.id, {
        title: editTitle.trim(),
        content: editContent.trim(),
      });
      setPost(prev => prev ? {
        ...prev,
        title: editTitle.trim(),
        content: editContent.trim(),
      } : null);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeletePost = async () => {
    if (!post) return;
    try {
      await ApiService.deletePost(post.id);
      navigate('/forum');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(date).toLocaleDateString('de-DE');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <svg className="animate-spin h-8 w-8 text-primary-600" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  if (error && !post) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Link to="/forum" className="btn btn-primary">Back to Forum</Link>
      </div>
    );
  }

  if (!post) return null;

  const isOwner = user?.id === post.user.id;
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <Link to="/forum" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Forum
        </Link>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        {/* Post */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200"
        >
          <div className="flex">
            {/* Vote column */}
            <div className="flex flex-col items-center gap-1 px-4 py-6 bg-gray-50 rounded-l-xl">
              <button
                onClick={() => handleVotePost(1)}
                className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${
                  post.userVote === 1 ? 'text-orange-500' : 'text-gray-400'
                }`}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <span className={`text-lg font-bold ${
                post.voteScore > 0 ? 'text-orange-500' :
                post.voteScore < 0 ? 'text-blue-500' : 'text-gray-500'
              }`}>
                {post.voteScore}
              </span>
              <button
                onClick={() => handleVotePost(-1)}
                className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${
                  post.userVote === -1 ? 'text-blue-500' : 'text-gray-400'
                }`}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-6">
              {isEditing ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="input text-xl font-bold"
                  />
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="input min-h-[150px] resize-y"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleEditPost} className="btn btn-primary text-sm">Save</button>
                    <button onClick={() => setIsEditing(false)} className="btn btn-outline text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-gray-900 mb-3">{post.title}</h1>
                  <div className="flex items-center gap-3 mb-4 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold">
                        {post.user.username[0].toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-700">{post.user.username}</span>
                    </div>
                    <span>{timeAgo(post.createdAt)}</span>
                    {post.updatedAt !== post.createdAt && (
                      <span className="italic">(edited)</span>
                    )}
                  </div>
                  <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">{post.content}</div>

                  {post.imageUrl && (
                    <div className="mt-4 rounded-lg overflow-hidden max-w-lg">
                      <img src={post.imageUrl} alt="" className="w-full" />
                    </div>
                  )}

                  {/* Actions */}
                  {(isOwner || isAdmin) && (
                    <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                      {isOwner && (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                      )}
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Delete Confirmation */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowDeleteConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Post?</h3>
                <p className="text-gray-600 text-sm mb-4">This will permanently delete this post and all its comments.</p>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setShowDeleteConfirm(false)} className="btn btn-outline text-sm">Cancel</button>
                  <button onClick={handleDeletePost} className="btn bg-red-600 text-white hover:bg-red-700 text-sm">Delete</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Comments Section */}
        <div className="mt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {post.commentCount} {post.commentCount === 1 ? 'Comment' : 'Comments'}
          </h2>

          {/* Add Comment */}
          <form onSubmit={handleAddComment} className="mb-6">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="input w-full min-h-[100px] resize-y mb-2"
              placeholder="Write a comment..."
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmittingComment || !commentText.trim()}
                className="btn btn-primary text-sm disabled:opacity-50"
              >
                {isSubmittingComment ? 'Posting...' : 'Comment'}
              </button>
            </div>
          </form>

          {/* Comment Tree */}
          <div className="space-y-4">
            {post.comments.map(comment => (
              <CommentNode
                key={comment.id}
                comment={comment}
                postId={post.id}
                currentUserId={user?.id || ''}
                isAdmin={isAdmin}
                depth={0}
                timeAgo={timeAgo}
                onCommentAdded={() => {
                  setPost(prev => prev ? {
                    ...prev,
                    commentCount: prev.commentCount + 1,
                  } : null);
                }}
                onCommentDeleted={() => {
                  setPost(prev => prev ? {
                    ...prev,
                    commentCount: prev.commentCount - 1,
                  } : null);
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Recursive Comment Component
const CommentNode = ({
  comment,
  postId,
  currentUserId,
  isAdmin,
  depth,
  timeAgo,
  onCommentAdded,
  onCommentDeleted,
}: {
  comment: CommentType;
  postId: string;
  currentUserId: string;
  isAdmin: boolean;
  depth: number;
  timeAgo: (date: string) => string;
  onCommentAdded: (comment: CommentType) => void;
  onCommentDeleted: (commentId: string) => void;
}) => {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voteScore, setVoteScore] = useState(comment.voteScore);
  const [userVote, setUserVote] = useState(comment.userVote);
  const [replies, setReplies] = useState(comment.replies);
  const [isDeleted, setIsDeleted] = useState(false);

  const handleVote = async (value: 1 | -1) => {
    try {
      const result = await ApiService.voteComment(comment.id, value) as { userVote: number };
      const oldVote = userVote;
      setUserVote(result.userVote);
      setVoteScore(prev => prev - oldVote + result.userVote);
    } catch (err: any) {
      console.error('Vote failed:', err);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setIsSubmitting(true);
    try {
      const newComment = await ApiService.createComment(postId, {
        content: replyText.trim(),
        parentCommentId: comment.id,
      }) as CommentType;
      setReplies(prev => [...prev, newComment]);
      setReplyText('');
      setShowReply(false);
      onCommentAdded(newComment);
    } catch (err: any) {
      console.error('Reply failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await ApiService.deleteComment(comment.id);
      setIsDeleted(true);
      onCommentDeleted(comment.id);
    } catch (err: any) {
      console.error('Delete failed:', err);
    }
  };

  if (isDeleted) return null;

  const isOwner = currentUserId === comment.user.id;
  const maxDepth = 6;
  const indent = Math.min(depth, maxDepth);

  return (
    <div style={{ marginLeft: indent > 0 ? '24px' : '0' }}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg border border-gray-100 p-3"
      >
        <div className="flex gap-3">
          {/* Vote buttons */}
          <div className="flex flex-col items-center gap-0.5">
            <button
              onClick={() => handleVote(1)}
              className={`p-0.5 rounded hover:bg-gray-100 ${
                userVote === 1 ? 'text-orange-500' : 'text-gray-300'
              }`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            </button>
            <span className={`text-xs font-bold ${
              voteScore > 0 ? 'text-orange-500' :
              voteScore < 0 ? 'text-blue-500' : 'text-gray-400'
            }`}>
              {voteScore}
            </span>
            <button
              onClick={() => handleVote(-1)}
              className={`p-0.5 rounded hover:bg-gray-100 ${
                userVote === -1 ? 'text-blue-500' : 'text-gray-300'
              }`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Comment content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
                {comment.user.username[0].toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-700">{comment.user.username}</span>
              <span className="text-xs text-gray-400">{timeAgo(comment.createdAt)}</span>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>

            {/* Actions */}
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setShowReply(!showReply)}
                className="text-xs text-gray-500 hover:text-primary-600 font-medium"
              >
                Reply
              </button>
              {(isOwner || isAdmin) && (
                <button
                  onClick={handleDelete}
                  className="text-xs text-gray-500 hover:text-red-600 font-medium"
                >
                  Delete
                </button>
              )}
            </div>

            {/* Reply form */}
            {showReply && (
              <form onSubmit={handleReply} className="mt-3">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="input w-full min-h-[80px] resize-y text-sm mb-2"
                  placeholder={`Reply to ${comment.user.username}...`}
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => { setShowReply(false); setReplyText(''); }}
                    className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !replyText.trim()}
                    className="btn btn-primary text-xs py-1 px-3 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Replying...' : 'Reply'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </motion.div>

      {/* Nested replies */}
      {replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {replies.map(reply => (
            <CommentNode
              key={reply.id}
              comment={reply}
              postId={postId}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              depth={depth + 1}
              timeAgo={timeAgo}
              onCommentAdded={onCommentAdded}
              onCommentDeleted={onCommentDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
};
