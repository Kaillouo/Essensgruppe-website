import { Router, Response } from 'express';
import { z } from 'zod';
import { randomInt } from 'crypto';
import prisma from '../utils/prisma.util';
import { authenticateToken } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';

const router = Router();
router.use(authenticateToken as any);

// ── Types ─────────────────────────────────────────────────────────────────────

interface MinesGameState {
  userId: string;
  bet: number;
  mineCount: number;
  minePositions: number[];  // indices 0–24, NEVER sent to client while playing
  revealedSafe: number[];   // indices of safely revealed tiles
  status: 'PLAYING' | 'WON' | 'LOST';
}

// ── In-memory game state per user ─────────────────────────────────────────────

const activeGames = new Map<string, MinesGameState>();

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateMinePositions(mineCount: number): number[] {
  const arr = Array.from({ length: 25 }, (_, i) => i);
  // Cryptographic Fisher-Yates shuffle (same pattern as blackjack buildDeck)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, mineCount);
}

// 5% house edge multiplier formula.
// At k=0 returns 0.95 (reference; cashout is not allowed at k=0).
// Each safe reveal multiplies by (total - i) / (total - mineCount - i).
function calculateMultiplier(mineCount: number, safeRevealed: number): number {
  const total = 25;
  let m = 0.95;
  for (let i = 0; i < safeRevealed; i++) {
    m *= (total - i) / (total - mineCount - i);
  }
  return m;
}

// ── POST /start ───────────────────────────────────────────────────────────────

const startSchema = z.object({
  bet: z.number().int().min(10).max(50000),
  mineCount: z.number().int().min(1).max(24),
});

router.post('/start', async (req: AuthRequest, res: Response) => {
  try {
    const { bet, mineCount } = startSchema.parse(req.body);
    const userId = req.user!.id;

    if (activeGames.has(userId)) {
      return res.status(400).json({ error: 'Du hast bereits ein laufendes Spiel.' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } });
    if (!user || user.balance < bet) {
      return res.status(400).json({ error: 'Nicht genug Guthaben.' });
    }

    // Deduct bet immediately
    await prisma.user.update({ where: { id: userId }, data: { balance: { decrement: bet } } });

    const minePositions = generateMinePositions(mineCount);
    const state: MinesGameState = {
      userId,
      bet,
      mineCount,
      minePositions,
      revealedSafe: [],
      status: 'PLAYING',
    };
    activeGames.set(userId, state);

    const updated = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } });
    return res.json({
      mineCount,
      totalTiles: 25,
      revealedSafe: [],
      multiplier: 0.95,
      currentPayout: 0,
      balance: updated!.balance,
    });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    console.error('Mines start error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /reveal ──────────────────────────────────────────────────────────────

const revealSchema = z.object({
  cellIndex: z.number().int().min(0).max(24),
});

router.post('/reveal', async (req: AuthRequest, res: Response) => {
  try {
    const { cellIndex } = revealSchema.parse(req.body);
    const userId = req.user!.id;

    const state = activeGames.get(userId);
    if (!state || state.status !== 'PLAYING') {
      return res.status(400).json({ error: 'Kein aktives Spiel.' });
    }

    if (state.revealedSafe.includes(cellIndex)) {
      return res.status(400).json({ error: 'Dieses Feld wurde bereits aufgedeckt.' });
    }

    // ── Mine hit ──────────────────────────────────────────────────────────────
    if (state.minePositions.includes(cellIndex)) {
      state.status = 'LOST';
      activeGames.delete(userId);

      await prisma.$transaction([
        prisma.transaction.create({
          data: { userId, amount: -state.bet, type: 'GAME_BET', game: 'mines' },
        }),
        prisma.gameHistory.create({
          data: {
            userId,
            gameType: 'mines',
            bet: state.bet,
            result: JSON.stringify({
              mineCount: state.mineCount,
              safeRevealed: state.revealedSafe.length,
              minePositions: state.minePositions,
              outcome: 'LOST',
            }),
            payout: 0,
          },
        }),
      ]);

      const updated = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } });
      return res.json({
        isMine: true,
        revealedSafe: state.revealedSafe,
        minePositions: state.minePositions,
        multiplier: calculateMultiplier(state.mineCount, state.revealedSafe.length),
        currentPayout: 0,
        balance: updated!.balance,
        status: 'LOST',
      });
    }

    // ── Safe tile ─────────────────────────────────────────────────────────────
    state.revealedSafe.push(cellIndex);
    const safeRevealed = state.revealedSafe.length;
    const maxSafe = 25 - state.mineCount;
    const multiplier = calculateMultiplier(state.mineCount, safeRevealed);
    const currentPayout = Math.floor(state.bet * multiplier);

    // Auto-win: all safe tiles revealed
    if (safeRevealed === maxSafe) {
      state.status = 'WON';
      activeGames.delete(userId);

      await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { balance: { increment: currentPayout } } }),
        prisma.transaction.create({
          data: { userId, amount: -state.bet, type: 'GAME_BET', game: 'mines' },
        }),
        prisma.transaction.create({
          data: { userId, amount: currentPayout, type: 'GAME_WIN', game: 'mines' },
        }),
        prisma.gameHistory.create({
          data: {
            userId,
            gameType: 'mines',
            bet: state.bet,
            result: JSON.stringify({
              mineCount: state.mineCount,
              safeRevealed,
              minePositions: state.minePositions,
              outcome: 'WON',
            }),
            payout: currentPayout,
          },
        }),
      ]);

      const updated = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } });
      return res.json({
        isMine: false,
        revealedSafe: state.revealedSafe,
        minePositions: state.minePositions,
        multiplier,
        currentPayout,
        balance: updated!.balance,
        status: 'WON',
      });
    }

    // ── Still playing — do NOT send minePositions ─────────────────────────────
    return res.json({
      isMine: false,
      revealedSafe: state.revealedSafe,
      multiplier,
      currentPayout,
      status: 'PLAYING',
    });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    console.error('Mines reveal error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /cashout ─────────────────────────────────────────────────────────────

router.post('/cashout', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const state = activeGames.get(userId);
    if (!state || state.status !== 'PLAYING') {
      return res.status(400).json({ error: 'Kein aktives Spiel.' });
    }

    if (state.revealedSafe.length === 0) {
      return res.status(400).json({ error: 'Decke mindestens ein Feld auf, bevor du auszahlst.' });
    }

    const multiplier = calculateMultiplier(state.mineCount, state.revealedSafe.length);
    const payout = Math.floor(state.bet * multiplier);

    state.status = 'WON';
    activeGames.delete(userId);

    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { balance: { increment: payout } } }),
      prisma.transaction.create({
        data: { userId, amount: -state.bet, type: 'GAME_BET', game: 'mines' },
      }),
      prisma.transaction.create({
        data: { userId, amount: payout, type: 'GAME_WIN', game: 'mines' },
      }),
      prisma.gameHistory.create({
        data: {
          userId,
          gameType: 'mines',
          bet: state.bet,
          result: JSON.stringify({
            mineCount: state.mineCount,
            safeRevealed: state.revealedSafe.length,
            minePositions: state.minePositions,
            outcome: 'WON',
          }),
          payout,
        },
      }),
    ]);

    const updated = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } });
    return res.json({
      payout,
      balance: updated!.balance,
      minePositions: state.minePositions,
      revealedSafe: state.revealedSafe,
      multiplier,
    });
  } catch (err) {
    console.error('Mines cashout error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
