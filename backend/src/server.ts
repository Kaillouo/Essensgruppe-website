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
import mcRoutes from './routes/mc.routes';
import abiRoutes from './routes/abi.routes';
import { registerPokerSocket } from './socket/poker.socket';

// Load environment variables
dotenv.config();

const app = express();
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
app.use('/api/mc', mcRoutes);
app.use('/api/abi', abiRoutes);

// Serve uploaded files (avatars, post images, event images)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

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

  // Instant message to another online user (no persistence)
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

  // Remove on tab close / logout
  socket.on('disconnect', () => {
    siteOnline.delete(userId);
    broadcastOnlineUsers();
  });
});

registerPokerSocket(io);

// ── Start ─────────────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});
