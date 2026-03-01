import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { randomInt } from 'crypto';
import { authenticateGuest, GuestRequest } from '../middleware/guestAuth.middleware';
import { getOrCreateGuest, getGuestBalance, adjustGuestBalance } from '../state/guestState';

const router = Router();

// ── Session endpoints (no auth required) ──────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /session — create or reconnect to a guest session
router.post('/session', (req: Request, res: Response) => {
  const { guestId } = req.body;
  if (!guestId || !UUID_RE.test(guestId)) {
    return res.status(400).json({ error: 'Ungültige Gast-ID.' });
  }
  const session = getOrCreateGuest(guestId);
  return res.json({ guestId, balance: session.balance });
});

// GET /balance — check current balance (requires x-guest-id header)
router.get('/balance', authenticateGuest as any, (req: GuestRequest, res: Response) => {
  const balance = getGuestBalance(req.guestId!);
  if (balance === null) {
    // Session expired — create fresh
    const session = getOrCreateGuest(req.guestId!);
    return res.json({ balance: session.balance });
  }
  return res.json({ balance });
});

// ── All game routes below require valid guestId ────────────────────────────────

router.use(authenticateGuest as any);

// ══════════════════════════════════════════════════════════════════════════════
// BLACKJACK
// ══════════════════════════════════════════════════════════════════════════════

type Suit = 'h' | 'd' | 'c' | 's';
type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;
type Card = { rank: Rank; suit: Suit };
type GameStatus = 'PLAYING' | 'PLAYER_BUST' | 'DEALER_BUST' | 'WIN' | 'LOSS' | 'PUSH' | 'BLACKJACK';

interface BlackjackState {
  deck: Card[];
  playerHand: Card[];
  dealerHand: Card[];
  bet: number;
  originalBet: number;
  status: GameStatus;
  doubled: boolean;
}

const guestBlackjackGames = new Map<string, BlackjackState>();

function buildDeck(): Card[] {
  const suits: Suit[] = ['h', 'd', 'c', 's'];
  const ranks: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ rank, suit });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function cardValue(rank: Rank): number {
  if (rank >= 11 && rank <= 13) return 10;
  if (rank === 14) return 11;
  return rank;
}

