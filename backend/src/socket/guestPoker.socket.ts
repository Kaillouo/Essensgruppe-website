// Guest Poker — separate table for non-logged-in visitors.
// Uses in-memory guestState for balance (no DB writes).
// Guests are identified by UUID guestId, displayed as "Gast XXXX".
// AFK kick: 60s inactivity → auto-fold + stand.

import { Namespace, Socket } from 'socket.io';
import crypto from 'crypto';
import { getOrCreateGuest, adjustGuestBalance, getGuestBalance } from '../state/guestState';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Hand } = require('pokersolver') as { Hand: any };

// ── Types ─────────────────────────────────────────────────────────────────────

type Suit = 'h' | 'd' | 'c' | 's';
type Card = { rank: number; suit: Suit };
type GamePhase = 'WAITING' | 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN';

const MAX_SEATS = 6;
const SMALL_BLIND = 1;
const BIG_BLIND = 2;
const MIN_CHIPS_TO_SIT = 10;
const AFK_MS = 60_000; // 60 seconds

interface GuestSeat {
  seatIndex: number;
  guestId: string;
  guestName: string;
  socketId: string;
  chips: number;
  holeCards: [Card, Card] | null;
  folded: boolean;
  allIn: boolean;
  currentBet: number;
  acted: boolean;
  investedThisHand: number;
  lastActionAt: number;
}

interface GuestTable {
  seats: (GuestSeat | null)[];
  phase: GamePhase;
  deck: Card[];
  communityCards: Card[];
  pot: number;
  currentBet: number;
  actionSeatIndex: number;
  dealerIndex: number;
  sbIndex: number;
  bbIndex: number;
  minRaise: number;
}

interface GuestQueueEntry {
  guestId: string;
  guestName: string;
  socketId: string;
}

// ── State ─────────────────────────────────────────────────────────────────────

const guestTable: GuestTable = {
  seats: Array(MAX_SEATS).fill(null),
  phase: 'WAITING',
  deck: [],
  communityCards: [],
  pot: 0,
  currentBet: 0,
  actionSeatIndex: -1,
  dealerIndex: -1,
  sbIndex: -1,
  bbIndex: -1,
  minRaise: BIG_BLIND * 2,
};

const guestQueue: GuestQueueEntry[] = [];

let nsRef: Namespace;
let startHandTimer: ReturnType<typeof setTimeout> | null = null;
let afkInterval: ReturnType<typeof setInterval> | null = null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function guestName(guestId: string): string {
  return `Gast #${guestId.slice(-4).toUpperCase()}`;
}

function makeDeck(): Card[] {
  const suits: Suit[] = ['h', 'd', 'c', 's'];
  return suits.flatMap((suit) =>
    Array.from({ length: 13 }, (_, i) => ({ rank: i + 2, suit }))
  );
}

