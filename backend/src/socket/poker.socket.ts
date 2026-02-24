import { Server, Socket } from 'socket.io';
import crypto from 'crypto';
import prisma from '../utils/prisma.util';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Hand } = require('pokersolver') as { Hand: any };

// ── Types ─────────────────────────────────────────────────────────────────────

type Suit = 'h' | 'd' | 'c' | 's';
type Card = { rank: number; suit: Suit }; // rank 2–14 (A = 14)
type GamePhase = 'WAITING' | 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN';

interface Seat {
  seatIndex: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  socketId: string;
  chips: number;
  holeCards: [Card, Card] | null;
  folded: boolean;
  allIn: boolean;
  currentBet: number;
  acted: boolean;
}

interface Table {
  seats: (Seat | null)[];
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
  soloMode: boolean;
}

interface QueueEntry {
  userId: string;
  username: string;
  socketId: string;
  avatarUrl: string | null;
  preferredSeat?: number;
}

// ── Singleton table ───────────────────────────────────────────────────────────

const table: Table = {
  seats: Array(10).fill(null),
  phase: 'WAITING',
  deck: [],
  communityCards: [],
  pot: 0,
  currentBet: 0,
  actionSeatIndex: -1,
  dealerIndex: -1,
  sbIndex: -1,
  bbIndex: -1,
  minRaise: 4,
  soloMode: false,
};

// Track watchers by userId for deduplication (multiple tabs = 1 avatar)
const tableWatchers = new Map<string, { socketIds: Set<string>; username: string; avatarUrl: string | null }>();

// Queue for when table is full
const tableQueue: QueueEntry[] = [];

let ioRef: Server;
let startHandTimer: ReturnType<typeof setTimeout> | null = null;

// ── Deck helpers ──────────────────────────────────────────────────────────────

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

// ── Seat helpers ──────────────────────────────────────────────────────────────

function activeSeats(): Seat[] {
  return table.seats.filter((s): s is Seat => !!s && !s.folded);
}

function actionableSeats(): Seat[] {
  return table.seats.filter((s): s is Seat => !!s && !s.folded && !s.allIn);
}

/** Next occupied seat index going clockwise from `from`, matching predicate. */
function nextFrom(from: number, pred: (s: Seat) => boolean): number {
  for (let i = 1; i <= 10; i++) {
    const idx = (from + i) % 10;
    const s = table.seats[idx];
    if (s && pred(s)) return idx;
  }
  return -1;
}

function bettingRoundComplete(): boolean {
  const acts = actionableSeats();
  if (acts.length === 0) return true;
  return acts.every((s) => s.acted && s.currentBet === table.currentBet);
}

// ── Queue helpers ─────────────────────────────────────────────────────────────

function removeFromQueue(userId: string) {
  const idx = tableQueue.findIndex((q) => q.userId === userId);
  if (idx !== -1) tableQueue.splice(idx, 1);
}

function removeFromQueueBySocket(socketId: string) {
  const idx = tableQueue.findIndex((q) => q.socketId === socketId);
  if (idx !== -1) tableQueue.splice(idx, 1);
}

function broadcastQueuePositions() {
  tableQueue.forEach((entry, i) => {
    ioRef.to(entry.socketId).emit('poker:queue_update', { position: i + 1, total: tableQueue.length });
  });
}

function dequeueNextPlayer(freedSeatIndex: number) {
  if (tableQueue.length === 0) return;
  const entry = tableQueue.shift()!;
  // Seat them
  table.seats[freedSeatIndex] = {
    seatIndex: freedSeatIndex,
    userId: entry.userId,
    username: entry.username,
    avatarUrl: entry.avatarUrl,
    socketId: entry.socketId,
    chips: 0, // will be filled from DB
    holeCards: null,
    folded: table.phase !== 'WAITING', // folded if mid-hand
    allIn: false,
    currentBet: 0,
    acted: false,
  };
  // Fetch balance async
  prisma.user.findUnique({ where: { id: entry.userId }, select: { balance: true } })
    .then((dbUser) => {
      const seat = table.seats[freedSeatIndex];
      if (seat && seat.userId === entry.userId) {
        seat.chips = dbUser?.balance ?? 0;
        broadcastState();
      }
    })
    .catch(console.error);
  // Remove from watchers
  removeWatcherSocketId(entry.userId, entry.socketId);
  // Notify the queued player they've been seated
  ioRef.to(entry.socketId).emit('poker:queue_seated', { seatIndex: freedSeatIndex });
  broadcastQueuePositions();
  broadcastState();
  tryScheduleStart();
}

