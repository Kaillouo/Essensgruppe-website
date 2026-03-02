import { Router, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';
import prisma from '../utils/prisma.util';

const router = Router();
router.use(authenticateToken);

// GET /api/blocks — list blocked users
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const blocks = await prisma.userBlock.findMany({
      where: { blockerId: req.user!.id },
      include: {
        blocked: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(blocks);
  } catch (err) {
    console.error('Failed to fetch blocks:', err);
    res.status(500).json({ error: 'Fehler beim Laden der Blockliste' });
  }
});

// POST /api/blocks/:userId — block a user
router.post('/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const blockedId = req.params.userId;
    if (blockedId === req.user!.id) {
      return res.status(400).json({ error: 'Du kannst dich nicht selbst blockieren' });
    }

    // Check target user exists
    const targetUser = await prisma.user.findUnique({ where: { id: blockedId } });
    if (!targetUser) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }

    await prisma.userBlock.upsert({
      where: {
        blockerId_blockedId: { blockerId: req.user!.id, blockedId },
      },
      update: {},
      create: { blockerId: req.user!.id, blockedId },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Failed to block user:', err);
    res.status(500).json({ error: 'Fehler beim Blockieren' });
  }
});

// DELETE /api/blocks/:userId — unblock a user
router.delete('/:userId', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.userBlock.deleteMany({
      where: {
        blockerId: req.user!.id,
        blockedId: req.params.userId,
      },
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to unblock user:', err);
    res.status(500).json({ error: 'Fehler beim Entsperren' });
  }
});

export default router;
