import { Router } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma.util';
import { hashPassword, comparePassword } from '../utils/password.util';
import { generateToken } from '../utils/jwt.util';
import { loginLimiter, registerLimiter } from '../middleware/rateLimiter.middleware';
import { AuthResponse } from '../types';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string().min(6).max(100),
});

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

// POST /api/auth/register — submits a join request (stays PENDING until admin approves)
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findFirst({
      where: { username: data.username }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const passwordHash = await hashPassword(data.password);

    await prisma.user.create({
      data: {
        username: data.username,
        passwordHash,
        status: 'PENDING',
        balance: 1000,
      },
    });

    res.status(201).json({ message: 'Request submitted! Wait for admin approval before logging in.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login — login by username
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { username: data.username }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isValidPassword = await comparePassword(data.password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (user.status === 'PENDING') {
      return res.status(403).json({ error: 'Your account is awaiting admin approval.' });
    }

    if (user.status === 'BANNED') {
      return res.status(403).json({ error: 'Your account has been banned.' });
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email || '',
      role: user.role,
    });

    const response: AuthResponse = {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email || '',
        role: user.role,
        balance: user.balance,
        avatarUrl: user.avatarUrl,
      },
    };

    res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