// ── Watcher helpers (deduplicated by userId) ─────────────────────────────────

function addWatcher(userId: string, socketId: string, username: string, avatarUrl: string | null) {
  const existing = tableWatchers.get(userId);
  if (existing) {
    existing.socketIds.add(socketId);
  } else {
    tableWatchers.set(userId, { socketIds: new Set([socketId]), username, avatarUrl });
  }
}

function removeWatcherSocketId(userId: string, socketId: string) {
  const entry = tableWatchers.get(userId);
  if (!entry) return;
  entry.socketIds.delete(socketId);
  if (entry.socketIds.size === 0) {
    tableWatchers.delete(userId);
  }
}

// ── Broadcast ─────────────────────────────────────────────────────────────────

function publicState() {
  return {
    seats: table.seats.map((s) =>
      s
        ? {
            seatIndex: s.seatIndex,
            userId: s.userId,
            username: s.username,
            avatarUrl: s.avatarUrl,
            chips: s.chips,
            hasCards: !!s.holeCards,
            folded: s.folded,
            allIn: s.allIn,
            currentBet: s.currentBet,
          }
        : null
    ),
    watchers: Array.from(tableWatchers.entries()).map(([userId, w]) => ({
      userId,
      username: w.username,
      avatarUrl: w.avatarUrl,
    })),
    phase: table.phase,
    communityCards: table.communityCards,
    pot: table.pot,
    currentBet: table.currentBet,
    actionSeatIndex: table.actionSeatIndex,
    dealerIndex: table.dealerIndex,
    sbIndex: table.sbIndex,
    bbIndex: table.bbIndex,
    minRaise: table.minRaise,
    queueCount: tableQueue.length,
    soloMode: table.soloMode,
  };
}

function broadcastState() {
  const pub = publicState();
  ioRef.emit('poker:state', pub);
  // Send private hole cards to each seated player
  for (const seat of table.seats) {
    if (seat?.holeCards) {
      ioRef.to(seat.socketId).emit('poker:my_cards', seat.holeCards);
    }
  }
}

// ── Game logic ────────────────────────────────────────────────────────────────

function resetBettingRound(startFrom: number) {
  table.currentBet = 0;
  table.minRaise = 4;
  for (const seat of table.seats) {
    if (seat && !seat.folded) {
      seat.currentBet = 0;
      seat.acted = false;
    }
  }
  table.actionSeatIndex = nextFrom(startFrom, (s) => !s.folded && !s.allIn);
}

function resolveNoShowdown() {
  const winner = activeSeats()[0];
  if (!winner) { resetForNextHand(); return; }

  winner.chips += table.pot;
  if (table.pot > 0) {
    prisma.user.update({ where: { id: winner.userId }, data: { balance: winner.chips } }).catch(console.error);
    prisma.transaction.create({ data: { userId: winner.userId, amount: table.pot, type: 'GAME_WIN', game: 'poker' } }).catch(console.error);
  }

  ioRef.emit('poker:hand_result', {
    winners: [{ seatIndex: winner.seatIndex, username: winner.username }],
    allHoleCards: [],
    pot: table.pot,
    showdown: false,
  });

  setTimeout(resetForNextHand, 4000);
}