function handValue(hand: Card[]): number {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    total += cardValue(card.rank);
    if (card.rank === 14) aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function isNaturalBlackjack(hand: Card[]): boolean {
  return hand.length === 2 && handValue(hand) === 21;
}

function bjClientState(state: BlackjackState, balance: number) {
  const hiding = state.status === 'PLAYING';
  const dealerVisible = hiding ? [state.dealerHand[0]] : state.dealerHand;
  return {
    playerHand: state.playerHand,
    dealerHand: dealerVisible,
    dealerHoleHidden: hiding,
    playerValue: handValue(state.playerHand),
    dealerValue: handValue(dealerVisible),
    bet: state.bet,
    originalBet: state.originalBet,
    doubled: state.doubled,
    status: state.status,
    balance,
  };
}

function settleBlackjack(guestId: string, state: BlackjackState): number {
  let payout = 0;
  if (state.status === 'BLACKJACK') {
    payout = Math.floor(state.originalBet * 2.5);
  } else if (state.status === 'WIN' || state.status === 'DEALER_BUST') {
    payout = state.bet * 2;
  } else if (state.status === 'PUSH') {
    payout = state.bet;
  }
  if (payout > 0) {
    adjustGuestBalance(guestId, payout);
  }
  return payout;
}

const bjDealSchema = z.object({ bet: z.number().int().min(10).max(50000) });

router.post('/blackjack/deal', (req: GuestRequest, res: Response) => {
  try {
    const { bet } = bjDealSchema.parse(req.body);
    const guestId = req.guestId!;
    const session = getOrCreateGuest(guestId);

    if (session.balance < bet) {
      return res.status(400).json({ error: 'Nicht genug Sitzungsguthaben.' });
    }

    // Deduct bet
    adjustGuestBalance(guestId, -bet);

    const state: BlackjackState = {
      deck: buildDeck(),
      playerHand: [],
      dealerHand: [],
      bet,
      originalBet: bet,
      status: 'PLAYING',
      doubled: false,
    };

    state.playerHand.push(state.deck.pop()!);
    state.dealerHand.push(state.deck.pop()!);
    state.playerHand.push(state.deck.pop()!);
    state.dealerHand.push(state.deck.pop()!);

    const playerBJ = isNaturalBlackjack(state.playerHand);
    const dealerBJ = isNaturalBlackjack(state.dealerHand);
    if (playerBJ && dealerBJ) state.status = 'PUSH';
    else if (playerBJ) state.status = 'BLACKJACK';

    if (state.status !== 'PLAYING') {
      settleBlackjack(guestId, state);
    }

    guestBlackjackGames.set(guestId, state);
    const balance = getGuestBalance(guestId)!;
    return res.json(bjClientState(state, balance));
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    console.error('Guest BJ deal error:', err);
    return res.status(500).json({ error: 'Server-Fehler.' });
  }
});

router.post('/blackjack/hit', (req: GuestRequest, res: Response) => {
  try {
    const guestId = req.guestId!;
    const state = guestBlackjackGames.get(guestId);
    if (!state || state.status !== 'PLAYING') {
      return res.status(400).json({ error: 'Kein aktives Spiel.' });
    }

    state.playerHand.push(state.deck.pop()!);

    if (handValue(state.playerHand) > 21) {
      state.status = 'PLAYER_BUST';
      settleBlackjack(guestId, state);
    }

    const balance = getGuestBalance(guestId)!;
    return res.json(bjClientState(state, balance));
  } catch (err) {
    console.error('Guest BJ hit error:', err);
    return res.status(500).json({ error: 'Server-Fehler.' });
  }
});

router.post('/blackjack/stand', (req: GuestRequest, res: Response) => {
  try {
    const guestId = req.guestId!;
    const state = guestBlackjackGames.get(guestId);
    if (!state || state.status !== 'PLAYING') {
      return res.status(400).json({ error: 'Kein aktives Spiel.' });
    }

    while (handValue(state.dealerHand) < 17) {
      state.dealerHand.push(state.deck.pop()!);
    }

    const pv = handValue(state.playerHand);
    const dv = handValue(state.dealerHand);

    if (dv > 21) state.status = 'DEALER_BUST';
    else if (pv > dv) state.status = 'WIN';
    else if (dv > pv) state.status = 'LOSS';
    else state.status = 'PUSH';

    settleBlackjack(guestId, state);
    const balance = getGuestBalance(guestId)!;
    return res.json(bjClientState(state, balance));
  } catch (err) {
    console.error('Guest BJ stand error:', err);
    return res.status(500).json({ error: 'Server-Fehler.' });
  }
});

router.post('/blackjack/double', (req: GuestRequest, res: Response) => {
  try {
    const guestId = req.guestId!;
    const state = guestBlackjackGames.get(guestId);
    if (!state || state.status !== 'PLAYING' || state.playerHand.length !== 2) {
      return res.status(400).json({ error: 'Verdoppeln jetzt nicht möglich.' });
    }

    const balance = getGuestBalance(guestId)!;
    if (balance < state.originalBet) {
      return res.status(400).json({ error: 'Nicht genug Guthaben zum Verdoppeln.' });
    }

    adjustGuestBalance(guestId, -state.originalBet);
    state.bet = state.originalBet * 2;
    state.doubled = true;

    state.playerHand.push(state.deck.pop()!);

    if (handValue(state.playerHand) > 21) {
      state.status = 'PLAYER_BUST';
    } else {
      while (handValue(state.dealerHand) < 17) {
        state.dealerHand.push(state.deck.pop()!);
      }
      const pv = handValue(state.playerHand);
      const dv = handValue(state.dealerHand);
      if (dv > 21) state.status = 'DEALER_BUST';
      else if (pv > dv) state.status = 'WIN';
      else if (dv > pv) state.status = 'LOSS';
      else state.status = 'PUSH';
    }

    settleBlackjack(guestId, state);
    const newBalance = getGuestBalance(guestId)!;
    return res.json(bjClientState(state, newBalance));
  } catch (err) {
    console.error('Guest BJ double error:', err);
    return res.status(500).json({ error: 'Server-Fehler.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// SLOTS
// ══════════════════════════════════════════════════════════════════════════════

type Sym = 'cherry' | 'lemon' | 'bell' | 'star' | 'diamond';

const WEIGHTS: [Sym, number][] = [
  ['cherry', 40],
  ['lemon', 30],
  ['bell', 20],
  ['star', 8],
  ['diamond', 2],
];

function spinReel(): Sym {
  let r = Math.random() * 100;
  for (const [sym, w] of WEIGHTS) {
    r -= w;
    if (r <= 0) return sym;
  }
  return 'cherry';
}

const THREE_OAK: Record<Sym, number> = {
  cherry: 3, lemon: 5, bell: 10, star: 25, diamond: 100,
};
const LEFT_PAIR: Record<Sym, number> = {
  cherry: 1.5, lemon: 2, bell: 3, star: 8, diamond: 15,
};
const CHERRY_CONSOLATION = 0.6;

function calcPayout(bet: number, r1: Sym, r2: Sym, r3: Sym): { payout: number; winType: string } {
  if (r1 === r2 && r2 === r3) {
    return { payout: Math.floor(bet * THREE_OAK[r1]), winType: `three_${r1}` };
  }
  if (r1 === r2) {
    return { payout: Math.floor(bet * LEFT_PAIR[r1]), winType: `pair_${r1}` };
  }
  if (r1 === 'cherry') {
    return { payout: Math.floor(bet * CHERRY_CONSOLATION), winType: 'cherry_consolation' };
  }
  return { payout: 0, winType: 'loss' };
}

const slotsSchema = z.object({ bet: z.number().int().min(10).max(10000) });

router.post('/slots/spin', (req: GuestRequest, res: Response) => {
  try {
    const { bet } = slotsSchema.parse(req.body);
    const guestId = req.guestId!;
    const session = getOrCreateGuest(guestId);

    if (session.balance < bet) {
      return res.status(400).json({ error: 'Nicht genug Sitzungsguthaben.' });
    }

    const r1 = spinReel();
    const r2 = spinReel();
    const r3 = spinReel();
    const { payout, winType } = calcPayout(bet, r1, r2, r3);
    const net = payout - bet;

    adjustGuestBalance(guestId, net);
    const balance = getGuestBalance(guestId)!;

    return res.json({
      reels: [r1, r2, r3] as [Sym, Sym, Sym],
      payout,
      winType,
      net,
      balance,
    });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    console.error('Guest slots spin error:', err);
    return res.status(500).json({ error: 'Server-Fehler.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// MINES
// ══════════════════════════════════════════════════════════════════════════════

interface MinesGameState {
  guestId: string;
  bet: number;
  mineCount: number;
  minePositions: number[];
  revealedSafe: number[];
  status: 'PLAYING' | 'WON' | 'LOST';
}

const guestMinesGames = new Map<string, MinesGameState>();

function generateMinePositions(mineCount: number): number[] {
  const arr = Array.from({ length: 25 }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, mineCount);
}

function calculateMultiplier(mineCount: number, safeRevealed: number): number {
  const total = 25;
  let m = 0.95;
  for (let i = 0; i < safeRevealed; i++) {
    m *= (total - i) / (total - mineCount - i);
  }
  return m;
}

const minesStartSchema = z.object({
  bet: z.number().int().min(10).max(50000),
  mineCount: z.number().int().min(1).max(24),
});

router.post('/mines/start', (req: GuestRequest, res: Response) => {
  try {
    const { bet, mineCount } = minesStartSchema.parse(req.body);
    const guestId = req.guestId!;
    const session = getOrCreateGuest(guestId);

    if (guestMinesGames.has(guestId)) {
      return res.status(400).json({ error: 'Du hast bereits ein laufendes Spiel.' });
    }

    if (session.balance < bet) {
      return res.status(400).json({ error: 'Nicht genug Sitzungsguthaben.' });
    }

    adjustGuestBalance(guestId, -bet);

    const minePositions = generateMinePositions(mineCount);
    const state: MinesGameState = {
      guestId,
      bet,
      mineCount,
      minePositions,
      revealedSafe: [],
      status: 'PLAYING',
    };
    guestMinesGames.set(guestId, state);

    const balance = getGuestBalance(guestId)!;
    return res.json({
      mineCount,
      totalTiles: 25,
      revealedSafe: [],
      multiplier: 0.95,
      currentPayout: 0,
      balance,
    });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    console.error('Guest mines start error:', err);
    return res.status(500).json({ error: 'Server-Fehler.' });
  }
});

const minesRevealSchema = z.object({ cellIndex: z.number().int().min(0).max(24) });

router.post('/mines/reveal', (req: GuestRequest, res: Response) => {
  try {
    const { cellIndex } = minesRevealSchema.parse(req.body);
    const guestId = req.guestId!;
    const state = guestMinesGames.get(guestId);

    if (!state || state.status !== 'PLAYING') {
      return res.status(400).json({ error: 'Kein aktives Spiel.' });
    }

    if (state.revealedSafe.includes(cellIndex)) {
      return res.status(400).json({ error: 'Dieses Feld wurde bereits aufgedeckt.' });
    }

    // Mine hit
    if (state.minePositions.includes(cellIndex)) {
      state.status = 'LOST';
      guestMinesGames.delete(guestId);

      const balance = getGuestBalance(guestId)!;
      return res.json({
        isMine: true,
        revealedSafe: state.revealedSafe,
        minePositions: state.minePositions,
        multiplier: calculateMultiplier(state.mineCount, state.revealedSafe.length),
        currentPayout: 0,
        balance,
        status: 'LOST',
      });
    }

    // Safe tile
    state.revealedSafe.push(cellIndex);
    const safeRevealed = state.revealedSafe.length;
    const maxSafe = 25 - state.mineCount;
    const multiplier = calculateMultiplier(state.mineCount, safeRevealed);
    const currentPayout = Math.floor(state.bet * multiplier);

    // Auto-win: all safe tiles revealed
    if (safeRevealed === maxSafe) {
      state.status = 'WON';
      guestMinesGames.delete(guestId);
      adjustGuestBalance(guestId, currentPayout);

      const balance = getGuestBalance(guestId)!;
      return res.json({
        isMine: false,
        revealedSafe: state.revealedSafe,
        minePositions: state.minePositions,
        multiplier,
        currentPayout,
        balance,
        status: 'WON',
      });
    }

    // Still playing — do NOT send minePositions
    return res.json({
      isMine: false,
      revealedSafe: state.revealedSafe,
      multiplier,
      currentPayout,
      status: 'PLAYING',
    });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    console.error('Guest mines reveal error:', err);
    return res.status(500).json({ error: 'Server-Fehler.' });
  }
});

router.post('/mines/cashout', (req: GuestRequest, res: Response) => {
  try {
    const guestId = req.guestId!;
    const state = guestMinesGames.get(guestId);

    if (!state || state.status !== 'PLAYING') {
      return res.status(400).json({ error: 'Kein aktives Spiel.' });
    }

    if (state.revealedSafe.length === 0) {
      return res.status(400).json({ error: 'Decke mindestens ein Feld auf, bevor du auszahlst.' });
    }

    const multiplier = calculateMultiplier(state.mineCount, state.revealedSafe.length);
    const payout = Math.floor(state.bet * multiplier);

    state.status = 'WON';
    guestMinesGames.delete(guestId);
    adjustGuestBalance(guestId, payout);

    const balance = getGuestBalance(guestId)!;
    return res.json({
      payout,
      balance,
      minePositions: state.minePositions,
      revealedSafe: state.revealedSafe,
      multiplier,
    });
  } catch (err) {
    console.error('Guest mines cashout error:', err);
    return res.status(500).json({ error: 'Server-Fehler.' });
  }
});

export default router;
