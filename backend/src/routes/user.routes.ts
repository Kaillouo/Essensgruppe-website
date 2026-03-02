import { Router } from 'express';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import prisma from '../utils/prisma.util';
import { authenticateToken } from '../middleware/auth.middleware';
import { hashPassword, comparePassword } from '../utils/password.util';
import { uploadAvatar } from '../middleware/upload.middleware';
import { AuthRequest, UpdateProfileDto, ChangePasswordDto } from '../types';
import { getReservedBalance } from '../utils/balance.util';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/users/me - Get current user profile
router.get('/me', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        balance: true,
        avatarUrl: true,
        lastDailyClaim: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
            comments: true,
            votes: true,
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const reserved = await getReservedBalance(user.id);
    res.json({ ...user, reserved });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// POST /api/users/daily-claim - Claim daily 1000 coins
router.post('/daily-claim', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, balance: true, lastDailyClaim: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const now = new Date();
    const lastClaim = user.lastDailyClaim ? new Date(user.lastDailyClaim) : null;
    const canClaim = !lastClaim || (now.getTime() - lastClaim.getTime()) > 24 * 60 * 60 * 1000;

    if (!canClaim) {
      // Calculate next claim time
      const nextClaimTime = new Date(lastClaim!.getTime() + 24 * 60 * 60 * 1000);
      const msUntilClaim = nextClaimTime.getTime() - now.getTime();
      return res.json({ claimed: false, nextClaimIn: msUntilClaim });
    }

    // Award 1000 coins
    const dailyCoins = 1000;
    const newBalance = user.balance + dailyCoins;

    // Update user and create transaction
    const [updatedUser] = await Promise.all([
      prisma.user.update({
        where: { id: req.user!.id },
        data: {
          balance: newBalance,
          lastDailyClaim: now
        },
        select: { balance: true }
      }),
      prisma.transaction.create({
        data: {
          userId: req.user!.id,
          amount: dailyCoins,
          type: 'DAILY_COINS'
        }
      })
    ]);

    res.json({ claimed: true, newBalance: updatedUser.balance, lastDailyClaim: now.toISOString() });
  } catch (error) {
    console.error('Daily claim error:', error);
    res.status(500).json({ error: 'Failed to claim daily coins' });
  }
});

// PATCH /api/users/me - Update profile
router.patch('/me', async (req: AuthRequest, res) => {
  try {
    const updateSchema = z.object({
      username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/).optional(),
      email: z.string().email().optional(),
    });

    const data: UpdateProfileDto = updateSchema.parse(req.body);

    // Non-admin users cannot change their email
    if (data.email && req.user!.role !== 'ADMIN') {
      delete data.email;
    }

    // Check if username/email is already taken by another user
    if (data.username || data.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: req.user!.id } },
            {
              OR: [
                data.username ? { username: data.username } : {},
                data.email ? { email: data.email } : {},
              ]
            }
          ]
        }
      });

      if (existingUser) {
        return res.status(400).json({ error: 'Username or email already taken' });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        balance: true,
        avatarUrl: true,
      }
    });

    res.json(updatedUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/users/me/password - Change password
router.put('/me/password', async (req: AuthRequest, res) => {
  try {
    const passwordSchema = z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(6).max(100),
    });

    const data: ChangePasswordDto = passwordSchema.parse(req.body);

    // Get current user with password hash
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await comparePassword(data.currentPassword, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(data.newPassword);

    // Update password
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { passwordHash: newPasswordHash }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// DELETE /api/users/me - Delete account
router.delete('/me', async (req: AuthRequest, res) => {
  try {
    await prisma.user.delete({
      where: { id: req.user!.id }
    });

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// POST /api/users/me/avatar - Upload profile picture
router.post('/me/avatar', (req: AuthRequest, res) => {
  uploadAvatar(req as any, res as any, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    try {
      // Auto-orient from EXIF first (phone photos), then crop and resize
      const tmpPath = file.path + '.tmp';
      await sharp(file.path)
        .rotate()
        .resize(256, 256, { fit: 'cover', position: 'centre' })
        .jpeg({ quality: 85 })
        .toFile(tmpPath);
      fs.renameSync(tmpPath, file.path);

      const avatarUrl = `/uploads/avatars/${file.filename}`;

      // Delete old avatar file if one exists
      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { avatarUrl: true },
      });
      if (currentUser?.avatarUrl) {
        const oldFilename = path.basename(currentUser.avatarUrl);
        const oldPath = path.join(__dirname, '..', '..', 'uploads', 'avatars', oldFilename);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      const updatedUser = await prisma.user.update({
        where: { id: req.user!.id },
        data: { avatarUrl },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          balance: true,
          avatarUrl: true,
        },
      });

      res.json(updatedUser);
    } catch (error) {
      console.error('Avatar upload error:', error);
      res.status(500).json({ error: 'Failed to upload avatar' });
    }
  });
});

// GET /api/users/me/transactions - Get user transactions
router.get('/me/transactions', async (req: AuthRequest, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50, // Last 50 transactions
    });

    res.json(transactions);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// GET /api/users/me/games - Get user game history
router.get('/me/games', async (req: AuthRequest, res) => {
  try {
    const games = await prisma.gameHistory.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50, // Last 50 games
    });

    res.json(games);
  } catch (error) {
    console.error('Get game history error:', error);
    res.status(500).json({ error: 'Failed to fetch game history' });
  }
});

export default router;