function resolveShowdown() {
  table.phase = 'SHOWDOWN';

  const active = activeSeats();
  if (active.length === 1) return resolveNoShowdown();

  const evaluated = active.map((seat) => {
    const allCards = [...seat.holeCards!, ...table.communityCards].map(toPS);
    const hand = Hand.solve(allCards);
    return { seat, hand };
  });

  const winnerHands = Hand.winners(evaluated.map((e: any) => e.hand));
  const winners = evaluated.filter((e: any) => winnerHands.includes(e.hand));
  const share = Math.floor(table.pot / winners.length);
  const remainder = table.pot - share * winners.length;

  winners.forEach((w: any, i: number) => {
    const payout = share + (i === 0 ? remainder : 0);
    w.seat.chips += payout;
    prisma.user.update({ where: { id: w.seat.userId }, data: { balance: w.seat.chips } }).catch(console.error);
    prisma.transaction.create({ data: { userId: w.seat.userId, amount: payout, type: 'GAME_WIN', game: 'poker' } }).catch(console.error);
  });

  ioRef.emit('poker:hand_result', {
    winners: winners.map((w: any) => ({
      seatIndex: w.seat.seatIndex,
      username: w.seat.username,
      handName: w.hand.name,
      holeCards: w.seat.holeCards,
    })),
    allHoleCards: active.map((s) => ({
      seatIndex: s.seatIndex,
      holeCards: s.holeCards,
    })),
    pot: table.pot,
    showdown: true,
  });

  broadcastState();
  setTimeout(resetForNextHand, 5000);
}

