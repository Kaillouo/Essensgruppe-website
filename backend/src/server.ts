import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import adminRoutes from './routes/admin.routes';
import postRoutes from './routes/post.routes';
import eventRoutes from './routes/event.routes';
import announcementRoutes from './routes/announcement.routes';
import predictionRoutes from './routes/prediction.routes';
import pokerRoutes from './routes/poker.routes';
import slotsRoutes from './routes/slots.routes';
import blackjackRoutes from './routes/blackjack.routes';
import minesRoutes from './routes/mines.routes';
import mcRoutes from './routes/mc.routes';
import abiRoutes from './routes/abi.routes';
import chatRoutes from './routes/chat.routes';
import guestGamesRoutes from './routes/guestGames.routes';
import notificationRoutes from './routes/notification.routes';
import blockRoutes from './routes/block.routes';
import { registerPokerSocket } from './socket/poker.socket';
import { registerGuestPokerSocket } from './socket/guestPoker.socket';
import prisma from './utils/prisma.util';
import { initNotificationService, createNotification, broadcastNotification } from './services/notification.service';

// Load environment variables
dotenv.config();

// Fail fast if JWT_SECRET is missing in production — a missing secret means tokens
// are signed with the known fallback string, which is a complete auth bypass.
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable is required in production');
  }
  console.warn('⚠️  JWT_SECRET not set — using insecure fallback (development only)');
}

const app = express();
app.set('trust proxy', 1); // Behind nginx reverse proxy
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-this';

// Middleware
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/poker', pokerRoutes);
app.use('/api/games/slots', slotsRoutes);
app.use('/api/games/blackjack', blackjackRoutes);
app.use('/api/games/mines', minesRoutes);
app.use('/api/mc', mcRoutes);
app.use('/api/abi', abiRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/guest', guestGamesRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/blocks', blockRoutes);

// Serve uploaded files (avatars, post images, event images)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Serve content assets (used in email templates — must be publicly accessible)
app.use('/content', express.static(path.join(__dirname, '..', '..', 'content')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Essensgruppe API is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// ── Socket.io ────────────────────────────────────────────────────────────────

const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_URL,
    credentials: true,
  },
});

// Track every logged-in user who has the site open in any tab
// userId → { socketId, username }
const siteOnline = new Map<string, { socketId: string; username: string }>();

// Inject io + siteOnline into notification service (avoids circular imports)
initNotificationService(io, siteOnline);

function broadcastOnlineUsers() {
  const list = Array.from(siteOnline.entries()).map(([userId, data]) => ({
    userId,
    username: data.username,
  }));
  // Use the new event name; also emit old name for backward compat
  io.emit('site:online_users', list);
  io.emit('games:online_users', list); // GamesPage still listens to this
}

