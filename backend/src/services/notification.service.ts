import { Server } from 'socket.io';
import { NotificationType } from '@prisma/client';
import prisma from '../utils/prisma.util';

// Injected from server.ts after io is created (avoids circular imports)
let _io: Server | null = null;
let _siteOnline: Map<string, { socketId: string; username: string }> | null = null;

export function initNotificationService(
  io: Server,
  siteOnline: Map<string, { socketId: string; username: string }>
) {
  _io = io;
  _siteOnline = siteOnline;
}

interface CreateNotificationOptions {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  linkUrl?: string;
}

// Mapping from NotificationType to NotificationPreference field name
const typeToField: Record<string, string> = {
  NEW_POST: 'newPost',
  NEW_PREDICTION: 'newPrediction',
  PREDICTION_CLOSED: 'predictionClosed',
  PREDICTION_REMINDER: 'predictionReminder',
  NEW_EVENT: 'newEvent',
  EVENT_STATUS_CHANGED: 'eventStatusChanged',
  DAILY_COINS: 'dailyCoins',
  NEW_MESSAGE: 'newMessage',
};

/**
 * Create a notification in DB and push to socket if user is online.
 * Respects user notification preferences (except ADMIN_BROADCAST — always on).
 */
export async function createNotification(opts: CreateNotificationOptions): Promise<void> {
  try {
    // Check user preference (skip for ADMIN_BROADCAST — always on)
    if (opts.type !== 'ADMIN_BROADCAST') {
      const pref = await prisma.notificationPreference.findUnique({
        where: { userId: opts.userId },
      });
      if (pref) {
        const field = typeToField[opts.type];
        if (field && (pref as any)[field] === false) return;
      }
    }

    const notification = await prisma.notification.create({
      data: {
        userId: opts.userId,
        type: opts.type,
        title: opts.title,
        body: opts.body,
        linkUrl: opts.linkUrl ?? null,
      },
    });

    // Push to socket if user is online
    if (_io && _siteOnline) {
      const target = _siteOnline.get(opts.userId);
      if (target) {
        _io.to(target.socketId).emit('notification:new', notification);

        const unreadCount = await prisma.notification.count({
          where: { userId: opts.userId, read: false },
        });
        _io.to(target.socketId).emit('notification:count', { count: unreadCount });
      }
    }
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

/**
 * Broadcast notification to multiple users. Fire-and-forget.
 */
export async function broadcastNotification(
  userIds: string[],
  type: NotificationType,
  title: string,
  body: string,
  linkUrl?: string
): Promise<void> {
  await Promise.allSettled(
    userIds.map((uid) =>
      createNotification({ userId: uid, type, title, body, linkUrl })
    )
  );
}
