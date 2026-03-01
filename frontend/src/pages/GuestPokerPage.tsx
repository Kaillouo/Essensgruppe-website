import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import { useGuest } from '../contexts/GuestContext';

// ── Types ─────────────────────────────────────────────────────────────────────

type Suit = 'h' | 'd' | 'c' | 's';
type Card = { rank: number; suit: Suit };
type GamePhase = 'WAITING' | 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN';

interface GuestPublicSeat {
  seatIndex: number;
  guestId: string;
  guestName: string;
  chips: number;
  hasCards: boolean;
  folded: boolean;
  allIn: boolean;
  currentBet: number;
}

interface GuestTableState {
  seats: (GuestPublicSeat | null)[];
  phase: GamePhase;
  communityCards: Card[];
  pot: number;
  currentBet: number;
  actionSeatIndex: number;
  dealerIndex: number;
  sbIndex: number;
  bbIndex: number;
  minRaise: number;
  queueCount: number;
}

interface HandResult {
  winners: { seatIndex: number; guestName: string; handName?: string; holeCards?: Card[] }[];
  allHoleCards: { seatIndex: number; holeCards: [Card, Card] }[];
  pot: number;
  showdown: boolean;
  // derived on client
  myWin?: boolean;
}

interface EmoteBubble { seatIndex: number; emoji: string; id: number; }

// ── Card rendering ────────────────────────────────────────────────────────────

const SUIT_SYM: Record<Suit, string> = { h: '♥', d: '♦', c: '♣', s: '♠' };
const SUIT_RED: Record<Suit, boolean> = { h: true, d: true, c: false, s: false };

function rankStr(r: number) {
  return r === 14 ? 'A' : r === 13 ? 'K' : r === 12 ? 'Q' : r === 11 ? 'J' : String(r);
}

function PlayingCard({ card, small = false, glow = false }: { card: Card; small?: boolean; glow?: boolean }) {
  const sym = SUIT_SYM[card.suit];
  const red = SUIT_RED[card.suit];
  const rank = rankStr(card.rank);
  const w = small ? 'w-8' : 'w-11';
  const h = small ? 'h-11' : 'h-16';
  const topFont = small ? 'text-[9px]' : 'text-[11px]';
  const midFont = small ? 'text-base' : 'text-xl';
  return (
    <div
      className={`${w} ${h} rounded-[5px] bg-white border border-gray-100 relative overflow-hidden flex flex-col justify-between p-[3px]`}
      style={{ boxShadow: glow ? '0 0 12px rgba(250,204,21,0.3),0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.4)' }}
    >
      <div className={`${topFont} font-black leading-none ${red ? 'text-red-600' : 'text-gray-900'}`}>{rank}<br />{sym}</div>
      <div className={`absolute inset-0 flex items-center justify-center ${midFont} font-black ${red ? 'text-red-200' : 'text-gray-200'}`}>{sym}</div>
      <div className={`${topFont} font-black leading-none rotate-180 self-end ${red ? 'text-red-600' : 'text-gray-900'}`}>{rank}<br />{sym}</div>
    </div>
  );
}

function CardBack({ small = false }: { small?: boolean }) {
  return (
    <div
      className={`${small ? 'w-8 h-11' : 'w-11 h-16'} rounded-[5px] border border-white/10 flex items-center justify-center overflow-hidden`}
      style={{ background: 'linear-gradient(145deg,#1a237e 0%,#283593 50%,#1a237e 100%)', boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }}
    >
      <div className="w-[76%] h-[76%] border border-blue-400/30 rounded-[3px]"
        style={{ background: 'repeating-linear-gradient(45deg,transparent,transparent 2px,rgba(255,255,255,0.04) 2px,rgba(255,255,255,0.04) 4px)' }}
      />
    </div>
  );
}

// ── Pot display ───────────────────────────────────────────────────────────────