// Auth middleware for socket connections
io.use((socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) return next(new Error('Unauthorized'));
  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      id: string;
      username: string;
      role: string;
    };
    socket.data.userId = payload.id;
    socket.data.username = payload.username;
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  const userId: string = socket.data.userId;
  const username: string = socket.data.username;

  // Add to site-wide online list the moment any logged-in user connects
  siteOnline.set(userId, { socketId: socket.id, username });
  broadcastOnlineUsers();

  // Instant message to another online user (no persistence) — legacy
  socket.on('games:message', ({ toUserId, message }: { toUserId: string; message: string }) => {
    if (!message || typeof message !== 'string') return;
    const trimmed = message.trim().slice(0, 120);
    if (!trimmed) return;
    const target = siteOnline.get(toUserId);
    if (target) {
      io.to(target.socketId).emit('games:receive_message', {
        fromUsername: username,
        message: trimmed,
      });
    }
  });

  // ── Chat: send DM ──────────────────────────────────────────────────────────
  socket.on('chat:send', async ({ toUserId, content }: { toUserId: string; content: string }) => {
    if (!content || typeof content !== 'string') return;
    const trimmed = content.trim().slice(0, 1000);
    if (!trimmed) return;

    // Check if recipient has blocked sender — silently discard
    const isBlocked = await prisma.userBlock.findUnique({
      where: { blockerId_blockedId: { blockerId: toUserId, blockedId: userId } },
    });
    if (isBlocked) return;

    // Save to DB
    const msg = await prisma.directMessage.create({
      data: { senderId: userId, receiverId: toUserId, content: trimmed },
    });

    // Auto-add both users as contacts (upsert to avoid duplicates)
    await Promise.all([
      prisma.contact.upsert({
        where: { userId_contactId: { userId, contactId: toUserId } },
        update: {},
        create: { userId, contactId: toUserId },
      }),
      prisma.contact.upsert({
        where: { userId_contactId: { userId: toUserId, contactId: userId } },
        update: {},
        create: { userId: toUserId, contactId: userId },
      }),
    ]);

    // Forward to recipient if online
    const target = siteOnline.get(toUserId);
    if (target) {
      io.to(target.socketId).emit('chat:receive', { message: msg });

      // Send updated unread count to recipient
      const unreadCount = await prisma.directMessage.count({
        where: { receiverId: toUserId, read: false },
      });
      io.to(target.socketId).emit('chat:unread_count', { count: unreadCount });
    }

    // Confirm back to sender (so it appears in their chat UI immediately)
    socket.emit('chat:receive', { message: msg });

    // Fire-and-forget: notification for new message
    createNotification({
      userId: toUserId,
      type: 'NEW_MESSAGE',
      title: `💬 Neue Nachricht von ${username}`,
      body: trimmed.slice(0, 80) + (trimmed.length > 80 ? '...' : ''),
    });
  });

  // ── Chat: mark messages as read ────────────────────────────────────────────
  socket.on('chat:read', async ({ fromUserId }: { fromUserId: string }) => {
    await prisma.directMessage.updateMany({
      where: { senderId: fromUserId, receiverId: userId, read: false },
      data: { read: true },
    });
    // Refresh unread count for this user
    const unreadCount = await prisma.directMessage.count({
      where: { receiverId: userId, read: false },
    });
    socket.emit('chat:unread_count', { count: unreadCount });
  });

  // ── Chat: typing indicator ─────────────────────────────────────────────────
  socket.on('chat:typing', ({ toUserId }: { toUserId: string }) => {
    const target = siteOnline.get(toUserId);
    if (target) {
      io.to(target.socketId).emit('chat:typing_indicator', { fromUserId: userId });
    }
  });

  // ── Send initial unread count on connect ───────────────────────────────────
  prisma.directMessage.count({ where: { receiverId: userId, read: false } }).then((count: number) => {
    socket.emit('chat:unread_count', { count });
  });

  // ── Send initial notification count on connect ────────────────────────────
  prisma.notification.count({ where: { userId, read: false } }).then((count: number) => {
    socket.emit('notification:count', { count });
  });

  // ── Daily coins notification (if claimable) ──────────────────────────────
  prisma.user.findUnique({
    where: { id: userId },
    select: { lastDailyClaim: true },
  }).then(async (u) => {
    if (!u) return;
    const canClaim = !u.lastDailyClaim ||
      (Date.now() - new Date(u.lastDailyClaim).getTime()) >= 24 * 60 * 60 * 1000;
    if (!canClaim) return;
    // Avoid duplicate — only create if no unread DAILY_COINS notification exists
    const existing = await prisma.notification.findFirst({
      where: { userId, type: 'DAILY_COINS', read: false },
    });
    if (!existing) {
      createNotification({
        userId,
        type: 'DAILY_COINS',
        title: '🪙 Tägliche Münzen verfügbar!',
        body: '1.000 Münzen können jetzt abgeholt werden.',
        linkUrl: '/',
      });
    }
  }).catch(() => {});

  // Remove on tab close / logout
  socket.on('disconnect', () => {
    siteOnline.delete(userId);
    broadcastOnlineUsers();
  });
});

registerPokerSocket(io);

