import { Router, Response } from 'express';
import { z } from 'zod';
import { randomInt } from 'crypto';
import prisma from '../utils/prisma.util';
import { authenticateToken } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';
import { getReservedBalance } from '../utils/balance.util';

const router = Router();
router.use(authenticateToken as any);

// ── Types ─────────────────────────────────────────────────────────────────────

type Suit = 'h' | 'd' | 'c' | 's';
// rank: 2–10 face value, 11=J, 12=Q, 13=K, 14=A
type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;
type Card = { rank: Rank; suit: Suit };

type GameStatus =
  | 'PLAYING'
  | 'PLAYER_BUST'
  | 'DEALER_BUST'
  | 'WIN'
  | 'LOSS'
  | 'PUSH'
  | 'BLACKJACK';

interface GameState {
  deck: Card[];
  playerHand: Card[];
  dealerHand: Card[];
  bet: number;
  originalBet: number;
  status: GameStatus;
  doubled: boolean;
}

// ── In-memory game state per user ─────────────────────────────────────────────

const activeGames = new Map<string, GameState>();

// ── Deck helpers ──────────────────────────────────────────────────────────────

function buildDeck(): Card[] {
  const suits: Suit[] = ['h', 'd', 'c', 's'];
  const ranks: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ rank, suit });
    }
  }
  // Cryptographic Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function cardValue(rank: Rank): number {
  if (rank >= 11 && rank <= 13) return 10; // J, Q, K
  if (rank === 14) return 11;              // Ace = 11 initially
  return rank;
}

function handValue(hand: Card[]): number {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    total += cardValue(card.rank);
    if (card.rank === 14) aces++;
  }
  // Reduce aces 11→1 as needed
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function isNaturalBlackjack(hand: Card[]): boolean {
  return hand.length === 2 && handValue(hand) === 21;
}

function dealCard(state: GameState): Card {
  return state.deck.pop()!;
}

// ── Client-safe serialiser ────────────────────────────────────────────────────

function clientState(state: GameState) {
  const hiding = state.status === 'PLAYING';
  const dealerVisible = hiding ? [state.dealerHand[0]] : state.dealerHand;
  return {
    playerHand:       state.playerHand,
    dealerHand:       dealerVisible,
    dealerHoleHidden: hiding,
    playerValue:      handValue(state.playerHand),
    dealerValue:      handValue(dealerVisible),
    bet:              state.bet,
    originalBet:      state.originalBet,
    doubled:          state.doubled,
    status:           state.status,
  };
}

// ── Settlement ────────────────────────────────────────────────────────────────

async function settleGame(userId: string, state: GameState): Promise<number> {
  let payout = 0;
  if (state.status === 'BLACKJACK') {
    // Blackjack pays 3:2 — bet returned + 1.5x profit
    payout = Math.floor(state.originalBet * 2.5);
  } else if (state.status === 'WIN' || state.status === 'DEALER_BUST') {
    payout = state.bet * 2; // bet returned + equal win
  } else if (state.status === 'PUSH') {
    payout = state.bet; // bet returned
  }
  // LOSS / PLAYER_BUST: payout = 0

  const ops: any[] = [
    prisma.transaction.create({
      data: { userId, amount: -state.originalBet, type: 'GAME_BET', game: 'blackjack' },
    }),
    prisma.gameHistory.create({
      data: {
        userId,
        gameType: 'blackjack',
        bet:      state.originalBet,
        result:   JSON.stringify({
          status:      state.status,
          playerValue: handValue(state.playerHand),
          dealerValue: handValue(state.dealerHand),
          doubled:     state.doubled,
        }),
        payout,
      },
    }),
  ];

  if (payout > 0) {
    ops.push(
      prisma.user.update({ where: { id: userId }, data: { balance: { increment: payout } } }),
      prisma.transaction.create({ data: { userId, amount: payout, type: 'GAME_WIN', game: 'blackjack' } }),
    );
  }

  await prisma.$transaction(ops);
  return payout;
}

// ── POST /deal ────────────────────────────────────────────────────────────────

const dealSchema = z.object({ bet: z.number().int().min(10).max(50000) });