function PotDisplay({ pot }: { pot: number }) {
  const big = pot >= 500;
  const huge = pot >= 2000;
  const textColor = huge ? '#f87171' : big ? '#fb923c' : '#fde047';
  const glowColor = huge ? 'rgba(239,68,68,0.5)' : big ? 'rgba(251,146,60,0.4)' : 'rgba(250,204,21,0.3)';
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
      style={{ background: 'rgba(0,0,0,0.5)', border: `1px solid ${glowColor}`, boxShadow: `0 0 16px ${glowColor}` }}
    >
      <span className="font-black tabular-nums tracking-tight" style={{ color: textColor, fontSize: huge ? 16 : big ? 14 : 13 }}>
        {pot.toLocaleString()}
      </span>
      <span className="text-white/30 text-[9px] font-medium uppercase tracking-widest">Pot</span>
    </div>
  );
}

// ── Seat positions (6 seats around oval) ─────────────────────────────────────

const SEAT_POS = [
  { left: '50%',  top: '10%'  }, // 0 — top center
  { left: '83%',  top: '30%'  }, // 1 — right top
  { left: '83%',  top: '68%'  }, // 2 — right bottom
  { left: '50%',  top: '88%'  }, // 3 — bottom center
  { left: '17%',  top: '68%'  }, // 4 — left bottom
  { left: '17%',  top: '30%'  }, // 5 — left top
];

// ── Seat component ────────────────────────────────────────────────────────────

