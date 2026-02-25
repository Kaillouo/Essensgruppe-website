import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma.util';
import { authenticateToken } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';
import { getReservedBalance } from '../utils/balance.util';

const router = Router();
router.use(authenticateToken as any);

const createSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(300),
  closeDate: z.string().datetime('Invalid date'),
});

const betSchema = z.object({
  side: z.boolean(),   // true = YES, false = NO
  amount: z.number().int().min(1, 'Minimum bet is 1'),
});

const resolveSchema = z.object({
  outcome: z.boolean(), // true = YES wins, false = NO wins
});

// Helper: map prediction + bets to API shape
function mapPrediction(
  p: {
    id: string;
    title: string;
    closeDate: Date;
    status: string;
    outcome: boolean | null;
    createdAt: Date;
    updatedAt: Date;
    creator: { id: string; username: string };
    bets: { userId: string; side: boolean; amount: number }[];
  },
  viewerId: string
) {
  const yesBets = p.bets.filter((b) => b.side);
  const noBets  = p.bets.filter((b) => !b.side);
  const userBet = p.bets.find((b) => b.userId === viewerId);
  return {
    id:        p.id,
    title:     p.title,
    closeDate: p.closeDate,
    status:    p.status,
    outcome:   p.outcome,
    createdAt: p.createdAt,
    creator:   p.creator,
    totalYes:  yesBets.reduce((s, b) => s + b.amount, 0),
    totalNo:   noBets.reduce((s, b) => s + b.amount, 0),
    yesCount:  yesBets.length,
    noCount:   noBets.length,
    userBet:   userBet ? { side: userBet.side, amount: userBet.amount } : null,
  };
}

const betInclude = {
  creator: { select: { id: true, username: true } },
  bets: { select: { userId: true, side: true, amount: true } },
} as const;

// GET /api/predictions
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const predictions = await prisma.prediction.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: betInclude,
    });
    res.json(predictions.map((p) => mapPrediction(p, req.user!.id)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch predictions' });
  }
});

// POST /api/predictions — create
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { title, closeDate } = createSchema.parse(req.body);
    const prediction = await prisma.prediction.create({
      data: { creatorId: req.user!.id, title, closeDate: new Date(closeDate) },
      include: betInclude,
    });
    res.status(201).json(mapPrediction(prediction, req.user!.id));
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    console.error(err);
    res.status(500).json({ error: 'Failed to create prediction' });
  }
});

// POST /api/predictions/:id/bet
router.post('/:id/bet', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { side, amount } = betSchema.parse(req.body);
    const userId = req.user!.id;

    const prediction = await prisma.prediction.findUnique({
      where: { id },
      include: { bets: { select: { userId: true } } },
    });
    if (!prediction)                        return res.status(404).json({ error: 'Prediction not found' });
    if (prediction.status !== 'OPEN')       return res.status(400).json({ error: 'Prediction is already closed' });
    if (prediction.creatorId === userId)    return res.status(403).json({ error: 'Creators cannot bet on their own prediction' });
    if (prediction.bets.find((b) => b.userId === userId))
                                            return res.status(400).json({ error: 'You have already placed a bet' });

    // Reserve the amount: don't deduct yet, but check available balance
    const [user, reserved] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { balance: true } }),
      getReservedBalance(userId),
    ]);
    const available = (user?.balance ?? 0) - reserved;
    if (!user || available < amount)
      return res.status(400).json({ error: `Insufficient available balance (available: ${available})` });

    // Record reservation — balance is NOT deducted yet
    await prisma.predictionBet.create({ data: { predictionId: id, userId, side, amount } });

    const updated = await prisma.prediction.findUnique({ where: { id }, include: betInclude });
    res.json(mapPrediction(updated!, userId));
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    console.error(err);
    res.status(500).json({ error: 'Failed to place bet' });
  }
});

// POST /api/predictions/:id/resolve — creator only
router.post('/:id/resolve', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { outcome } = resolveSchema.parse(req.body);
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'ADMIN';

    const prediction = await prisma.prediction.findUnique({
      where: { id },
      include: { bets: true },
    });
    if (!prediction)                                        return res.status(404).json({ error: 'Prediction not found' });
    if (!isAdmin && prediction.creatorId !== userId)        return res.status(403).json({ error: 'Only the creator can resolve this' });
    if (prediction.status !== 'OPEN')                      return res.status(400).json({ error: 'Already resolved' });

    const winnerBets = prediction.bets.filter((b) => b.side === outcome);
    const loserBets  = prediction.bets.filter((b) => b.side !== outcome);
    const totalWin   = winnerBets.reduce((s, b) => s + b.amount, 0);
    const totalLose  = loserBets.reduce((s, b) => s + b.amount, 0);

    const payoutOps: Parameters<typeof prisma.$transaction>[0] = [];

    if (totalWin > 0 && totalLose > 0) {
      // Winners: reserved amount stays (never deducted), they receive proportional share of losers' pool
      for (const bet of winnerBets) {
        const winnings = Math.floor((bet.amount / totalWin) * totalLose);
        if (winnings > 0) {
          payoutOps.push(
            prisma.user.update({ where: { id: bet.userId }, data: { balance: { increment: winnings } } }),
            prisma.transaction.create({ data: { userId: bet.userId, amount: winnings, type: 'PREDICTION_WIN', game: 'prediction' } }),
          );
        }
      }
      // Losers: NOW deduct the reserved amount from their actual balance
      for (const bet of loserBets) {
        payoutOps.push(
          prisma.user.update({ where: { id: bet.userId }, data: { balance: { decrement: bet.amount } } }),
          prisma.transaction.create({ data: { userId: bet.userId, amount: -bet.amount, type: 'PREDICTION_BET', game: 'prediction' } }),
        );
      }
    } else if (totalWin > 0 && totalLose === 0) {
      // Everyone bet on the winning side — nobody loses anything (reservations freed)
    } else {
      // Nobody bet on the winning side — all reservations freed (no balance changes needed)
    }

    await prisma.$transaction([
      prisma.prediction.update({ where: { id }, data: { status: 'CLOSED', outcome } }),
      ...payoutOps,
    ]);

    res.json({ message: 'Prediction resolved' });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    console.error(err);
    res.status(500).json({ error: 'Failed to resolve prediction' });
  }
});

// DELETE /api/predictions/:id — creator (only if no bets) or admin
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId  = req.user!.id;
    const isAdmin = req.user!.role === 'ADMIN';

    const prediction = await prisma.prediction.findUnique({
      where: { id },
      include: { bets: { select: { id: true } } },
    });
    if (!prediction)                                  return res.status(404).json({ error: 'Prediction not found' });
    if (!isAdmin && prediction.creatorId !== userId)  return res.status(403).json({ error: 'Not authorized' });
    if (!isAdmin && prediction.bets.length > 0)       return res.status(400).json({ error: 'Cannot delete a prediction that already has bets' });

    await prisma.prediction.delete({ where: { id } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete prediction' });
  }
});

export default router;