router.post('/deal', async (req: AuthRequest, res: Response) => {
  try {
    const { bet } = dealSchema.parse(req.body);
    const userId = req.user!.id;

    const [user, reserved] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { balance: true } }),
      getReservedBalance(userId),
    ]);
    const available = (user?.balance ?? 0) - reserved;
    if (!user || available < bet) {
      return res.status(400).json({ error: `Insufficient available balance (available: ${available})` });
    }

    // Deduct bet immediately
    await prisma.user.update({ where: { id: userId }, data: { balance: { decrement: bet } } });

    const state: GameState = {
      deck:        buildDeck(),
      playerHand:  [],
      dealerHand:  [],
      bet,
      originalBet: bet,
      status:      'PLAYING',
      doubled:     false,
    };

    // Deal: player, dealer, player, dealer (standard order)
    state.playerHand.push(state.deck.pop()!);
    state.dealerHand.push(state.deck.pop()!);
    state.playerHand.push(state.deck.pop()!);
    state.dealerHand.push(state.deck.pop()!);

    // Natural blackjack check
    const playerBJ = isNaturalBlackjack(state.playerHand);
    const dealerBJ = isNaturalBlackjack(state.dealerHand);
    if (playerBJ && dealerBJ) state.status = 'PUSH';
    else if (playerBJ)        state.status = 'BLACKJACK';
    // (dealer blackjack alone = LOSS handled at stand — player didn't get BJ)

    if (state.status !== 'PLAYING') {
      await settleGame(userId, state);
    }

    activeGames.set(userId, state);
    const updated = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } });
    return res.json({ ...clientState(state), balance: updated!.balance });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    console.error('Blackjack deal error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /hit ─────────────────────────────────────────────────────────────────

router.post('/hit', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const state = activeGames.get(userId);
    if (!state || state.status !== 'PLAYING') {
      return res.status(400).json({ error: 'No active game' });
    }

    state.playerHand.push(dealCard(state));

    if (handValue(state.playerHand) > 21) {
      state.status = 'PLAYER_BUST';
      await settleGame(userId, state);
    }

    const updated = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } });
    return res.json({ ...clientState(state), balance: updated!.balance });
  } catch (err) {
    console.error('Blackjack hit error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /stand ───────────────────────────────────────────────────────────────

router.post('/stand', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const state = activeGames.get(userId);
    if (!state || state.status !== 'PLAYING') {
      return res.status(400).json({ error: 'No active game' });
    }

    // Dealer plays: hit on soft 16 and below, stand on hard/soft 17+
    while (handValue(state.dealerHand) < 17) {
      state.dealerHand.push(dealCard(state));
    }

    const pv = handValue(state.playerHand);
    const dv = handValue(state.dealerHand);

    if (dv > 21)      state.status = 'DEALER_BUST';
    else if (pv > dv) state.status = 'WIN';
    else if (dv > pv) state.status = 'LOSS';
    else              state.status = 'PUSH';

    await settleGame(userId, state);
    const updated = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } });
    return res.json({ ...clientState(state), balance: updated!.balance });
  } catch (err) {
    console.error('Blackjack stand error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /double ──────────────────────────────────────────────────────────────

router.post('/double', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const state = activeGames.get(userId);
    if (!state || state.status !== 'PLAYING' || state.playerHand.length !== 2) {
      return res.status(400).json({ error: 'Cannot double now' });
    }

    const [user, reserved] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { balance: true } }),
      getReservedBalance(userId),
    ]);
    const available = (user?.balance ?? 0) - reserved;
    if (!user || available < state.originalBet) {
      return res.status(400).json({ error: 'Insufficient available balance to double' });
    }

    // Deduct additional bet equal to original bet
    await prisma.user.update({ where: { id: userId }, data: { balance: { decrement: state.originalBet } } });
    state.bet = state.originalBet * 2;
    state.doubled = true;

    // Exactly one more card
    state.playerHand.push(dealCard(state));

    if (handValue(state.playerHand) > 21) {
      state.status = 'PLAYER_BUST';
    } else {
      // Dealer plays
      while (handValue(state.dealerHand) < 17) {
        state.dealerHand.push(dealCard(state));
      }
      const pv = handValue(state.playerHand);
      const dv = handValue(state.dealerHand);
      if (dv > 21)      state.status = 'DEALER_BUST';
      else if (pv > dv) state.status = 'WIN';
      else if (dv > pv) state.status = 'LOSS';
      else              state.status = 'PUSH';
    }

    await settleGame(userId, state);
    const updated = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } });
    return res.json({ ...clientState(state), balance: updated!.balance });
  } catch (err) {
    console.error('Blackjack double error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
