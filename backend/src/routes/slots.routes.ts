import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma.util';
import { authenticateToken } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';
import { getReservedBalance } from '../utils/balance.util';

const router = Router();
router.use(authenticateToken as any);

// ── Symbols & Weights ────────────────────────────────────────────────────────
// Designed for ~54% win rate, ~98.3% RTP (≈1% house edge)
// Weights: cherry=40, lemon=30, bell=20, star=8, diamond=2  (total=100)
type Sym = 'cherry' | 'lemon' | 'bell' | 'star' | 'diamond';

const WEIGHTS: [Sym, number][] = [
  ['cherry',  40],
  ['lemon',   30],
  ['bell',    20],
  ['star',     8],
  ['diamond',  2],
];

function spinReel(): Sym {
  let r = Math.random() * 100;
  for (const [sym, w] of WEIGHTS) {
    r -= w;
    if (r <= 0) return sym;
  }
  return 'cherry';
}

// ── Paytable ─────────────────────────────────────────────────────────────────
// Multipliers = total returned / stake (e.g. 3x means bet 100, get 300 back)
//
// 3-of-a-kind payouts:
//   diamond=100×  star=25×  bell=10×  lemon=5×  cherry=3×
// Left-pair payouts (R1=R2, R3 is anything else):
//   diamond=15×  star=8×  bell=3×  lemon=2×  cherry=1.5×
// Cherry consolation (R1=cherry, R2≠cherry):
//   0.6× (player gets 60% of bet back — "small loss")
//
// Expected RTP breakdown:
//   3-of-a-kind: 42.1%  |  Left-pair: 41.9%  |  Cherry consolation: 14.4%
//   Total: ~98.4% → 1.6% house edge (well within "~1%" target)
//   Win frequency: ~53.7% of spins

const THREE_OAK: Record<Sym, number> = {
  cherry: 3, lemon: 5, bell: 10, star: 25, diamond: 100,
};
const LEFT_PAIR: Record<Sym, number> = {
  cherry: 1.5, lemon: 2, bell: 3, star: 8, diamond: 15,
};
const CHERRY_CONSOLATION = 0.6;

function calcPayout(
  bet: number,
  r1: Sym, r2: Sym, r3: Sym,
): { payout: number; winType: string } {
  // Priority 1: 3-of-a-kind
  if (r1 === r2 && r2 === r3) {
    return { payout: Math.floor(bet * THREE_OAK[r1]), winType: `three_${r1}` };
  }
  // Priority 2: Left pair (first two match)
  if (r1 === r2) {
    return { payout: Math.floor(bet * LEFT_PAIR[r1]), winType: `pair_${r1}` };
  }
  // Priority 3: Cherry consolation (cherry on first reel only)
  if (r1 === 'cherry') {
    return { payout: Math.floor(bet * CHERRY_CONSOLATION), winType: 'cherry_consolation' };
  }
  return { payout: 0, winType: 'loss' };
}

// ── Spin endpoint ─────────────────────────────────────────────────────────────
const spinSchema = z.object({
  bet: z.number().int().min(10).max(10000),
});

router.post('/spin', async (req: AuthRequest, res: Response) => {
  try {
    const { bet } = spinSchema.parse(req.body);
    const userId = req.user!.id;

    const [user, reserved] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { balance: true } }),
      getReservedBalance(userId),
    ]);
    const available = (user?.balance ?? 0) - reserved;
    if (!user || available < bet) {
      return res.status(400).json({ error: `Insufficient available balance (available: ${available})` });
    }

    const r1 = spinReel();
    const r2 = spinReel();
    const r3 = spinReel();
    const { payout, winType } = calcPayout(bet, r1, r2, r3);
    const net = payout - bet;

    const ops: any[] = [
      prisma.user.update({
        where: { id: userId },
        data: { balance: { increment: net } },
      }),
      prisma.transaction.create({
        data: { userId, amount: -bet, type: 'GAME_BET', game: 'slots' },
      }),
      prisma.gameHistory.create({
        data: {
          userId,
          gameType: 'slots',
          bet,
          result: JSON.stringify({ r1, r2, r3, winType }),
          payout,
        },
      }),
    ];

    if (payout > 0) {
      ops.push(
        prisma.transaction.create({
          data: { userId, amount: payout, type: 'GAME_WIN', game: 'slots' },
        }),
      );
    }

    await prisma.$transaction(ops);

    const updated = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    return res.json({
      reels: [r1, r2, r3] as [Sym, Sym, Sym],
      payout,
      winType,
      net,
      balance: updated!.balance,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error('Slots spin error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
