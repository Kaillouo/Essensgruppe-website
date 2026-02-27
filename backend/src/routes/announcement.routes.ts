import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma.util';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';

const router = Router();

router.use(authenticateToken as any);

const createSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required').max(5000),
});

// GET /api/announcements — list all announcements (newest first)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
      },
    });
    res.json(announcements);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// POST /api/announcements — admin only, create announcement
router.post('/', requireAdmin as any, async (req: AuthRequest, res: Response) => {
  try {
    const data = createSchema.parse(req.body);
    const announcement = await prisma.announcement.create({
      data: {
        userId: req.user!.id,
        title: data.title,
        content: data.content,
      },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
      },
    });
    res.status(201).json(announcement);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// DELETE /api/announcements/:id — admin only
router.delete('/:id', requireAdmin as any, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const ann = await prisma.announcement.findUnique({ where: { id } });
    if (!ann) return res.status(404).json({ error: 'Announcement not found' });

    await prisma.announcement.delete({ where: { id } });
    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

export default router;