function advancePhase() {
  switch (table.phase) {
    case 'PREFLOP':
      table.phase = 'FLOP';
      table.communityCards = [table.deck.pop()!, table.deck.pop()!, table.deck.pop()!];
      break;
    case 'FLOP':
      table.phase = 'TURN';
      table.communityCards.push(table.deck.pop()!);
      break;
    case 'TURN':
      table.phase = 'RIVER';
      table.communityCards.push(table.deck.pop()!);
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

  resetBettingRound(table.dealerIndex);
  broadcastState();
}

function processAction(
  seatIndex: number,
  action: { type: 'fold' | 'check' | 'call' | 'raise'; amount?: number }
) {
  const seat = table.seats[seatIndex];
  if (!seat || seat.folded || seat.allIn) return;
  if (table.soloMode) return; // board auto-runs in solo mode
  if (table.actionSeatIndex !== seatIndex) return;
  if (table.phase === 'WAITING' || table.phase === 'SHOWDOWN') return;

  switch (action.type) {
    case 'fold':
      seat.folded = true;
      seat.acted = true;
      if (seat.currentBet > 0) {
        prisma.transaction.create({ data: { userId: seat.userId, amount: -seat.currentBet, type: 'GAME_BET', game: 'poker' } }).catch(console.error);
      }
      break;

    case 'check':
      if (table.currentBet !== seat.currentBet) return;
      seat.acted = true;
      break;

    case 'call': {
      const callAmt = Math.min(table.currentBet - seat.currentBet, seat.chips);
      seat.chips -= callAmt;
      seat.currentBet += callAmt;
      table.pot += callAmt;
      if (seat.chips === 0) seat.allIn = true;
      seat.acted = true;
      prisma.user.update({ where: { id: seat.userId }, data: { balance: seat.chips } }).catch(console.error);
      break;
    }

    case 'raise': {
      const totalBet = Math.min(
        Math.max(action.amount ?? table.minRaise, table.minRaise),
        seat.chips + seat.currentBet
      );
      const toPay = totalBet - seat.currentBet;
      if (toPay <= 0 || totalBet <= table.currentBet) return;
      seat.chips -= toPay;
      table.pot += toPay;
      table.minRaise = totalBet + (totalBet - table.currentBet);
      table.currentBet = totalBet;
      seat.currentBet = totalBet;
      if (seat.chips === 0) seat.allIn = true;
      seat.acted = true;
      for (const s of table.seats) {
        if (s && s !== seat && !s.folded && !s.allIn) s.acted = false;
      }
      prisma.user.update({ where: { id: seat.userId }, data: { balance: seat.chips } }).catch(console.error);
      break;
    }
  }

  const active = activeSeats();
  if (active.length === 1) return resolveNoShowdown();
  if (bettingRoundComplete()) return advancePhase();

  table.actionSeatIndex = nextFrom(seatIndex, (s) => !s.folded && !s.allIn);
  broadcastState();
}

function resetForNextHand() {
  table.soloMode = false;

  for (let i = 0; i < 10; i++) {
    const s = table.seats[i];
    if (s && s.chips <= 0) {
      table.seats[i] = null;
      // Try to dequeue someone into this freed seat
      dequeueNextPlayer(i);
    }
  }

  table.communityCards = [];
  table.pot = 0;
  table.currentBet = 0;
  table.actionSeatIndex = -1;
  table.minRaise = 4;
  table.sbIndex = -1;
  table.bbIndex = -1;
  table.phase = 'WAITING';

  broadcastState();
  const occupied = table.seats.filter(Boolean).length;
  if (occupied >= 1) tryScheduleStart();
}

function tryScheduleStart() {
  const occupied = table.seats.filter(Boolean).length;
  if (occupied === 0 || table.phase !== 'WAITING') return;
  if (startHandTimer) return;
  // Solo practice starts faster (1.5s), multiplayer waits 2.5s
  startHandTimer = setTimeout(startNewHand, occupied === 1 ? 1500 : 2500);
}

function startNewHand() {
  startHandTimer = null;

  const occupied = table.seats.filter((s): s is Seat => s !== null);
  if (occupied.length === 0) {
    table.phase = 'WAITING';
    broadcastState();
    return;
  }

  if (occupied.length === 1) {
    return startSoloHand(occupied[0]);
  }

  // ── Multi-player hand ─────────────────────────────────────────────────────
  table.soloMode = false;

  // Reset per-hand seat state — all seated players join the new hand
  for (const seat of table.seats) {
    if (seat) {
      seat.holeCards = null;
      seat.folded = false;
      seat.allIn = false;
      seat.currentBet = 0;
      seat.acted = false;
    }
  }

  table.deck = shuffle(makeDeck());
  table.communityCards = [];
  table.pot = 0;
  table.minRaise = 4;
  table.phase = 'PREFLOP';
  table.currentBet = 2; // BB

  let d = table.dealerIndex < 0 ? -1 : table.dealerIndex;
  d = nextFrom(d, () => true);
  table.dealerIndex = d;

  const sbIdx = nextFrom(table.dealerIndex, () => true);
  const bbIdx = nextFrom(sbIdx, () => true);
  table.sbIndex = sbIdx;
  table.bbIndex = bbIdx;

  const sb = table.seats[sbIdx]!;
  const bb = table.seats[bbIdx]!;

  const sbPost = Math.min(1, sb.chips);
  sb.chips -= sbPost;
  sb.currentBet = sbPost;
  table.pot += sbPost;
  if (sb.chips === 0) sb.allIn = true;

  const bbPost = Math.min(2, bb.chips);
  bb.chips -= bbPost;
  bb.currentBet = bbPost;
  table.pot += bbPost;
  if (bb.chips === 0) bb.allIn = true;

  for (const seat of table.seats) {
    if (seat) seat.holeCards = [table.deck.pop()!, table.deck.pop()!];
  }

  table.actionSeatIndex = nextFrom(bbIdx, (s) => !s.folded && !s.allIn);

  prisma.user.update({ where: { id: sb.userId }, data: { balance: sb.chips } }).catch(console.error);
  prisma.user.update({ where: { id: bb.userId }, data: { balance: bb.chips } }).catch(console.error);

  broadcastState();
}

// ── Solo practice mode ────────────────────────────────────────────────────────

function startSoloHand(seat: Seat) {
  table.soloMode = true;

  seat.holeCards = null;
  seat.folded = false;
  seat.allIn = false;
  seat.currentBet = 0;
  seat.acted = false;

  table.deck = shuffle(makeDeck());
  table.communityCards = [];
  table.pot = 0;
  table.currentBet = 0;
  table.minRaise = 4;
  table.phase = 'PREFLOP';
  table.dealerIndex = seat.seatIndex;
  table.sbIndex = seat.seatIndex;
  table.bbIndex = seat.seatIndex;
  table.actionSeatIndex = -1; // no player action needed — board auto-runs

  seat.holeCards = [table.deck.pop()!, table.deck.pop()!];

  broadcastState();
  setTimeout(soloAdvance, 2000);
}

function soloAdvance() {
  if (!table.soloMode) return; // cancelled (player left or 2nd player joined and hand ended)
  if (table.phase === 'WAITING') return;

  switch (table.phase) {
    case 'PREFLOP':
      table.phase = 'FLOP';
      table.communityCards = [table.deck.pop()!, table.deck.pop()!, table.deck.pop()!];
      break;
    case 'FLOP':
      table.phase = 'TURN';
      table.communityCards.push(table.deck.pop()!);
      break;
    case 'TURN':
      table.phase = 'RIVER';
      table.communityCards.push(table.deck.pop()!);
      break;
    case 'RIVER':
      return resolveSolo();
    default:
      return;
  }

  broadcastState();
  setTimeout(soloAdvance, 1500);
}

function resolveSolo() {
  const seat = table.seats.find((s): s is Seat => s !== null);
  if (!seat || !seat.holeCards) { resetForNextHand(); return; }

  const allCards = [...seat.holeCards, ...table.communityCards].map(toPS);
  const hand = Hand.solve(allCards);

  ioRef.emit('poker:hand_result', {
    winners: [{ seatIndex: seat.seatIndex, username: seat.username, handName: hand.name, holeCards: seat.holeCards }],
    allHoleCards: [{ seatIndex: seat.seatIndex, holeCards: seat.holeCards }],
    pot: 0,
    showdown: true,
    soloMode: true,
  });

  broadcastState();
  setTimeout(resetForNextHand, 4000);
}

// ── Shared seat logic ─────────────────────────────────────────────────────────

async function seatPlayer(
  socket: Socket,
  userId: string,
  username: string,
  seatIndex: number,
) {
  // Recover from stuck state: phase is active but all seats empty
  if (table.phase !== 'WAITING' && table.seats.every((s) => s === null)) {
    if (startHandTimer) { clearTimeout(startHandTimer); startHandTimer = null; }
    table.phase = 'WAITING';
    table.communityCards = [];
    table.pot = 0;
    table.currentBet = 0;
    table.actionSeatIndex = -1;
    table.sbIndex = -1;
    table.bbIndex = -1;
  }

  let dbUser: { balance: number; avatarUrl: string | null } | null = null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true, avatarUrl: true },
    });
  } catch (err) {
    console.error('[seatPlayer] DB error:', err);
    socket.emit('poker:error', 'Database error — try again');
    return;
  }
  if (!dbUser || dbUser.balance < 10) {
    socket.emit('poker:error', `Need at least 10 chips to sit down (you have ${dbUser?.balance ?? 0})`);
    return;
  }
  // Remove from watchers
  removeWatcherSocketId(userId, socket.id);
  const midHand = table.phase !== 'WAITING';
  table.seats[seatIndex] = {
    seatIndex,
    userId,
    username,
    avatarUrl: dbUser.avatarUrl,
    socketId: socket.id,
    chips: dbUser.balance,
    holeCards: null,
    folded: midHand, // folded if joining mid-hand
    allIn: false,
    currentBet: 0,
    acted: false,
  };
  broadcastState();
  tryScheduleStart();
}

