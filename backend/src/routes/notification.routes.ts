import { Router, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';
import prisma from '../utils/prisma.util';

const router = Router();
router.use(authenticateToken);

// GET /api/notifications — last 50 notifications (unread first, then by date)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: [{ read: 'asc' }, { createdAt: 'desc' }],
      take: 50,
    });
    res.json(notifications);
  } catch (err) {
    console.error('Failed to fetch notifications:', err);
    res.status(500).json({ error: 'Fehler beim Laden der Benachrichtigungen' });
  }
});

// PATCH /api/notifications/read-all — mark all as read
router.patch('/read-all', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, read: false },
      data: { read: true },
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to mark all as read:', err);
    res.status(500).json({ error: 'Fehler beim Markieren' });
  }
});

// PATCH /api/notifications/:id/read — mark one as read
router.patch('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });
    if (!notification || notification.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Benachrichtigung nicht gefunden' });
    }
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true },
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to mark as read:', err);
    res.status(500).json({ error: 'Fehler beim Markieren' });
  }
});

// DELETE /api/notifications/:id — delete one
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });
    if (!notification || notification.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Benachrichtigung nicht gefunden' });
    }
    await prisma.notification.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete notification:', err);
    res.status(500).json({ error: 'Fehler beim Löschen' });
  }
});

// GET /api/notifications/preferences — get user's notification prefs
router.get('/preferences', async (req: AuthRequest, res: Response) => {
  try {
    let pref = await prisma.notificationPreference.findUnique({
      where: { userId: req.user!.id },
    });
    if (!pref) {
      // Return defaults
      pref = {
        id: '',
        userId: req.user!.id,
        newPost: true,
        newPrediction: true,
        predictionClosed: true,
        predictionReminder: true,
        newEvent: true,
        eventStatusChanged: true,
        dailyCoins: true,
        newMessage: true,
      };
    }
    res.json(pref);
  } catch (err) {
    console.error('Failed to fetch preferences:', err);
    res.status(500).json({ error: 'Fehler beim Laden der Einstellungen' });
  }
});

// PATCH /api/notifications/preferences — upsert preferences
router.patch('/preferences', async (req: AuthRequest, res: Response) => {
  try {
    const allowed = [
      'newPost', 'newPrediction', 'predictionClosed', 'predictionReminder',
      'newEvent', 'eventStatusChanged', 'dailyCoins', 'newMessage',
    ];
    const data: Record<string, boolean> = {};
    for (const key of allowed) {
      if (typeof req.body[key] === 'boolean') {
        data[key] = req.body[key];
      }
    }

    const pref = await prisma.notificationPreference.upsert({
      where: { userId: req.user!.id },
      update: data,
      create: { userId: req.user!.id, ...data },
    });
    res.json(pref);
  } catch (err) {
    console.error('Failed to update preferences:', err);
    res.status(500).json({ error: 'Fehler beim Speichern der Einstellungen' });
  }
});

export default router;