// ── Guest Poker namespace ─────────────────────────────────────────────────────
// Separate Socket.io namespace for guest players — no JWT required, guestId only.

const GUEST_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const guestPokerNS = io.of('/guest-poker');
guestPokerNS.use((socket, next) => {
  const guestId = socket.handshake.auth?.guestId as string | undefined;
  if (!guestId || !GUEST_UUID_RE.test(guestId)) {
    return next(new Error('Ungültige Gast-ID'));
  }
  socket.data.guestId = guestId;
  next();
});
registerGuestPokerSocket(guestPokerNS);

// ── Message cleanup ───────────────────────────────────────────────────────────
// Delete direct messages older than 24 hours, run on startup + every hour
async function cleanupOldMessages() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const deleted = await prisma.directMessage.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  if (deleted.count > 0) {
    console.log(`🧹 Cleaned up ${deleted.count} expired chat messages`);
  }
}
cleanupOldMessages();
setInterval(cleanupOldMessages, 60 * 60 * 1000); // every hour

// ── Daily coins reminder (every 12 hours if unclaimed) ──────────────────────
async function checkDailyCoinsReminder() {
  try {
    const users = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, lastDailyClaim: true },
    });

    for (const u of users) {
      const canClaim = !u.lastDailyClaim ||
        (Date.now() - new Date(u.lastDailyClaim).getTime()) >= 24 * 60 * 60 * 1000;
      if (!canClaim) continue;

      // Only send if no unread DAILY_COINS notification exists
      const existing = await prisma.notification.findFirst({
        where: { userId: u.id, type: 'DAILY_COINS', read: false },
      });
      if (!existing) {
        createNotification({
          userId: u.id,
          type: 'DAILY_COINS',
          title: '🪙 Tägliche Münzen verfügbar!',
          body: 'Du hast deine 1.000 Münzen noch nicht abgeholt!',
          linkUrl: '/',
        });
      }
    }
  } catch (err) {
    console.error('Daily coins reminder error:', err);
  }
}
setInterval(checkDailyCoinsReminder, 12 * 60 * 60 * 1000); // every 12 hours

// ── Prediction reminder (1 hour before close) ────────────────────────────────
async function checkPredictionReminders() {
  try {
    const now = Date.now();
    const closingSoon = await prisma.prediction.findMany({
      where: {
        status: 'OPEN',
        closeDate: {
          gte: new Date(now + 50 * 60 * 1000),  // closes in > 50 min
          lte: new Date(now + 60 * 60 * 1000),  // closes in < 60 min
        },
      },
    });

    for (const pred of closingSoon) {
      const eligibleWhere: any = { status: 'ACTIVE' };
      if ((pred as any).visibility === 'ESSENSGRUPPE_ONLY') {
        eligibleWhere.role = { in: ['ESSENSGRUPPE_MITGLIED', 'ADMIN'] };
      }

      const eligible = await prisma.user.findMany({
        where: eligibleWhere,
        select: { id: true },
      });

      for (const user of eligible) {
        // Deduplicate: check for existing reminder for this prediction
        const already = await prisma.notification.findFirst({
          where: {
            userId: user.id,
            type: 'PREDICTION_REMINDER',
            linkUrl: `/games/prediction#${pred.id}`,
            createdAt: { gte: new Date(now - 2 * 60 * 60 * 1000) },
          },
        });
        if (!already) {
          createNotification({
            userId: user.id,
            type: 'PREDICTION_REMINDER',
            title: `⏰ Letzte Stunde: ${pred.title.slice(0, 60)}`,
            body: 'Diese Vorhersage schließt in weniger als 1 Stunde. Jetzt noch wetten!',
            linkUrl: `/games/prediction#${pred.id}`,
          });
        }
      }
    }
  } catch (err) {
    console.error('Prediction reminder check error:', err);
  }
}
checkPredictionReminders();
setInterval(checkPredictionReminders, 10 * 60 * 1000); // every 10 minutes

// ── Start ─────────────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});