// ── Register ──────────────────────────────────────────────────────────────────

export function registerPokerSocket(io: Server) {
  ioRef = io;

  io.on('connection', (socket: Socket) => {
    const userId: string = socket.data.userId;
    const username: string = socket.data.username;
    if (!userId) return;

    // Send current state immediately on connect
    socket.emit('poker:state', publicState());
    const existingSeat = table.seats.find((s) => s?.userId === userId);
    if (existingSeat?.holeCards) {
      socket.emit('poker:my_cards', existingSeat.holeCards);
    }
    // Send queue position if queued
    const qIdx = tableQueue.findIndex((q) => q.userId === userId);
    if (qIdx !== -1) {
      socket.emit('poker:queue_update', { position: qIdx + 1, total: tableQueue.length });
    }

    // ── Register as watcher ───────────────────────────────────────────────
    socket.on('poker:watch', async () => {
      if (table.seats.some((s) => s?.userId === userId)) return; // already seated
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { avatarUrl: true },
      });
      addWatcher(userId, socket.id, username, dbUser?.avatarUrl ?? null);
      broadcastState();
    });

    // ── Join as player (auto-selects first free seat) ─────────────────────
    socket.on('poker:join', async () => {
      if (table.seats.some((s) => s?.userId === userId)) return; // already seated
      const seatIndex = table.seats.findIndex((s) => s === null);
      if (seatIndex === -1) {
        // Table full — add to queue
        if (!tableQueue.some((q) => q.userId === userId)) {
          const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } });
          tableQueue.push({ userId, username, socketId: socket.id, avatarUrl: dbUser?.avatarUrl ?? null });
          broadcastQueuePositions();
          broadcastState();
        }
        return;
      }
      await seatPlayer(socket, userId, username, seatIndex);
    });

    // ── Sit at specific seat ──────────────────────────────────────────────
    socket.on('poker:sit', async ({ seatIndex }: { seatIndex: number }) => {
      if (seatIndex < 0 || seatIndex > 9) return;
      if (table.seats.some((s) => s?.userId === userId)) return; // already seated

      if (table.seats[seatIndex]) {
        // Seat taken — if table is full, add to queue
        if (!table.seats.some((s) => s === null)) {
          if (!tableQueue.some((q) => q.userId === userId)) {
            const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } });
            tableQueue.push({ userId, username, socketId: socket.id, avatarUrl: dbUser?.avatarUrl ?? null, preferredSeat: seatIndex });
            broadcastQueuePositions();
            broadcastState();
          }
        }
        return;
      }

      await seatPlayer(socket, userId, username, seatIndex);
    });

    // ── Leave queue ───────────────────────────────────────────────────────
    socket.on('poker:leave_queue', () => {
      removeFromQueue(userId);
      broadcastQueuePositions();
      broadcastState();
    });

    socket.on('poker:stand', () => {
      const idx = table.seats.findIndex((s) => s?.userId === userId);
      if (idx === -1) return;
      const seat = table.seats[idx]!;

      if (table.phase !== 'WAITING' && !seat.folded) {
        seat.folded = true;
        const active = activeSeats();
        if (active.length <= 1 && table.phase !== 'SHOWDOWN') resolveNoShowdown();
      }

      prisma.user.update({ where: { id: seat.userId }, data: { balance: seat.chips } }).catch(console.error);
      // Become a watcher again after standing
      addWatcher(userId, socket.id, username, seat.avatarUrl);
      table.seats[idx] = null;

      // Try to seat queued player
      dequeueNextPlayer(idx);

      // Cancel pending hand start if fewer than 2 players remain
      if (table.phase === 'WAITING' && table.seats.filter(Boolean).length < 2 && startHandTimer) {
        clearTimeout(startHandTimer);
        startHandTimer = null;
      }
      broadcastState();
    });

    socket.on('poker:action', (action: { type: 'fold' | 'check' | 'call' | 'raise'; amount?: number }) => {
      const idx = table.seats.findIndex((s) => s?.userId === userId);
      if (idx !== -1) processAction(idx, action);
    });

    socket.on('poker:emote', ({ emoji }: { emoji: string }) => {
      const idx = table.seats.findIndex((s) => s?.userId === userId);
      if (idx === -1) return;
      const allowed = ['😂', '😤', '🔥', '💀', '👏', '😎', '🤔', '💰'];
      if (!allowed.includes(emoji)) return;
      io.emit('poker:emote_broadcast', { seatIndex: idx, emoji });
    });

    socket.on('poker:message', ({ text }: { text: string }) => {
      const idx = table.seats.findIndex((s) => s?.userId === userId);
      if (idx === -1) return;
      const trimmed = String(text ?? '').trim().slice(0, 50);
      if (!trimmed) return;
      io.emit('poker:message_broadcast', { seatIndex: idx, text: trimmed });
    });

    socket.on('disconnect', () => {
      // Remove from watchers (by socketId under this userId)
      removeWatcherSocketId(userId, socket.id);
      // Remove from queue
      removeFromQueueBySocket(socket.id);

      const idx = table.seats.findIndex((s) => s?.socketId === socket.id);
      if (idx === -1) {
        broadcastState(); // watcher left — update watcher list
        broadcastQueuePositions();
        return;
      }
      const seat = table.seats[idx]!;

      if (table.phase !== 'WAITING' && !seat.folded) {
        seat.folded = true;
        const active = activeSeats();
        if (active.length <= 1 && table.phase !== 'SHOWDOWN') resolveNoShowdown();
      }

      prisma.user.update({ where: { id: seat.userId }, data: { balance: seat.chips } }).catch(console.error);
      table.seats[idx] = null;

      // Try to seat queued player
      dequeueNextPlayer(idx);

      // Cancel pending hand start if fewer than 2 players remain
      if (table.phase === 'WAITING' && table.seats.filter(Boolean).length < 2 && startHandTimer) {
        clearTimeout(startHandTimer);
        startHandTimer = null;
      }
      broadcastState();
    });
  });
}

export { publicState as pokerPublicState };
