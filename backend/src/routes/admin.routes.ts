import { Router } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma.util';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';
import { hashPassword } from '../utils/password.util';
import { AuthRequest } from '../types';

const router = Router();

// All routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/admin/users - Get all active + banned users
router.get('/users', async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { status: { in: ['ACTIVE', 'BANNED'] } },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        balance: true,
        avatarUrl: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
            comments: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/admin/users/pending - Get pending join requests
router.get('/users/pending', async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { status: 'PENDING' },
      select: {
        id: true,
        username: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json(users);
  } catch (error) {
    console.error('Get pending users error:', error);
    res.status(500).json({ error: 'Failed to fetch pending users' });
  }
});

// PATCH /api/admin/users/:id/approve - Approve a pending user
router.patch('/users/:id/approve', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        transactions: {
          create: {
            amount: 1000,
            type: 'INITIAL_BALANCE',
          }
        }
      },
      select: { id: true, username: true, status: true }
    });

    res.json(user);
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ error: 'Failed to approve user' });
  }
});

// PATCH /api/admin/users/:id/deny - Deny (delete) a pending user
router.patch('/users/:id/deny', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    await prisma.user.delete({ where: { id } });

    res.json({ message: 'Request denied and removed.' });
  } catch (error) {
    console.error('Deny user error:', error);
    res.status(500).json({ error: 'Failed to deny user' });
  }
});

// PATCH /api/admin/users/:id/ban - Ban a user
router.patch('/users/:id/ban', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    if (id === req.user!.id) {
      return res.status(400).json({ error: 'Cannot ban yourself' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { status: 'BANNED' },
      select: { id: true, username: true, status: true }
    });

    res.json(user);
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ error: 'Failed to ban user' });
  }
});

// PATCH /api/admin/users/:id/unban - Unban a user
router.patch('/users/:id/unban', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE' },
      select: { id: true, username: true, status: true }
    });

    res.json(user);
  } catch (error) {
    console.error('Unban user error:', error);
    res.status(500).json({ error: 'Failed to unban user' });
  }
});

// POST /api/admin/users - Create new user directly (admin-created, auto ACTIVE)
router.post('/users', async (req: AuthRequest, res) => {
  try {
    const createUserSchema = z.object({
      username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
      email: z.string().email(),
      password: z.string().min(6),
      role: z.enum(['USER', 'ADMIN']).optional(),
    });

    const data = createUserSchema.parse(req.body);

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          { username: data.username }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        passwordHash,
        role: data.role || 'USER',
        status: 'ACTIVE',
        balance: 1000,
        transactions: {
          create: {
            amount: 1000,
            type: 'INITIAL_BALANCE',
          }
        }
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        balance: true,
        createdAt: true,
      }
    });

    res.status(201).json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    if (id === req.user!.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await prisma.user.delete({ where: { id } });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// PATCH /api/admin/users/:id/balance - Set or adjust user balance
router.patch('/users/:id/balance', async (req: AuthRequest, res) => {
  try {
    const balanceSchema = z.object({
      amount: z.number().int(),
      mode: z.enum(['set', 'adjust']).default('adjust'),
      reason: z.string().optional(),
    });

    const { id } = req.params;
    const data = balanceSchema.parse(req.body);

    let user;

    if (data.mode === 'set') {
      user = await prisma.user.update({
        where: { id },
        data: { balance: data.amount },
        select: { id: true, username: true, balance: true }
      });
    } else {
      user = await prisma.user.update({
        where: { id },
        data: { balance: { increment: data.amount } },
        select: { id: true, username: true, balance: true }
      });
    }

    await prisma.transaction.create({
      data: {
        userId: id,
        amount: data.amount,
        type: 'ADMIN_ADJUSTMENT',
        game: data.reason || 'Admin adjustment',
      }
    });

    res.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Adjust balance error:', error);
    res.status(500).json({ error: 'Failed to adjust balance' });
  }
});

// PATCH /api/admin/users/:id/password - Reset user password (returns new plaintext)
router.patch('/users/:id/password', async (req: AuthRequest, res) => {
  try {
    const passwordSchema = z.object({
      newPassword: z.string().min(6).max(100),
    });

    const { id } = req.params;
    const data = passwordSchema.parse(req.body);

    const newHash = await hashPassword(data.newPassword);

    await prisma.user.update({
      where: { id },
      data: { passwordHash: newHash },
    });

    res.json({ message: 'Password updated', password: data.newPassword });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// GET /api/admin/analytics - Get analytics data
router.get('/analytics', async (req: AuthRequest, res) => {
  try {
    const [
      totalUsers,
      pendingUsers,
      totalPosts,
      totalComments,
      totalEvents,
      totalTransactions,
      recentUsers
    ] = await Promise.all([
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { status: 'PENDING' } }),
      prisma.post.count(),
      prisma.comment.count(),
      prisma.event.count(),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { type: 'GAME_BET' }
      }),
      prisma.user.findMany({
        take: 5,
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        select: {
          username: true,
          createdAt: true,
        }
      })
    ]);

    res.json({
      totalUsers,
      pendingUsers,
      totalPosts,
      totalComments,
      totalEvents,
      totalBets: Math.abs(totalTransactions._sum.amount || 0),
      recentUsers,
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;
