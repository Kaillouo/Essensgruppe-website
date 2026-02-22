import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

const submitSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(4000),
});

// POST /api/abi/submit — any logged-in member; user identity is NOT stored
router.post('/submit', authenticateToken, async (req, res) => {
  try {
    const { title, content } = submitSchema.parse(req.body);
    await prisma.abiSubmission.create({ data: { title, content } });
    res.json({ success: true });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Invalid input' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/abi/submissions — admin only
router.get('/submissions', authenticateToken, requireAdmin, async (_req, res) => {
  try {
    const submissions = await prisma.abiSubmission.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(submissions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/abi/submissions/:id — admin only
router.delete('/submissions/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await prisma.abiSubmission.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