function shuffle(deck: Card[]): Card[] {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function toPS(card: Card): string {
  const r =
    card.rank === 14 ? 'A' :
    card.rank === 13 ? 'K' :
    card.rank === 12 ? 'Q' :
    card.rank === 11 ? 'J' :
    card.rank === 10 ? 'T' :
    String(card.rank);
  return r + card.suit;
}

function activeSeats(): GuestSeat[] {
  return guestTable.seats.filter((s): s is GuestSeat => !!s && !s.folded);
}

function actionableSeats(): GuestSeat[] {
  return guestTable.seats.filter((s): s is GuestSeat => !!s && !s.folded && !s.allIn);
}

function nextFrom(from: number, pred: (s: GuestSeat) => boolean): number {
  for (let i = 1; i <= MAX_SEATS; i++) {
    const idx = (from + i) % MAX_SEATS;
    const s = guestTable.seats[idx];
    if (s && pred(s)) return idx;
  }
  return -1;
}

function bettingRoundComplete(): boolean {
  const acts = actionableSeats();
  if (acts.length === 0) return true;
  return acts.every((s) => s.acted && s.currentBet === guestTable.currentBet);
}

// ── Queue ──────────────────────────────────────────────────────────────────────

function removeFromQueueById(guestId: string) {
  const idx = guestQueue.findIndex((q) => q.guestId === guestId);
  if (idx !== -1) guestQueue.splice(idx, 1);
}

function removeFromQueueBySocket(socketId: string) {
  const idx = guestQueue.findIndex((q) => q.socketId === socketId);
  if (idx !== -1) guestQueue.splice(idx, 1);
}

function broadcastQueuePositions() {
  guestQueue.forEach((entry, i) => {
    nsRef.to(entry.socketId).emit('guest_poker:queue_update', { position: i + 1, total: guestQueue.length });
  });
}

function dequeueNextPlayer(freedSeat: number) {
  if (guestQueue.length === 0) return;
  const entry = guestQueue.shift()!;
  const session = getOrCreateGuest(entry.guestId);
  guestTable.seats[freedSeat] = {
    seatIndex: freedSeat,
    guestId: entry.guestId,
    guestName: entry.guestName,
    socketId: entry.socketId,
    chips: session.balance,
    holeCards: null,
    folded: guestTable.phase !== 'WAITING',
    allIn: false,
    currentBet: 0,
    acted: false,
    investedThisHand: 0,
    lastActionAt: Date.now(),
  };
  // Deduct from guest balance (chips now on table)
  adjustGuestBalance(entry.guestId, -session.balance);
  nsRef.to(entry.socketId).emit('guest_poker:queue_seated', { seatIndex: freedSeat });
  broadcastQueuePositions();
  broadcastState();
  tryScheduleStart();
}

// ── Broadcast ─────────────────────────────────────────────────────────────────

function publicState() {
  return {
    seats: guestTable.seats.map((s) =>
      s ? {
        seatIndex: s.seatIndex,
        guestId: s.guestId,
        guestName: s.guestName,
        chips: s.chips,
        hasCards: !!s.holeCards,
        folded: s.folded,
        allIn: s.allIn,
        currentBet: s.currentBet,
      } : null
    ),
    phase: guestTable.phase,
    communityCards: guestTable.communityCards,
    pot: guestTable.pot,
    currentBet: guestTable.currentBet,
    actionSeatIndex: guestTable.actionSeatIndex,
    dealerIndex: guestTable.dealerIndex,
    sbIndex: guestTable.sbIndex,
    bbIndex: guestTable.bbIndex,
    minRaise: guestTable.minRaise,
    queueCount: guestQueue.length,
  };
}

function broadcastState() {
  const pub = publicState();
  nsRef.emit('guest_poker:state', pub);
  // Send hole cards to each seated player
  for (const seat of guestTable.seats) {
    if (seat?.holeCards) {
      nsRef.to(seat.socketId).emit('guest_poker:my_cards', seat.holeCards);
    }
  }
}

// ── AFK detection ─────────────────────────────────────────────────────────────

function startAfkInterval() {
  if (afkInterval) return;
  afkInterval = setInterval(() => {
    const now = Date.now();
    for (let i = 0; i < MAX_SEATS; i++) {
      const seat = guestTable.seats[i];
      if (!seat) continue;
      if (now - seat.lastActionAt > AFK_MS) {
        // AFK kick: fold if active, then stand
        nsRef.to(seat.socketId).emit('guest_poker:afk_kick', {
          message: 'Du wurdest wegen Inaktivität vom Tisch entfernt.',
        });
        standSeat(i, 'afk');
      }
    }
  }, 5000);
}

function stopAfkIntervalIfEmpty() {
  if (guestTable.seats.every((s) => !s)) {
    if (afkInterval) { clearInterval(afkInterval); afkInterval = null; }
  }
}

// ── Game logic ────────────────────────────────────────────────────────────────

function resetBettingRound(startFrom: number) {
  guestTable.currentBet = 0;
  guestTable.minRaise = BIG_BLIND * 2;
  for (const seat of guestTable.seats) {
    if (seat && !seat.folded) {
      seat.currentBet = 0;
      seat.acted = false;
    }
  }
  guestTable.actionSeatIndex = nextFrom(startFrom, (s) => !s.folded && !s.allIn);
}

function returnChipsToGuest(seat: GuestSeat) {
  if (seat.chips > 0) {
    const bal = getGuestBalance(seat.guestId);
    if (bal !== null) {
      adjustGuestBalance(seat.guestId, seat.chips);
    } else {
      // Session expired — re-create with their remaining chips
      const session = getOrCreateGuest(seat.guestId);
      session.balance += seat.chips;
    }
  }
}

function resolveNoShowdown() {
  const winner = activeSeats()[0];
  if (!winner) { resetForNextHand(); return; }

  winner.chips += guestTable.pot;

  nsRef.emit('guest_poker:hand_result', {
    winners: [{ seatIndex: winner.seatIndex, guestName: winner.guestName }],
    allHoleCards: [],
    pot: guestTable.pot,
    showdown: false,
  });

  setTimeout(resetForNextHand, 3500);
}

function resolveShowdown() {
  guestTable.phase = 'SHOWDOWN';
  const active = activeSeats();
  if (active.length === 1) return resolveNoShowdown();

  const evaluated = active.map((seat) => {
    const allCards = [...seat.holeCards!, ...guestTable.communityCards].map(toPS);
    const hand = Hand.solve(allCards);
    return { seat, hand };
  });

  const winnerHands = Hand.winners(evaluated.map((e: any) => e.hand));
  const winners = evaluated.filter((e: any) => winnerHands.includes(e.hand));
  const share = Math.floor(guestTable.pot / winners.length);
  const remainder = guestTable.pot - share * winners.length;

  winners.forEach((w: any, i: number) => {
    const payout = share + (i === 0 ? remainder : 0);
    w.seat.chips += payout;
  });

  nsRef.emit('guest_poker:hand_result', {
    winners: winners.map((w: any) => ({
      seatIndex: w.seat.seatIndex,
      guestName: w.seat.guestName,
      handName: w.hand.name,
      holeCards: w.seat.holeCards,
    })),
    allHoleCards: active.map((s) => ({
      seatIndex: s.seatIndex,
      holeCards: s.holeCards,
    })),
    pot: guestTable.pot,
    showdown: true,
  });

  broadcastState();
  setTimeout(resetForNextHand, 4500);
}

function advancePhase() {
  switch (guestTable.phase) {
    case 'PREFLOP':
      guestTable.phase = 'FLOP';
      guestTable.communityCards = [guestTable.deck.pop()!, guestTable.deck.pop()!, guestTable.deck.pop()!];
      break;
    case 'FLOP':
      guestTable.phase = 'TURN';
      guestTable.communityCards.push(guestTable.deck.pop()!);
      break;
    case 'TURN':
      guestTable.phase = 'RIVER';
      guestTable.communityCards.push(guestTable.deck.pop()!);
      break;
    case 'RIVER':
      return resolveShowdown();
    default:
      return;
  }

  if (actionableSeats().length <= 1) {
    broadcastState();
    setTimeout(advancePhase, 1200);
    return;
  }

  resetBettingRound(guestTable.dealerIndex);
  broadcastState();
}

function processAction(
  seatIndex: number,
  action: { type: 'fold' | 'check' | 'call' | 'raise'; amount?: number }
) {
  const seat = guestTable.seats[seatIndex];
  if (!seat || seat.folded || seat.allIn) return;
  if (guestTable.actionSeatIndex !== seatIndex) return;
  if (guestTable.phase === 'WAITING' || guestTable.phase === 'SHOWDOWN') return;

  seat.lastActionAt = Date.now();

  switch (action.type) {
    case 'fold':
      seat.folded = true;
      seat.acted = true;
      break;

    case 'check':
      if (guestTable.currentBet !== seat.currentBet) return;
      seat.acted = true;
      break;

    case 'call': {
      const callAmt = Math.min(guestTable.currentBet - seat.currentBet, seat.chips);
      seat.chips -= callAmt;
      seat.currentBet += callAmt;
      seat.investedThisHand += callAmt;
      guestTable.pot += callAmt;
      if (seat.chips === 0) seat.allIn = true;
      seat.acted = true;
      break;
    }

    case 'raise': {
      const totalBet = Math.min(
        Math.max(action.amount ?? guestTable.minRaise, guestTable.minRaise),
        seat.chips + seat.currentBet
      );
      const toPay = totalBet - seat.currentBet;
      if (toPay <= 0 || totalBet <= guestTable.currentBet) return;
      seat.chips -= toPay;
      seat.investedThisHand += toPay;
      guestTable.pot += toPay;
      guestTable.minRaise = totalBet + (totalBet - guestTable.currentBet);
      guestTable.currentBet = totalBet;
      seat.currentBet = totalBet;
      if (seat.chips === 0) seat.allIn = true;
      seat.acted = true;
      for (const s of guestTable.seats) {
        if (s && s !== seat && !s.folded && !s.allIn) s.acted = false;
      }
      break;
    }
  }

  const active = activeSeats();
  if (active.length === 1) return resolveNoShowdown();
  if (bettingRoundComplete()) return advancePhase();

  guestTable.actionSeatIndex = nextFrom(seatIndex, (s) => !s.folded && !s.allIn);
  broadcastState();
}

function resetForNextHand() {
  for (let i = 0; i < MAX_SEATS; i++) {
    const s = guestTable.seats[i];
    if (s && s.chips <= 0) {
      // Return 0 chips (already broke) and remove
      guestTable.seats[i] = null;
      nsRef.to(s.socketId).emit('guest_poker:out_of_chips', {
        message: 'Dein Guthaben ist aufgebraucht. Du wurdest vom Tisch entfernt.',
      });
      dequeueNextPlayer(i);
    }
  }

  guestTable.communityCards = [];
  guestTable.pot = 0;
  guestTable.currentBet = 0;
  guestTable.actionSeatIndex = -1;
  guestTable.minRaise = BIG_BLIND * 2;
  guestTable.sbIndex = -1;
  guestTable.bbIndex = -1;
  guestTable.phase = 'WAITING';

  broadcastState();
  stopAfkIntervalIfEmpty();
  const occupied = guestTable.seats.filter(Boolean).length;
  if (occupied >= 2) tryScheduleStart();
}

function tryScheduleStart() {
  const occupied = guestTable.seats.filter(Boolean).length;
  if (occupied < 2 || guestTable.phase !== 'WAITING') return;
  if (startHandTimer) return;
  startHandTimer = setTimeout(startNewHand, 2500);
}

function startNewHand() {
  startHandTimer = null;

  const occupied = guestTable.seats.filter((s): s is GuestSeat => s !== null);
  if (occupied.length < 2) {
    guestTable.phase = 'WAITING';
    broadcastState();
    return;
  }

  for (const seat of guestTable.seats) {
    if (seat) {
      seat.holeCards = null;
      seat.folded = false;
      seat.allIn = false;
      seat.currentBet = 0;
      seat.acted = false;
      seat.investedThisHand = 0;
    }
  }

  guestTable.deck = shuffle(makeDeck());
  guestTable.communityCards = [];
  guestTable.pot = 0;
  guestTable.minRaise = BIG_BLIND * 2;
  guestTable.phase = 'PREFLOP';
  guestTable.currentBet = BIG_BLIND;

  let d = guestTable.dealerIndex < 0 ? -1 : guestTable.dealerIndex;
  d = nextFrom(d, () => true);
  guestTable.dealerIndex = d;

  const sbIdx = nextFrom(guestTable.dealerIndex, () => true);
  const bbIdx = nextFrom(sbIdx, () => true);
  guestTable.sbIndex = sbIdx;
  guestTable.bbIndex = bbIdx;

  const sb = guestTable.seats[sbIdx]!;
  const bb = guestTable.seats[bbIdx]!;

  const sbPost = Math.min(SMALL_BLIND, sb.chips);
  sb.chips -= sbPost;
  sb.currentBet = sbPost;
  sb.investedThisHand += sbPost;
  guestTable.pot += sbPost;
  if (sb.chips === 0) sb.allIn = true;

  const bbPost = Math.min(BIG_BLIND, bb.chips);
  bb.chips -= bbPost;
  bb.currentBet = bbPost;
  bb.investedThisHand += bbPost;
  guestTable.pot += bbPost;
  if (bb.chips === 0) bb.allIn = true;

  for (const seat of guestTable.seats) {
    if (seat) seat.holeCards = [guestTable.deck.pop()!, guestTable.deck.pop()!];
  }

  guestTable.actionSeatIndex = nextFrom(bbIdx, (s) => !s.folded && !s.allIn);
  broadcastState();
}

// ── Stand helper (shared by user-initiated + AFK) ─────────────────────────────

function standSeat(seatIndex: number, reason: 'user' | 'afk' | 'disconnect') {
  const seat = guestTable.seats[seatIndex];
  if (!seat) return;

  if (guestTable.phase !== 'WAITING' && !seat.folded) {
    seat.folded = true;
    const active = activeSeats();
    if (active.length <= 1 && guestTable.phase !== 'SHOWDOWN') resolveNoShowdown();
  }

  // Return chips to guest session
  returnChipsToGuest(seat);
  guestTable.seats[seatIndex] = null;

  dequeueNextPlayer(seatIndex);

  if (guestTable.phase === 'WAITING' && guestTable.seats.filter(Boolean).length < 2 && startHandTimer) {
    clearTimeout(startHandTimer);
    startHandTimer = null;
  }

  broadcastState();
  stopAfkIntervalIfEmpty();

  if (reason === 'afk') {
    // Notify the client they were kicked
    nsRef.to(seat.socketId).emit('guest_poker:state', publicState());
  }
}

// ── Register ──────────────────────────────────────────────────────────────────

export function registerGuestPokerSocket(ns: Namespace) {
  nsRef = ns;

  ns.on('connection', (socket: Socket) => {
    const guestId: string = socket.data.guestId;
    if (!guestId) return;

    const name = guestName(guestId);

    // Send current state on connect
    socket.emit('guest_poker:state', publicState());

    // If already seated (reconnect), resend hole cards
    const existingSeat = guestTable.seats.find((s) => s?.guestId === guestId);
    if (existingSeat) {
      existingSeat.socketId = socket.id; // update socket reference
      if (existingSeat.holeCards) socket.emit('guest_poker:my_cards', existingSeat.holeCards);
    }

    // Queue position
    const qIdx = guestQueue.findIndex((q) => q.guestId === guestId);
    if (qIdx !== -1) {
      socket.emit('guest_poker:queue_update', { position: qIdx + 1, total: guestQueue.length });
    }

    // ── Join table ──────────────────────────────────────────────────────────
    socket.on('guest_poker:join', () => {
      if (guestTable.seats.some((s) => s?.guestId === guestId)) return; // already seated
      if (guestQueue.some((q) => q.guestId === guestId)) return; // already queued

      const session = getOrCreateGuest(guestId);
      if (session.balance < MIN_CHIPS_TO_SIT) {
        socket.emit('guest_poker:error', `Mindestens ${MIN_CHIPS_TO_SIT} Sitzungsguthaben benötigt.`);
        return;
      }

      const seatIndex = guestTable.seats.findIndex((s) => s === null);
      if (seatIndex === -1) {
        // Table full — queue
        guestQueue.push({ guestId, guestName: name, socketId: socket.id });
        broadcastQueuePositions();
        broadcastState();
        return;
      }

      // Take chips from guest session onto table
      const chips = session.balance;
      adjustGuestBalance(guestId, -chips);

      guestTable.seats[seatIndex] = {
        seatIndex,
        guestId,
        guestName: name,
        socketId: socket.id,
        chips,
        holeCards: null,
        folded: guestTable.phase !== 'WAITING',
        allIn: false,
        currentBet: 0,
        acted: false,
        investedThisHand: 0,
        lastActionAt: Date.now(),
      };

      broadcastState();
      startAfkInterval();
      tryScheduleStart();
    });

    // ── Sit at specific seat ────────────────────────────────────────────────
    socket.on('guest_poker:sit', ({ seatIndex }: { seatIndex: number }) => {
      if (seatIndex < 0 || seatIndex >= MAX_SEATS) return;
      if (guestTable.seats.some((s) => s?.guestId === guestId)) return;
      if (guestTable.seats[seatIndex] !== null) {
        // Seat taken — queue instead
        if (!guestQueue.some((q) => q.guestId === guestId)) {
          guestQueue.push({ guestId, guestName: name, socketId: socket.id });
          broadcastQueuePositions();
        }
        return;
      }

      const session = getOrCreateGuest(guestId);
      if (session.balance < MIN_CHIPS_TO_SIT) {
        socket.emit('guest_poker:error', `Mindestens ${MIN_CHIPS_TO_SIT} Sitzungsguthaben benötigt.`);
        return;
      }

      const chips = session.balance;
      adjustGuestBalance(guestId, -chips);

      guestTable.seats[seatIndex] = {
        seatIndex,
        guestId,
        guestName: name,
        socketId: socket.id,
        chips,
        holeCards: null,
        folded: guestTable.phase !== 'WAITING',
        allIn: false,
        currentBet: 0,
        acted: false,
        investedThisHand: 0,
        lastActionAt: Date.now(),
      };

      broadcastState();
      startAfkInterval();
      tryScheduleStart();
    });

    // ── Leave queue ─────────────────────────────────────────────────────────
    socket.on('guest_poker:leave_queue', () => {
      removeFromQueueById(guestId);
      broadcastQueuePositions();
      broadcastState();
    });

    // ── Stand ───────────────────────────────────────────────────────────────
    socket.on('guest_poker:stand', () => {
      const idx = guestTable.seats.findIndex((s) => s?.guestId === guestId);
      if (idx === -1) return;
      standSeat(idx, 'user');
    });

    // ── Action ──────────────────────────────────────────────────────────────
    socket.on('guest_poker:action', (action: { type: 'fold' | 'check' | 'call' | 'raise'; amount?: number }) => {
      const idx = guestTable.seats.findIndex((s) => s?.guestId === guestId);
      if (idx !== -1) processAction(idx, action);
    });

    // ── Emote ───────────────────────────────────────────────────────────────
    socket.on('guest_poker:emote', ({ emoji }: { emoji: string }) => {
      const idx = guestTable.seats.findIndex((s) => s?.guestId === guestId);
      if (idx === -1) return;
      const allowed = ['😂', '😤', '🔥', '💀', '👏', '😎', '🤔', '💰'];
      if (!allowed.includes(emoji)) return;
      ns.emit('guest_poker:emote_broadcast', { seatIndex: idx, emoji });
    });

    // ── Disconnect ──────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      removeFromQueueBySocket(socket.id);
      broadcastQueuePositions();

      const idx = guestTable.seats.findIndex((s) => s?.socketId === socket.id);
      if (idx === -1) {
        broadcastState();
        return;
      }
      standSeat(idx, 'disconnect');
    });
  });
}