function GuestSeatComponent({
  seat, seatIndex, isLocal, isActive, isDealer, isSB, isBB,
  myCards, revealedCards, emote,
  onSit, canSit,
  handResult,
}: {
  seat: GuestPublicSeat | null;
  seatIndex: number;
  isLocal: boolean;
  isActive: boolean;
  isDealer: boolean;
  isSB: boolean;
  isBB: boolean;
  myCards: [Card, Card] | null;
  revealedCards: [Card, Card] | null;
  emote?: EmoteBubble;
  onSit: (i: number) => void;
  canSit: boolean;
  handResult?: HandResult | null;
}) {
  const isBottom = seatIndex >= 2 && seatIndex <= 4;
  const holeCards = isLocal ? myCards : (revealedCards ?? null);

  if (!seat) {
    return (
      <div className="flex flex-col items-center gap-1">
        {canSit ? (
          <motion.button
            onClick={() => onSit(seatIndex)}
            animate={{ boxShadow: ['0 0 0 0 rgba(74,222,128,0)', '0 0 16px 6px rgba(74,222,128,0.2)', '0 0 0 0 rgba(74,222,128,0)'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-[50px] h-[50px] rounded-full border border-green-400/30 hover:border-green-400/70 transition-all flex items-center justify-center backdrop-blur-sm group"
            style={{ background: 'radial-gradient(circle, rgba(74,222,128,0.08) 0%, rgba(74,222,128,0.02) 70%)' }}
          >
            <span className="text-green-400/50 group-hover:text-green-300 text-[9px] font-bold tracking-wider uppercase transition-colors">Setzen</span>
          </motion.button>
        ) : (
          <div className="w-[50px] h-[50px] rounded-full border border-white/[0.06]"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.02) 0%, transparent 70%)' }} />
        )}
      </div>
    );
  }

  const initials = seat.guestName.replace('Gast #', '').slice(0, 2);
  const avatarColors = ['from-violet-600 to-purple-700', 'from-sky-600 to-blue-700', 'from-emerald-600 to-green-700',
    'from-rose-600 to-red-700', 'from-amber-600 to-orange-700', 'from-teal-600 to-cyan-700'];
  const colorClass = avatarColors[seatIndex % avatarColors.length];

  return (
    <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
      className="relative flex flex-col items-center gap-1 select-none"
    >
      {/* Emote */}
      <AnimatePresence>
        {emote && (
          <motion.div key={emote.id} initial={{ opacity: 1, y: 0, scale: 1 }} animate={{ opacity: 0, y: -40, scale: 1.4 }}
            transition={{ duration: 2, ease: 'easeOut' }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 text-2xl pointer-events-none z-50"
          >
            {emote.emoji}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cards */}
      {seat.hasCards && (
        <div className={`flex gap-0.5 ${isBottom ? 'order-first mb-0.5' : 'order-last mt-0.5'}`}>
          {holeCards ? (
            <>
              <motion.div initial={{ x: 30, opacity: 0, scale: 0.5 }} animate={{ x: 0, opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
                <PlayingCard card={holeCards[0]} small />
              </motion.div>
              <motion.div initial={{ x: 30, opacity: 0, scale: 0.5 }} animate={{ x: 0, opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: 0.1 }}>
                <PlayingCard card={holeCards[1]} small />
              </motion.div>
            </>
          ) : !seat.folded && (
            <>
              <motion.div initial={{ x: 30, opacity: 0, scale: 0.5 }} animate={{ x: 0, opacity: 1, scale: 1 }} transition={{ duration: 0.45 }}>
                <CardBack small />
              </motion.div>
              <motion.div initial={{ x: 30, opacity: 0, scale: 0.5 }} animate={{ x: 0, opacity: 1, scale: 1 }} transition={{ duration: 0.45, delay: 0.12 }}>
                <CardBack small />
              </motion.div>
            </>
          )}
        </div>
      )}

      {/* Avatar */}
      <div className="relative">
        <div className={`w-[54px] h-[54px] rounded-full overflow-hidden border-[3px] transition-all bg-gradient-to-br ${colorClass} flex items-center justify-center ${
          seat.folded ? 'opacity-40 grayscale border-gray-600' : isActive ? 'border-yellow-400' : isLocal ? 'border-blue-400' : 'border-white/30'
        }`}
          style={{ boxShadow: isActive && !seat.folded ? '0 0 18px rgba(250,204,21,0.55),0 0 40px rgba(250,204,21,0.15)' : '0 4px 20px rgba(0,0,0,0.5)' }}
        >
          <span className="text-white text-sm font-black">{initials}</span>
        </div>

        {isDealer && <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white border border-gray-300 flex items-center justify-center text-[9px] font-black text-gray-900 shadow-lg">D</div>}
        {isSB && !isDealer && <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[8px] font-black text-white shadow-lg">SB</div>}
        {isBB && !isDealer && <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-[8px] font-black text-white shadow-lg">BB</div>}
        {seat.allIn && !seat.folded && <div className="absolute -top-1 -left-1 px-1 py-0.5 rounded-full bg-orange-500 text-[7px] font-black text-white shadow-lg">ALL IN</div>}
      </div>

      {/* Name + chips */}
      <div className="text-center">
        <div className={`text-[10px] font-semibold leading-none ${seat.folded ? 'text-white/30' : isLocal ? 'text-blue-300' : 'text-white/80'}`}>
          {seat.guestName}{isLocal && <span className="text-blue-400"> (Du)</span>}
        </div>
        <div className="text-yellow-400 text-[10px] font-bold mt-0.5">{seat.chips.toLocaleString()}</div>
        {seat.currentBet > 0 && !seat.folded && (
          <div className="text-white/40 text-[9px]">Einsatz: {seat.currentBet}</div>
        )}
        {/* Result badge */}
        {handResult && (() => {
          const isWinner = handResult.winners.some((w) => w.seatIndex === seatIndex);
          if (isWinner && handResult.pot > 0) {
            return <div className="text-green-400 text-[10px] font-bold mt-0.5">+{Math.floor(handResult.pot / handResult.winners.length).toLocaleString()}</div>;
          }
          return null;
        })()}
      </div>
    </motion.div>
  );
}

// ── Community cards ───────────────────────────────────────────────────────────

function AnimatedCommunityCard({ card, index }: { card: Card; index: number }) {
  return (
    <motion.div
      initial={{ rotateY: 180, scale: 0.7, opacity: 0 }}
      animate={{ rotateY: 0, scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, delay: index * 0.12, ease: [0.34, 1.56, 0.64, 1] }}
      style={{ transformStyle: 'preserve-3d', perspective: 400 }}
    >
      <PlayingCard card={card} small glow />
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const EMOJIS = ['😂', '😤', '🔥', '💀', '👏', '😎', '🤔', '💰'] as const;

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || '';

export const GuestPokerPage = () => {
  const { guestId, balance, setBalance } = useGuest();
  const socketRef = useRef<Socket | null>(null);

  const [tableState, setTableState] = useState<GuestTableState | null>(null);
  const [myCards, setMyCards] = useState<[Card, Card] | null>(null);
  const [handResult, setHandResult] = useState<HandResult | null>(null);
  const [revealedCards, setRevealedCards] = useState<Record<number, [Card, Card]>>({});

  const [raiseAmt, setRaiseAmt] = useState(4);
  const [showRaise, setShowRaise] = useState(false);
  const [emotes, setEmotes] = useState<EmoteBubble[]>([]);
  const [showEmotePanel, setShowEmotePanel] = useState(false);

  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [afkMsg, setAfkMsg] = useState<string | null>(null);
  const [outOfChips, setOutOfChips] = useState(false);
  const [connected, setConnected] = useState(false);

  const resultDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derived state
  const mySeat = tableState?.seats.find((s) => s?.guestId === guestId) ?? null;
  const mySeatIndex = mySeat?.seatIndex ?? -1;
  const isMyTurn = tableState?.actionSeatIndex === mySeatIndex && mySeatIndex !== -1 && tableState?.phase !== 'WAITING' && tableState?.phase !== 'SHOWDOWN';
  const canSit = !mySeat && queuePosition === null && !outOfChips;
  const canCheck = isMyTurn && (mySeat?.currentBet ?? 0) === (tableState?.currentBet ?? 0);
  const callAmount = isMyTurn ? Math.min((tableState?.currentBet ?? 0) - (mySeat?.currentBet ?? 0), mySeat?.chips ?? 0) : 0;
  const minRaise = tableState?.minRaise ?? 4;
  const maxRaise = (mySeat?.chips ?? 0) + (mySeat?.currentBet ?? 0);

  useEffect(() => {
    const socket = io(`${API_BASE}/guest-poker`, {
      auth: { guestId },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('guest_poker:state', (state: GuestTableState) => {
      setTableState(state);
      setRaiseAmt(state.minRaise);
      if (state.phase === 'WAITING') {
        setMyCards(null);
        setRevealedCards({});
        setHandResult(null);
        setShowRaise(false);
        setOutOfChips(false);
      }
    });

    socket.on('guest_poker:my_cards', (cards: [Card, Card]) => {
      setMyCards(cards);
    });

    socket.on('guest_poker:hand_result', (result: HandResult) => {
      setHandResult(result);
      const rev: Record<number, [Card, Card]> = {};
      for (const { seatIndex, holeCards } of result.allHoleCards ?? []) {
        rev[seatIndex] = holeCards;
      }
      setRevealedCards(rev);
      if (resultDismissRef.current) clearTimeout(resultDismissRef.current);
      resultDismissRef.current = setTimeout(() => setHandResult(null), 3500);
    });

    socket.on('guest_poker:emote_broadcast', ({ seatIndex, emoji }: { seatIndex: number; emoji: string }) => {
      const id = Date.now();
      setEmotes((prev) => [...prev, { seatIndex, emoji, id }]);
      setTimeout(() => setEmotes((prev) => prev.filter((e) => e.id !== id)), 2100);
    });

    socket.on('guest_poker:queue_update', ({ position }: { position: number }) => {
      setQueuePosition(position);
    });

    socket.on('guest_poker:queue_seated', () => {
      setQueuePosition(null);
    });

    socket.on('guest_poker:afk_kick', ({ message }: { message: string }) => {
      setAfkMsg(message);
      setQueuePosition(null);
      setTimeout(() => setAfkMsg(null), 5000);
    });

    socket.on('guest_poker:out_of_chips', ({ message }: { message: string }) => {
      setOutOfChips(true);
      setErrorMsg(message);
      setTimeout(() => setErrorMsg(null), 5000);
    });

    socket.on('guest_poker:error', (msg: string) => {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 4000);
    });

    return () => { socket.disconnect(); };
  }, [guestId]);

  // Keep guest balance in sync when we stand/receive chips back
  useEffect(() => {
    if (!mySeat && tableState) {
      // Not seated — fetch fresh balance
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      fetch(`${API_URL}/guest/balance`, { headers: { 'x-guest-id': guestId } })
        .then((r) => r.json())
        .then((d) => { if (d.balance !== undefined) setBalance(d.balance); })
        .catch(() => { /* ignore */ });
    }
  }, [mySeat, tableState, guestId, setBalance]);

  const sit = (seatIndex: number) => socketRef.current?.emit('guest_poker:sit', { seatIndex });
  const stand = () => socketRef.current?.emit('guest_poker:stand');
  const leaveQueue = () => { socketRef.current?.emit('guest_poker:leave_queue'); setQueuePosition(null); };
  const action = (type: 'fold' | 'check' | 'call' | 'raise', amount?: number) => {
    socketRef.current?.emit('guest_poker:action', { type, amount });
    setShowRaise(false);
  };
  const fireEmote = (emoji: string) => {
    socketRef.current?.emit('guest_poker:emote', { emoji });
    setShowEmotePanel(false);
  };

  const phaseLabel: Record<GamePhase, string> = {
    WAITING: 'Warten auf Spieler…',
    PREFLOP: 'Pre-Flop',
    FLOP: 'Flop',
    TURN: 'Turn',
    RIVER: 'River',
    SHOWDOWN: 'Showdown',
  };

  return (
    <div className="min-h-screen flex flex-col overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 30%,#1a1025 0%,#09070e 70%)' }}
    >
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2.5 z-20 border-b border-white/[0.04]"
        style={{ background: 'rgba(9,7,14,0.8)', backdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-center gap-3">
          <Link to="/games/guest" className="flex items-center gap-1.5 text-white/35 hover:text-white/70 text-xs font-medium transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Zurück
          </Link>
          <span className="text-sky-300 font-black tracking-[0.2em] text-sm uppercase">Poker</span>
          <span className="px-2 py-0.5 rounded-full bg-violet-900/40 border border-violet-700/40 text-violet-300 text-[10px] font-semibold">Gastmodus</span>
          {/* Connection status */}
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
        </div>

        <div className="flex items-center gap-3">
          {/* Balance: show table chips if seated, else session balance */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.12)' }}
          >
            <div className="w-2 h-2 rounded-full bg-yellow-400/60" />
            <span className="text-yellow-300 font-black text-sm tabular-nums">
              {mySeat ? mySeat.chips.toLocaleString() : balance.toLocaleString()}
            </span>
            {mySeat && <span className="text-yellow-600/60 text-[9px]">am Tisch</span>}
          </div>

          {/* Stand button */}
          {mySeat && (
            <button onClick={stand}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-300/70 hover:text-red-200 transition-colors"
              style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)' }}
            >
              Aufstehen
            </button>
          )}
          {queuePosition !== null && (
            <button onClick={leaveQueue}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-gray-200 transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Warteschlange verlassen
            </button>
          )}
        </div>
      </div>

      {/* Queue banner */}
      <AnimatePresence>
        {queuePosition !== null && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="shrink-0 text-center py-2 text-sm font-semibold text-sky-300 border-b border-sky-900/30 overflow-hidden"
            style={{ background: 'rgba(14,165,233,0.06)' }}
          >
            Warteschlange — Position {queuePosition}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main table area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 z-10">
        <div className="w-full max-w-2xl">

          {/* Phase label */}
          {tableState && (
            <div className="text-center mb-3">
              <span className="text-xs font-semibold tracking-widest uppercase text-white/30">
                {phaseLabel[tableState.phase]}
              </span>
            </div>
          )}

          {/* Poker table — oval */}
          <div className="relative" style={{ paddingBottom: '65%' }}>
            {/* Table felt */}
            <div className="absolute inset-8 rounded-[50%] flex flex-col items-center justify-center"
              style={{
                background: 'radial-gradient(ellipse at 50% 40%,#1a5c2a 0%,#0e3d1a 55%,#071f0d 100%)',
                boxShadow: '0 0 0 8px #0a3014,0 0 0 14px #061a0a,0 40px 80px rgba(0,0,0,0.8)',
              }}
            >
              {/* Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04]">
                <span className="text-white font-black text-[60px] tracking-widest select-none">EG</span>
              </div>

              {/* Community cards + pot */}
              <div className="flex flex-col items-center gap-2 z-10">
                {tableState && tableState.pot > 0 && <PotDisplay pot={tableState.pot} />}

                {tableState && tableState.communityCards.length > 0 ? (
                  <div className="flex gap-1.5">
                    {tableState.communityCards.map((card, i) => (
                      <AnimatedCommunityCard key={`${card.rank}${card.suit}${i}`} card={card} index={i} />
                    ))}
                    {/* Placeholder slots */}
                    {Array.from({ length: 5 - tableState.communityCards.length }).map((_, i) => (
                      <div key={`ph${i}`} className="w-8 h-11 rounded-[5px] border border-white/5"
                        style={{ background: 'rgba(0,0,0,0.2)' }} />
                    ))}
                  </div>
                ) : tableState?.phase === 'WAITING' ? (
                  <div className="flex gap-1.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="w-8 h-11 rounded-[5px] border border-white/[0.06]"
                        style={{ background: 'rgba(0,0,0,0.15)' }} />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Seats positioned around oval */}
            {SEAT_POS.map((pos, seatIndex) => {
              const seat = tableState?.seats[seatIndex] ?? null;
              const emote = emotes.find((e) => e.seatIndex === seatIndex);
              const revealed = revealedCards[seatIndex] ?? null;
              return (
                <div
                  key={seatIndex}
                  className="absolute"
                  style={{
                    left: pos.left,
                    top: pos.top,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 20,
                    minWidth: 70,
                  }}
                >
                  <GuestSeatComponent
                    seat={seat}
                    seatIndex={seatIndex}
                    isLocal={seat?.guestId === guestId}
                    isActive={tableState?.actionSeatIndex === seatIndex}
                    isDealer={tableState?.dealerIndex === seatIndex}
                    isSB={tableState?.sbIndex === seatIndex}
                    isBB={tableState?.bbIndex === seatIndex}
                    myCards={seat?.guestId === guestId ? myCards : null}
                    revealedCards={revealed}
                    emote={emote}
                    onSit={sit}
                    canSit={canSit && !!(tableState) && balance >= 10}
                    handResult={handResult}
                  />
                </div>
              );
            })}
          </div>

          {/* My hole cards (large display when seated) */}
          <AnimatePresence>
            {myCards && mySeat && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center justify-center gap-3 mt-2"
              >
                <motion.div whileHover={{ y: -6, scale: 1.04 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                  <PlayingCard card={myCards[0]} glow />
                </motion.div>
                <motion.div whileHover={{ y: -6, scale: 1.04 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                  <PlayingCard card={myCards[1]} glow />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hand result banner */}
          <AnimatePresence>
            {handResult && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="mt-3 px-5 py-3 rounded-2xl text-center mx-auto max-w-sm"
                style={{
                  background: handResult.winners.some((w) => w.seatIndex === mySeatIndex)
                    ? 'rgba(16,185,129,0.15)' : 'rgba(0,0,0,0.5)',
                  border: handResult.winners.some((w) => w.seatIndex === mySeatIndex)
                    ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <p className="text-sm font-bold text-white/80">
                  {handResult.winners.map((w) => w.guestName).join(' & ')} {handResult.showdown ? `gewinnt — ${handResult.winners[0]?.handName ?? ''}` : 'gewinnt'}
                </p>
                {handResult.pot > 0 && <p className="text-yellow-400 font-black text-lg">{handResult.pot.toLocaleString()} Chips</p>}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Waiting prompt (not seated) */}
          {!mySeat && !outOfChips && tableState?.phase === 'WAITING' && queuePosition === null && balance >= 10 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-center">
              <p className="text-white/40 text-xs">Klicke auf einen freien Platz, um mitzuspielen.</p>
              <p className="text-white/25 text-xs mt-1">Alle Sitzungsguthaben werden auf den Tisch gebracht.</p>
            </motion.div>
          )}
          {!mySeat && balance < 10 && !outOfChips && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-center">
              <p className="text-red-400/70 text-xs">Mindestens 10 Sitzungsguthaben benötigt, um am Tisch zu sitzen.</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Action bar */}
      <AnimatePresence>
        {isMyTurn && mySeat && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="shrink-0 flex flex-col gap-2 px-4 py-3 border-t border-white/[0.04] z-20"
            style={{ background: 'rgba(9,7,14,0.9)', backdropFilter: 'blur(20px)' }}
          >
            {/* Raise slider */}
            <AnimatePresence>
              {showRaise && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 overflow-hidden"
                >
                  <span className="text-white/40 text-xs w-12 shrink-0">Raise</span>
                  <input
                    type="range"
                    min={minRaise}
                    max={maxRaise}
                    step={1}
                    value={raiseAmt}
                    onChange={(e) => setRaiseAmt(Number(e.target.value))}
                    className="flex-1 h-1.5 accent-yellow-400 cursor-pointer"
                  />
                  <span className="text-yellow-300 font-black text-sm tabular-nums w-16 text-right">{raiseAmt.toLocaleString()}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <ActionButton label="Fold" onClick={() => action('fold')} color="red" />
              {canCheck
                ? <ActionButton label="Check" onClick={() => action('check')} color="neutral" />
                : <ActionButton label={`Call ${callAmount}`} onClick={() => action('call')} color="green" disabled={callAmount <= 0} />
              }
              <ActionButton
                label={showRaise ? `Raise ${raiseAmt}` : 'Raise'}
                onClick={() => showRaise ? action('raise', raiseAmt) : setShowRaise(true)}
                color="blue"
                disabled={maxRaise <= (tableState?.currentBet ?? 0)}
              />

              {/* Emote button */}
              <div className="relative ml-auto">
                <button onClick={() => setShowEmotePanel((p) => !p)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  😄
                </button>
                <AnimatePresence>
                  {showEmotePanel && (
                    <motion.div initial={{ opacity: 0, scale: 0.8, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute bottom-full right-0 mb-2 p-2 rounded-2xl grid grid-cols-4 gap-1.5"
                      style={{ background: 'rgba(20,15,30,0.95)', border: '1px solid rgba(255,255,255,0.08)', minWidth: 160 }}
                    >
                      {EMOJIS.map((e) => (
                        <button key={e} onClick={() => fireEmote(e)}
                          className="text-xl flex items-center justify-center w-9 h-9 rounded-xl hover:bg-white/10 transition-colors"
                        >{e}</button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AFK kick message */}
      <AnimatePresence>
        {afkMsg && (
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl text-amber-200 text-xs font-semibold max-w-sm text-center"
            style={{ background: 'rgba(217,119,6,0.2)', border: '1px solid rgba(251,191,36,0.3)', backdropFilter: 'blur(16px)' }}
          >
            {afkMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Out of chips message + register CTA */}
      <AnimatePresence>
        {outOfChips && (
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4"
          >
            <div className="rounded-2xl p-4 text-center"
              style={{ background: 'rgba(9,7,14,0.95)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}
            >
              <p className="text-white/70 text-sm font-semibold mb-1">Guthaben aufgebraucht!</p>
              <p className="text-white/40 text-xs mb-3">Mit einem Konto erhältst du täglich 1.000 Coins.</p>
              <Link to="/register"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-xl text-sm font-semibold transition-colors"
              >
                Jetzt registrieren
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error toast */}
      <AnimatePresence>
        {errorMsg && !outOfChips && (
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl text-red-200 text-xs font-semibold"
            style={{ background: 'rgba(220,38,38,0.18)', border: '1px solid rgba(220,38,38,0.3)', backdropFilter: 'blur(16px)' }}
          >
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rules footer */}
      <div className="shrink-0 flex items-center justify-center gap-6 px-4 py-2 border-t border-white/[0.03] z-10">
        {[['Blinds', '1 / 2'], ['Tischplätze', '6'], ['AFK-Kick', '60s']].map(([label, val]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="text-white/15 text-[9px] font-medium tracking-wide uppercase">{label}</span>
            <span className="text-white/30 text-[9px] font-black">{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Action button helper ──────────────────────────────────────────────────────

function ActionButton({ label, onClick, color, disabled }: {
  label: string; onClick: () => void;
  color: 'red' | 'green' | 'blue' | 'neutral';
  disabled?: boolean;
}) {
  const palettes = {
    red:     { bg: 'rgba(220,38,38,0.18)',   border: 'rgba(220,38,38,0.3)',   text: '#f87171' },
    green:   { bg: 'rgba(22,163,74,0.18)',   border: 'rgba(22,163,74,0.3)',   text: '#4ade80' },
    blue:    { bg: 'rgba(37,99,235,0.18)',   border: 'rgba(37,99,235,0.3)',   text: '#60a5fa' },
    neutral: { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.1)', text: '#e5e7eb' },
  };
  const p = palettes[color];
  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.04 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      onClick={onClick}
      disabled={disabled}
      className="flex-1 py-2.5 rounded-xl font-black text-sm tracking-wide transition-opacity"
      style={{ background: p.bg, border: `1px solid ${p.border}`, color: p.text, opacity: disabled ? 0.3 : 1 }}
    >
      {label}
    </motion.button>
  );
}
