import { Router, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { authenticateToken } from '../middleware/auth.middleware';
import { aiChatLimiter } from '../middleware/rateLimiter.middleware';
import { AuthRequest } from '../types';
import prisma from '../utils/prisma.util';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const router = Router();

// All chat routes require authentication
router.use(authenticateToken);

// ── GET /api/chat/contacts ──────────────────────────────────────────────────
// Returns the user's contact list with last message preview + unread count
router.get('/contacts', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  const contacts = await prisma.contact.findMany({
    where: { userId },
    include: {
      contact: {
        select: { id: true, username: true, avatarUrl: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // For each contact, get last message and unread count
  const enriched = await Promise.all(
    contacts.map(async (c: typeof contacts[number]) => {
      const lastMessage = await prisma.directMessage.findFirst({
        where: {
          OR: [
            { senderId: userId, receiverId: c.contactId },
            { senderId: c.contactId, receiverId: userId },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });

      const unreadCount = await prisma.directMessage.count({
        where: { senderId: c.contactId, receiverId: userId, read: false },
      });

      return {
        id: c.id,
        user: c.contact,
        lastMessage: lastMessage
          ? {
              content: lastMessage.content.slice(0, 60),
              createdAt: lastMessage.createdAt,
              fromMe: lastMessage.senderId === userId,
            }
          : null,
        unreadCount,
      };
    })
  );

  res.json(enriched);
});

// ── POST /api/chat/contacts/:userId ────────────────────────────────────────
// Add a user as a contact (one-sided — only adds for the requester)
router.post('/contacts/:userId', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { userId: targetId } = req.params;

  if (userId === targetId) {
    return res.status(400).json({ error: 'Du kannst dich nicht selbst hinzufügen' });
  }

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) return res.status(404).json({ error: 'Benutzer nicht gefunden' });

  await prisma.contact.upsert({
    where: { userId_contactId: { userId, contactId: targetId } },
    update: {},
    create: { userId, contactId: targetId },
  });

  res.json({ ok: true });
});

// ── DELETE /api/chat/contacts/:userId ──────────────────────────────────────
// Remove a contact (only removes YOUR side)
router.delete('/contacts/:userId', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { userId: targetId } = req.params;

  await prisma.contact.deleteMany({
    where: { userId, contactId: targetId },
  });

  res.json({ ok: true });
});

// ── GET /api/chat/messages/:userId ─────────────────────────────────────────
// Get message history with a specific user (last 50, newest first)
router.get('/messages/:userId', async (req: AuthRequest, res: Response) => {
  const myId = req.user!.id;
  const { userId: otherId } = req.params;

  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [
        { senderId: myId, receiverId: otherId },
        { senderId: otherId, receiverId: myId },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });

  // Mark received messages as read
  await prisma.directMessage.updateMany({
    where: { senderId: otherId, receiverId: myId, read: false },
    data: { read: true },
  });

  res.json(messages);
});

// ── GET /api/chat/search ───────────────────────────────────────────────────
// Search users by username (exclude self), max 10 results
router.get('/search', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const q = (req.query.q as string || '').trim();

  if (!q || q.length < 1) return res.json([]);

  const users = await prisma.user.findMany({
    where: {
      username: { contains: q, mode: 'insensitive' },
      id: { not: userId },
      status: 'ACTIVE',
    },
    select: { id: true, username: true, avatarUrl: true },
    take: 10,
  });

  res.json(users);
});

// ── GET /api/chat/unread ───────────────────────────────────────────────────
// Get total unread message count for the current user
router.get('/unread', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const count = await prisma.directMessage.count({
    where: { receiverId: userId, read: false },
  });
  res.json({ count });
});

// ── POST /api/chat/ai ──────────────────────────────────────────────────────
// Send message history, get AI reply via Claude Haiku
router.post('/ai', aiChatLimiter, async (req: AuthRequest, res: Response) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'KI-Chat ist momentan nicht verfügbar' });
  }

  const { messages } = req.body as {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Ungültige Nachrichtenhistorie' });
  }

  // Cap at last 20 messages
  const history = messages.slice(-20);

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: process.env.AI_SYSTEM_PROMPT || 'Du bist ein hilfreicher Assistent für die Essensgruppe, eine Abitur 2027 Schulklasse. Sei freundlich, kurz und auf Deutsch.',
      messages: history,
    });

    const reply = response.content[0].type === 'text' ? response.content[0].text : '';
    res.json({ reply });
  } catch (err) {
    console.error('AI chat error:', err);
    res.status(500).json({ error: 'KI-Antwort konnte nicht generiert werden' });
  }
});

export default router;
