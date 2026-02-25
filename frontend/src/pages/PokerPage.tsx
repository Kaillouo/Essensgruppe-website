import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────

type Suit = 'h' | 'd' | 'c' | 's';
type Card = { rank: number; suit: Suit };
type GamePhase = 'WAITING' | 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN';

interface PublicSeat {
  seatIndex: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  chips: number;
  hasCards: boolean;
  folded: boolean;
  allIn: boolean;
  currentBet: number;
}

interface PublicWatcher {
  userId: string;
  username: string;
  avatarUrl: string | null;
}

interface TableState {
  seats: (PublicSeat | null)[];
  watchers: PublicWatcher[];
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
  soloMode: boolean;
}

interface HandResult {
  winners: { seatIndex: number; username: string; handName?: string; holeCards?: Card[] }[];
  allHoleCards: { seatIndex: number; holeCards: [Card, Card] }[];
  pot: number;
  showdown: boolean;
  allInvestments?: { seatIndex: number; invested: number }[];
}

interface EmoteBubble { seatIndex: number; emoji: string; id: number; }
interface ChatBubble  { seatIndex: number; text: string;  id: number; }

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
      style={{
        boxShadow: glow
          ? `0 0 12px rgba(250,204,21,0.3), 0 4px 12px rgba(0,0,0,0.4)`
          : '0 4px 12px rgba(0,0,0,0.4)',
      }}
    >
      <div className={`${topFont} font-black leading-none ${red ? 'text-red-600' : 'text-gray-900'}`}>
        {rank}<br />{sym}
      </div>
      <div className={`absolute inset-0 flex items-center justify-center ${midFont} font-black ${red ? 'text-red-200' : 'text-gray-200'}`}>
        {sym}
      </div>
      <div className={`${topFont} font-black leading-none rotate-180 self-end ${red ? 'text-red-600' : 'text-gray-900'}`}>
        {rank}<br />{sym}
      </div>
    </div>
  );
}

function CardBack({ small = false, className = '' }: { small?: boolean; className?: string }) {
  return (
    <div
      className={`${small ? 'w-8 h-11' : 'w-11 h-16'} rounded-[5px] border border-white/10 flex items-center justify-center overflow-hidden ${className}`}
      style={{
        background: 'linear-gradient(145deg, #1a237e 0%, #283593 50%, #1a237e 100%)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
      }}
    >
      <div
        className="w-[76%] h-[76%] border border-blue-400/30 rounded-[3px]"
        style={{ background: 'repeating-linear-gradient(45deg,transparent,transparent 2px,rgba(255,255,255,0.04) 2px,rgba(255,255,255,0.04) 4px)' }}
      />
    </div>
  );
}

// ── Pot display ───────────────────────────────────────────────────────────────

function PotDisplay({ pot }: { pot: number }) {
  // Color scales from gold → orange → red as pot grows
  const big = pot >= 500;
  const huge = pot >= 2000;
  const chipCount = Math.min(8, Math.max(1, Math.ceil(pot / 80)));

  const glowColor = huge
    ? 'rgba(239,68,68,0.5)'
    : big
    ? 'rgba(251,146,60,0.4)'
    : 'rgba(250,204,21,0.3)';
  const textColor = huge ? '#f87171' : big ? '#fb923c' : '#fde047';
  const chipColor = huge
    ? 'linear-gradient(145deg,#dc2626,#b91c1c)'
    : big
    ? 'linear-gradient(145deg,#ea580c,#c2410c)'
    : 'linear-gradient(145deg,#ca8a04,#92400e)';

  return (
    <motion.div
      animate={{ scale: [1, 1.03, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      className="flex flex-col items-center gap-1.5"
    >
      {/* Chip stack */}
      <div className="relative flex items-end justify-center" style={{ height: 28, width: chipCount * 10 + 12 }}>
        {Array.from({ length: chipCount }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full border border-white/20"
            style={{
              width: 20, height: 8,
              bottom: i * 5,
              left: '50%',
              transform: 'translateX(-50%)',
              background: chipColor,
              boxShadow: i === chipCount - 1 ? `0 0 8px ${glowColor}` : undefined,
              zIndex: i,
            }}
          />
        ))}
      </div>
      {/* Amount */}
      <div
        className="flex items-center gap-1.5 px-3 py-1 rounded-full"
        style={{
          background: 'rgba(0,0,0,0.5)',
          border: `1px solid ${glowColor}`,
          boxShadow: `0 0 16px ${glowColor}, 0 0 32px ${glowColor.replace('0.', '0.15')}`,
        }}
      >
        <span className="font-black tabular-nums tracking-tight" style={{ color: textColor, fontSize: huge ? 16 : big ? 14 : 13 }}>
          {pot.toLocaleString()}
        </span>
        <span className="text-white/30 text-[9px] font-medium uppercase tracking-widest">pot</span>
      </div>
    </motion.div>
  );
}

// ── Decorative idle cards ────────────────────────────────────────────────────

function DecorativeCards() {
  return (
    <div className="flex gap-2 items-center">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          animate={{
            y: [0, -4, 0],
            rotate: [-2 + i * 1, 2 - i * 0.5, -2 + i * 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: i * 0.3,
            ease: 'easeInOut',
          }}
        >
          <CardBack small />
        </motion.div>
      ))}
    </div>
  );
}

// ── Floating ambient particles ───────────────────────────────────────────────

function AmbientParticles() {
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    left: `${5 + (i * 37) % 90}%`,
    delay: i * 0.7,
    duration: 8 + (i % 5) * 2,
    size: 1.5 + (i % 3) * 0.8,
    opacity: 0.08 + (i % 4) * 0.03,
  }));
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.left,
            bottom: '-4%',
            width: p.size,
            height: p.size,
            background: `radial-gradient(circle, rgba(250,204,21,${p.opacity + 0.15}) 0%, rgba(250,204,21,0) 70%)`,
            boxShadow: `0 0 ${p.size * 4}px rgba(250,204,21,${p.opacity})`,
          }}
          animate={{
            y: [0, -(typeof window !== 'undefined' ? window.innerHeight + 60 : 900)],
            x: [0, Math.sin(p.id) * 40],
            opacity: [0, p.opacity, p.opacity, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}

// ── Deck stack (visible on table) ────────────────────────────────────────────

function DeckStack({ cardsLeft }: { cardsLeft: number }) {
  const layers = Math.min(6, Math.max(1, Math.ceil(cardsLeft / 8)));
  return (
    <div className="relative" style={{ width: 32, height: 44 }}>
      {Array.from({ length: layers }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-[4px] border border-white/8"
          style={{
            width: 32,
            height: 44,
            top: -i * 1.2,
            left: i * 0.3,
            background: 'linear-gradient(145deg, #1a237e 0%, #283593 50%, #1a237e 100%)',
            boxShadow: i === layers - 1
              ? '0 4px 12px rgba(0,0,0,0.5)'
              : '0 1px 2px rgba(0,0,0,0.3)',
            zIndex: i,
          }}
        >
          {i === layers - 1 && (
            <div
              className="absolute inset-[3px] border border-blue-400/20 rounded-[2px]"
              style={{ background: 'repeating-linear-gradient(45deg,transparent,transparent 2px,rgba(255,255,255,0.03) 2px,rgba(255,255,255,0.03) 4px)' }}
            />
          )}
        </div>
      ))}
      <span
        className="absolute text-[8px] font-bold tabular-nums text-white/25 pointer-events-none"
        style={{ bottom: -14, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}
      >
        {cardsLeft}
      </span>
    </div>
  );
}

// ── Animated community card (flip reveal) ────────────────────────────────────

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

// ── Seat positions around the oval ───────────────────────────────────────────

const SEAT_POS = [
  { left: '50%',  top: '10%' }, // 0 — top center
  { left: '74%',  top: '18%' }, // 1 — top right
  { left: '88%',  top: '38%' }, // 2 — right top
  { left: '88%',  top: '62%' }, // 3 — right bottom
  { left: '74%',  top: '82%' }, // 4 — bottom right
  { left: '50%',  top: '90%' }, // 5 — bottom center
  { left: '26%',  top: '82%' }, // 6 — bottom left
  { left: '12%',  top: '62%' }, // 7 — left bottom
  { left: '12%',  top: '38%' }, // 8 — left top
  { left: '26%',  top: '18%' }, // 9 — top left
];

// ── Seat component ────────────────────────────────────────────────────────────

function Seat({
  seat, seatIndex, isLocal, isActive, isDealer, isSB, isBB,
  myCards, revealedCards,
  emote, chat,
  onSit, canSit,
  handResult, myUserId,
}: {
  seat: PublicSeat | null;
  seatIndex: number;
  isLocal: boolean;
  isActive: boolean;
  isDealer: boolean;
  isSB: boolean;
  isBB: boolean;
  myCards: [Card, Card] | null;
  revealedCards: [Card, Card] | null;
  emote?: EmoteBubble;
  chat?: ChatBubble;
  onSit: (i: number) => void;
  canSit: boolean;
  handResult?: HandResult | null;
  myUserId?: string;
}) {
  const isBottom = seatIndex >= 3 && seatIndex <= 7;
  const holeCards = isLocal ? myCards : (revealedCards ?? null);

  if (!seat) {
    return (
      <div className="flex flex-col items-center gap-1">
        {canSit ? (
          <motion.button
            onClick={() => onSit(seatIndex)}
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(74,222,128,0)',
                '0 0 16px 6px rgba(74,222,128,0.2)',
                '0 0 0 0 rgba(74,222,128,0)',
              ],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-[52px] h-[52px] rounded-full border border-green-400/30 hover:border-green-400/70 transition-all flex items-center justify-center backdrop-blur-sm group"
            style={{ background: 'radial-gradient(circle, rgba(74,222,128,0.08) 0%, rgba(74,222,128,0.02) 70%)' }}
          >
            <span className="text-green-400/50 group-hover:text-green-300 text-[10px] font-bold tracking-wider uppercase transition-colors">Sit</span>
          </motion.button>
        ) : (
          <div
            className="w-[52px] h-[52px] rounded-full border border-white/[0.06]"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.02) 0%, transparent 70%)' }}
          />
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative flex flex-col items-center gap-1.5 select-none"
    >
      {/* Chat bubble */}
      <AnimatePresence>
        {chat && (
          <motion.div
            key={chat.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`absolute ${isBottom ? 'bottom-full mb-2' : 'top-full mt-2'} left-1/2 -translate-x-1/2 z-50 whitespace-nowrap max-w-[150px]`}
          >
            <div className="bg-white text-gray-900 text-[11px] font-medium px-3 py-1.5 rounded-xl shadow-2xl truncate max-w-[150px]">
              {chat.text}
            </div>
            <div className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 ${isBottom ? '-bottom-1.5 border-t-[5px] border-t-white border-x-[4px] border-x-transparent' : '-top-1.5 border-b-[5px] border-b-white border-x-[4px] border-x-transparent'}`} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emote */}
      <AnimatePresence>
        {emote && (
          <motion.div
            key={emote.id}
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -44, scale: 1.4 }}
            transition={{ duration: 2, ease: 'easeOut' }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 text-2xl pointer-events-none z-50"
          >
            {emote.emoji}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cards above/below avatar — animate in from center */}
      {seat.hasCards && (
        <div className={`flex gap-0.5 ${isBottom ? 'order-first mb-0.5' : 'order-last mt-0.5'}`}>
          {holeCards ? (
            <>
              <motion.div
                initial={{ x: 40, y: isBottom ? 30 : -30, opacity: 0, scale: 0.5 }}
                animate={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              >
                <PlayingCard card={holeCards[0]} small />
              </motion.div>
              <motion.div
                initial={{ x: 40, y: isBottom ? 30 : -30, opacity: 0, scale: 0.5 }}
                animate={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
              >
                <PlayingCard card={holeCards[1]} small />
              </motion.div>
            </>
          ) : (
            !seat.folded && (
              <>
                <motion.div
                  initial={{ x: 40, y: isBottom ? 30 : -30, opacity: 0, scale: 0.5 }}
                  animate={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
                >
                  <CardBack small />
                </motion.div>
                <motion.div
                  initial={{ x: 40, y: isBottom ? 30 : -30, opacity: 0, scale: 0.5 }}
                  animate={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  transition={{ duration: 0.45, delay: 0.12, ease: [0.23, 1, 0.32, 1] }}
                >
                  <CardBack small />
                </motion.div>
              </>
            )
          )}
        </div>
      )}

      {/* Avatar — glassmorphism on occupied seats */}
      <div className="relative">
        <div
          className={`w-[60px] h-[60px] rounded-full overflow-hidden border-[3px] transition-all ${
            seat.folded
              ? 'border-gray-600 opacity-40 grayscale'
              : isActive
              ? 'border-yellow-400'
              : isLocal
              ? 'border-blue-400'
              : 'border-white/30'
          }`}
          style={{
            boxShadow: isActive && !seat.folded
              ? '0 0 18px rgba(250,204,21,0.55), 0 0 40px rgba(250,204,21,0.15)'
              : '0 4px 20px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {seat.avatarUrl ? (
            <img src={seat.avatarUrl} alt={seat.username} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white text-xl font-bold">
              {seat.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Dealer / blind badges */}
        {isDealer && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white border border-gray-300 flex items-center justify-center text-[9px] font-black text-gray-900 shadow-lg">D</div>
        )}
        {isSB && !isDealer && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[8px] font-black text-white shadow-lg">SB</div>
        )}
        {isBB && !isDealer && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-[8px] font-black text-white shadow-lg">BB</div>
        )}

        {/* All-in badge */}
        {seat.allIn && !seat.folded && (
          <div className="absolute -top-1 -left-1 px-1.5 py-0.5 rounded-full bg-orange-500 text-[8px] font-black text-white shadow-lg">ALL IN</div>
        )}
      </div>

      {/* Name + chips */}
      <div className="text-center">
        <div className={`text-xs font-semibold leading-none ${seat.folded ? 'text-white/30' : isLocal ? 'text-blue-300' : 'text-white'}`}>
          {seat.username}{isLocal && <span className="text-blue-500"> (You)</span>}
        </div>
        <div className="text-yellow-400 text-[11px] font-bold mt-0.5">
          {seat.chips.toLocaleString()} <span className="text-yellow-600 font-normal">chips</span>
        </div>
        {seat.currentBet > 0 && !seat.folded && (
          <div className="text-white/50 text-[10px]">bet: {seat.currentBet}</div>
        )}
        {/* Per-seat result badge */}
        {handResult && (() => {
          const isWinner = handResult.winners.some((w) => w.seatIndex === seatIndex);
          const winShare = isWinner ? Math.floor(handResult.pot / handResult.winners.length) : 0;
          const invested = handResult.allInvestments?.find((inv) => inv.seatIndex === seatIndex)?.invested ?? 0;
          const isMe = seat.userId === myUserId;
          if (isWinner && handResult.pot > 0) {
            return <div className="text-green-400 text-[11px] font-bold mt-0.5">+{winShare.toLocaleString()}</div>;
          }
          if (!isWinner && isMe && invested > 0) {
            return <div className="text-red-400 text-[11px] font-bold mt-0.5">-{invested.toLocaleString()}</div>;
          }
          return null;
        })()}
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const EMOJIS = ['😂', '😤', '🔥', '💀', '👏', '😎', '🤔', '💰'] as const;

export const PokerPage = () => {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  const [tableState, setTableState] = useState<TableState | null>(null);
  const [myCards, setMyCards] = useState<[Card, Card] | null>(null);
  const [handResult, setHandResult] = useState<HandResult | null>(null);
  const [revealedCards, setRevealedCards] = useState<Record<number, [Card, Card]>>({});

  const [raiseAmt, setRaiseAmt] = useState(4);
  const [showRaise, setShowRaise] = useState(false);
  const [emotes, setEmotes] = useState<EmoteBubble[]>([]);
  const [chats, setChats] = useState<ChatBubble[]>([]);
  const [showEmotePanel, setShowEmotePanel] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [, setBubbleId] = useState(0);
  const prevCommunityCount = useRef(0);
  const resultDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Queue state
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Derived
  const mySeat = tableState?.seats.find((s) => s?.userId === user?.id) ?? null;
  const mySeatIndex = mySeat?.seatIndex ?? -1;
  const isMyTurn = !tableState?.soloMode && tableState?.actionSeatIndex === mySeatIndex && mySeatIndex !== -1;
  const canSit = !mySeat && queuePosition === null;
  const canCheck = isMyTurn && (mySeat?.currentBet ?? 0) === (tableState?.currentBet ?? 0);
  const callAmount = isMyTurn ? Math.min((tableState?.currentBet ?? 0) - (mySeat?.currentBet ?? 0), mySeat?.chips ?? 0) : 0;
  const minRaise = tableState?.minRaise ?? 4;
  const maxRaise = (mySeat?.chips ?? 0) + (mySeat?.currentBet ?? 0);
  const noOneSeated = tableState?.seats.every((s) => s === null) ?? true;
  const isIdle = tableState?.phase === 'WAITING' && noOneSeated;

  useEffect(() => {
    const token = localStorage.getItem('token');
    const socket = io({ auth: { token }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.emit('poker:watch'); // register as watcher immediately

    socket.on('poker:state', (state: TableState) => {
      setTableState((prev) => {
        prevCommunityCount.current = prev?.communityCards.length ?? 0;
        return state;
      });
      // Reset raise slider to sensible default
      setRaiseAmt(state.minRaise);
      if (state.phase === 'WAITING') {
        setMyCards(null);
        setRevealedCards({});
        setHandResult(null);
        setShowRaise(false);
      }
    });

    socket.on('poker:my_cards', (cards: [Card, Card]) => {
      setMyCards(cards);
    });

    socket.on('poker:hand_result', (result: HandResult) => {
      setHandResult(result);
      // Reveal all hole cards
      const rev: Record<number, [Card, Card]> = {};
      for (const { seatIndex, holeCards } of result.allHoleCards ?? []) {
        rev[seatIndex] = holeCards;
      }
      setRevealedCards(rev);
      // Auto-dismiss banner after 3.5s
      if (resultDismissRef.current) clearTimeout(resultDismissRef.current);
      resultDismissRef.current = setTimeout(() => setHandResult(null), 3500);
    });

    socket.on('poker:emote_broadcast', ({ seatIndex, emoji }: { seatIndex: number; emoji: string }) => {
      const id = Date.now();
      setEmotes((prev) => [...prev, { seatIndex, emoji, id }]);
      setBubbleId((b) => b + 1);
      setTimeout(() => setEmotes((prev) => prev.filter((e) => e.id !== id)), 2100);
    });

    socket.on('poker:message_broadcast', ({ seatIndex, text }: { seatIndex: number; text: string }) => {
      const id = Date.now() + Math.random();
      setChats((prev) => [...prev, { seatIndex, text, id }]);
      setTimeout(() => setChats((prev) => prev.filter((c) => c.id !== id)), 2200);
    });

    socket.on('poker:queue_update', ({ position }: { position: number; total: number }) => {
      setQueuePosition(position);
    });

    socket.on('poker:queue_seated', () => {
      setQueuePosition(null);
    });

    socket.on('poker:error', (msg: string) => {
      console.error('[poker:error]', msg);
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 4000);
    });

    socket.on('connect_error', (err: Error) => {
      console.error('[socket connect_error]', err.message);
    });

    return () => { socket.disconnect(); };
  }, []);

  const sit = (seatIndex: number) => {
    console.log('[poker] sit requested, seat:', seatIndex, 'socket connected:', socketRef.current?.connected);
    socketRef.current?.emit('poker:sit', { seatIndex });
  };
  const stand = () => socketRef.current?.emit('poker:stand');
  const leaveQueue = () => {
    socketRef.current?.emit('poker:leave_queue');
    setQueuePosition(null);
  };
  const action = (type: 'fold' | 'check' | 'call' | 'raise', amount?: number) => {
    socketRef.current?.emit('poker:action', { type, amount });
    setShowRaise(false);
  };
  const fireEmote = (emoji: string) => {
    socketRef.current?.emit('poker:emote', { emoji });
    setShowEmotePanel(false);
  };
  const sendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    socketRef.current?.emit('poker:message', { text });
    setChatInput('');
    setShowEmotePanel(false);
  };

  const phaseLabel: Record<GamePhase, string> = {
    WAITING: 'Waiting for players…',
    PREFLOP: 'Pre-Flop',
    FLOP: 'Flop',
    TURN: 'Turn',
    RIVER: 'River',
    SHOWDOWN: 'Showdown',
  };

  return (
    <div
      className="min-h-screen flex flex-col overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, #1a1025 0%, #09070e 70%)' }}
    >
      {/* Ambient particles */}
      <AmbientParticles />

      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3 shrink-0 z-10 border-b border-white/[0.04]"
        style={{ background: 'rgba(5,3,10,0.6)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
      >
        <Link to="/games" className="flex items-center gap-1.5 text-white/35 hover:text-white/75 text-xs font-medium transition-colors tracking-wide">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-white/50 text-[11px] font-bold tracking-[0.3em] uppercase" style={{ fontFamily: "'Georgia', serif" }}>Poker</span>
          {tableState && (
            <span className={`text-[10px] px-2.5 py-1 rounded-md font-semibold tracking-wide ${
              tableState.phase === 'WAITING'
                ? 'bg-white/[0.04] text-white/40 border border-white/[0.06]'
                : 'bg-green-500/10 text-green-400 border border-green-500/20'
            }`}>
              {phaseLabel[tableState.phase]}
            </span>
          )}
          {(tableState?.queueCount ?? 0) > 0 && (
            <span className="text-[10px] px-2 py-1 rounded-md font-semibold tracking-wide bg-amber-500/8 text-amber-400/80 border border-amber-500/15">
              {tableState!.queueCount} queued
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-yellow-500/15"
            style={{ background: 'rgba(250,204,21,0.04)' }}
          >
            <div className="w-2 h-2 rounded-full bg-yellow-400/60" />
            <span className="text-yellow-300 font-bold text-xs tabular-nums">{(mySeat?.chips ?? user?.balance ?? 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Watcher strip */}
      {tableState?.watchers && tableState.watchers.length > 0 && (
        <div className="shrink-0 flex items-center justify-center gap-2.5 px-5 py-1 z-10">
          <span className="text-white/15 text-[10px] font-medium tracking-wider uppercase">
            {tableState.watchers.length} watching
          </span>
          <div className="flex -space-x-1.5">
            {tableState.watchers.slice(0, 8).map((w) => (
              <div
                key={w.userId}
                className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0"
                title={w.username}
                style={{ border: '1.5px solid rgba(0,0,0,0.6)' }}
              >
                {w.avatarUrl ? (
                  <img src={w.avatarUrl} alt={w.username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-white/50 text-[9px] font-bold">
                    {w.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            ))}
            {tableState.watchers.length > 8 && (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] text-white/30 font-bold"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(0,0,0,0.6)' }}
              >
                +{tableState.watchers.length - 8}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="relative" style={{ width: 800, height: 540 }}>

          {/* ── 3D table ── */}
          <div
            className="absolute"
            style={{
              width: 640, height: 300,
              top: '50%', left: '50%',
              transform: 'translate(-50%, -45%) perspective(900px) rotateX(22deg)',
              borderRadius: '50%',
            }}
          >
            {/* Wood rim */}
            <div className="absolute inset-0 rounded-[50%]" style={{
              background: 'radial-gradient(ellipse at 50% 30%, #6b3a1f 0%, #3d1f0a 60%, #2a1508 100%)',
              boxShadow: '0 30px 80px rgba(0,0,0,0.95), 0 10px 30px rgba(0,0,0,0.8), inset 0 2px 4px rgba(255,255,255,0.07)',
            }} />

            {/* Felt with grain texture */}
            <div className="absolute rounded-[50%]" style={{
              inset: 20,
              background: 'radial-gradient(ellipse at 50% 30%, #2d7a45 0%, #1e5c30 45%, #0d3a1a 85%)',
              boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.5)',
            }}>
              {/* Grain/noise texture overlay */}
              <div
                className="absolute inset-0 rounded-[50%] pointer-events-none opacity-[0.08]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                  backgroundSize: '128px 128px',
                }}
              />

              {/* Highlight */}
              <div className="absolute rounded-[50%] pointer-events-none" style={{ inset: '20% 25%', background: 'radial-gradient(ellipse, rgba(255,255,255,0.04) 0%, transparent 70%)' }} />

              {/* EG watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ opacity: 0.055 }}>
                <span className="text-white font-black text-5xl tracking-widest">EG</span>
              </div>

              {/* Center content */}
              <div className="absolute flex flex-col items-center gap-2.5 pointer-events-none"
                style={{ top: '38%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                {/* Pot */}
                {tableState && tableState.pot > 0 && (
                  <PotDisplay pot={tableState.pot} />
                )}
                {/* Community cards or decorative idle cards */}
                {isIdle ? (
                  <DecorativeCards />
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      {Array(5).fill(null).map((_, i) => {
                        const card = tableState?.communityCards[i];
                        const isNew = i >= prevCommunityCount.current;
                        return card ? (
                          isNew ? (
                            <AnimatedCommunityCard key={`${card.rank}${card.suit}`} card={card} index={i - prevCommunityCount.current} />
                          ) : (
                            <PlayingCard key={`${card.rank}${card.suit}`} card={card} small glow />
                          )
                        ) : tableState?.phase !== 'WAITING' ? (
                          <CardBack key={i} small />
                        ) : (
                          <div
                            key={i}
                            className="w-8 h-11 rounded-[4px]"
                            style={{
                              border: '1px solid rgba(250,204,21,0.08)',
                              background: 'rgba(0,0,0,0.2)',
                              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3), 0 0 8px rgba(250,204,21,0.03)',
                            }}
                          />
                        );
                      })}
                    </div>
                    {/* Deck stack */}
                    {!isIdle && (
                      <DeckStack cardsLeft={52 - (tableState?.communityCards.length ?? 0) - (tableState?.seats.filter(s => s?.hasCards).length ?? 0) * 2} />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Ambient glow */}
          <div className="absolute pointer-events-none" style={{ width: 500, height: 180, top: '18%', left: '50%', transform: 'translateX(-50%)', background: 'radial-gradient(ellipse, rgba(80,200,120,0.06) 0%, transparent 70%)', filter: 'blur(18px)' }} />

          {/* ── Seats ── */}
          <div style={{ position: 'absolute', inset: 0 }}>
            {SEAT_POS.map((pos, i) => (
              <div key={i} className="absolute" style={{ left: pos.left, top: pos.top, transform: 'translate(-50%, -50%)' }}>
                <Seat
                  seat={tableState?.seats[i] ?? null}
                  seatIndex={i}
                  isLocal={(tableState?.seats[i]?.userId ?? '') === user?.id}
                  isActive={tableState?.actionSeatIndex === i}
                  isDealer={tableState?.dealerIndex === i}
                  isSB={tableState?.sbIndex === i}
                  isBB={tableState?.bbIndex === i}
                  myCards={myCards}
                  revealedCards={revealedCards[i] ?? null}
                  emote={emotes.find((e) => e.seatIndex === i)}
                  chat={chats.find((c) => c.seatIndex === i)}
                  onSit={sit}
                  canSit={canSit}
                  handResult={handResult}
                  myUserId={user?.id}
                />
              </div>
            ))}
          </div>

          {/* ── Inline result banner (top of table) ── */}
          <AnimatePresence>
            {handResult && (
              <motion.div
                key="result-banner"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none text-center"
                style={{
                  background: 'rgba(10,6,20,0.92)',
                  border: '1px solid rgba(250,204,21,0.25)',
                  borderRadius: 12,
                  padding: '8px 20px',
                  backdropFilter: 'blur(16px)',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
                }}
              >
                <span className="text-yellow-400 font-bold text-sm">
                  {handResult.winners.map((w, i) => (
                    <span key={i}>{i > 0 ? ' & ' : ''}{w.username}</span>
                  ))}
                  {' gewinnt'}
                  {handResult.winners[0]?.handName && handResult.showdown ? ` · ${handResult.winners[0].handName}` : ''}
                  {handResult.pot > 0 ? ` · +${handResult.pot.toLocaleString()}` : ''}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Action bar ── */}
      <div
        className="shrink-0 px-5 py-3.5 pb-safe border-t border-white/[0.05] flex items-center justify-center gap-3 z-10"
        style={{ background: 'rgba(5,3,10,0.75)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
      >
        {/* Queue badge */}
        {queuePosition !== null ? (
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-lg"
              style={{ background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.12)' }}
            >
              <span className="text-amber-300/80 font-bold text-xs tabular-nums">#{queuePosition}</span>
              <span className="text-white/30 text-xs">in queue</span>
            </div>
            <button
              onClick={leaveQueue}
              className="px-3 py-2 rounded-lg text-red-400/60 hover:text-red-300 text-xs font-medium transition-colors"
              style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.1)' }}
            >
              Leave
            </button>
          </div>
        ) : isMyTurn ? (
          <>
            <button
              onClick={() => action('fold')}
              className="px-6 py-2.5 rounded-lg text-red-300/80 font-semibold text-sm transition-all hover:text-red-200 active:scale-[0.96]"
              style={{
                background: 'rgba(220,38,38,0.12)',
                border: '1px solid rgba(220,38,38,0.2)',
                boxShadow: '0 0 0 0 rgba(220,38,38,0)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 16px rgba(220,38,38,0.15)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 0 0 rgba(220,38,38,0)'}
            >
              Fold
            </button>

            {canCheck ? (
              <button
                onClick={() => action('check')}
                className="px-6 py-2.5 rounded-lg text-white/80 font-semibold text-sm transition-all hover:text-white active:scale-[0.96]"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                Check
              </button>
            ) : (
              <button
                onClick={() => action('call')}
                className="px-6 py-2.5 rounded-lg text-blue-200/90 font-semibold text-sm transition-all hover:text-blue-100 active:scale-[0.96]"
                style={{
                  background: 'rgba(59,130,246,0.12)',
                  border: '1px solid rgba(59,130,246,0.2)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 16px rgba(59,130,246,0.15)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
              >
                Call {callAmount}
              </button>
            )}

            {!showRaise ? (
              <button
                onClick={() => { setShowRaise(true); setRaiseAmt(minRaise); }}
                disabled={mySeat?.chips === 0}
                className="px-6 py-2.5 rounded-lg text-green-300/90 font-semibold text-sm transition-all disabled:opacity-20 hover:text-green-200 active:scale-[0.96]"
                style={{
                  background: 'rgba(34,197,94,0.12)',
                  border: '1px solid rgba(34,197,94,0.2)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 16px rgba(34,197,94,0.15)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
              >
                Raise
              </button>
            ) : (
              <div className="flex items-center gap-2.5">
                <input
                  type="range"
                  min={minRaise}
                  max={maxRaise}
                  value={raiseAmt}
                  onChange={(e) => setRaiseAmt(Number(e.target.value))}
                  className="w-28 accent-green-400"
                />
                <span className="text-white/80 text-sm font-bold w-12 text-center tabular-nums">{raiseAmt}</span>
                <button
                  onClick={() => action('raise', raiseAmt)}
                  className="px-5 py-2 rounded-lg text-white font-bold text-sm transition-all active:scale-[0.96]"
                  style={{
                    background: 'rgba(34,197,94,0.25)',
                    border: '1px solid rgba(34,197,94,0.35)',
                    boxShadow: '0 0 12px rgba(34,197,94,0.15)',
                  }}
                >
                  Raise
                </button>
                <button onClick={() => setShowRaise(false)} className="text-white/25 hover:text-white/50 text-sm transition-colors ml-1">✕</button>
              </div>
            )}
          </>
        ) : !mySeat ? (
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400/40 animate-pulse" />
            <p className="text-white/30 text-xs tracking-wide">
              Choose a seat to join the table
            </p>
          </div>
        ) : tableState?.soloMode && mySeat && tableState?.phase !== 'WAITING' && tableState?.phase !== 'SHOWDOWN' ? (
          <button
            onClick={() => socketRef.current?.emit('poker:solo_continue')}
            className="px-6 py-2.5 rounded-lg font-semibold text-sm transition-all active:scale-[0.96]"
            style={{ background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.3)', color: '#c4b5fd' }}
          >
            {tableState.phase === 'RIVER' ? 'Showdown →' : 'Weiter →'}
          </button>
        ) : tableState?.soloMode && mySeat ? (
          <p className="text-white/40 text-xs tracking-wide italic">
            Practice mode — no chips change
          </p>
        ) : tableState?.phase === 'WAITING' && mySeat ? (
          <p className="text-white/30 text-xs tracking-wide">
            {(tableState.seats.filter(s => s !== null).length ?? 0) < 2
              ? 'Hand starting soon…'
              : 'Hand starting soon…'}
          </p>
        ) : (
          <p className="text-white/20 text-xs tracking-wide italic">
            {tableState?.seats[tableState?.actionSeatIndex ?? -1]?.username ?? '…'}'s turn
          </p>
        )}
      </div>

      {/* ── Error toast ── */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg text-red-200 text-xs font-medium"
            style={{ background: 'rgba(220,38,38,0.2)', border: '1px solid rgba(220,38,38,0.3)', backdropFilter: 'blur(12px)' }}
          >
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Emote FAB + Leave ── */}
      {mySeat && (
        <div className="fixed bottom-20 right-5 z-40 flex flex-col items-end gap-2">
          <AnimatePresence>
            {showEmotePanel && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 8 }}
                className="rounded-xl overflow-hidden"
                style={{
                  background: 'rgba(12,8,22,0.96)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
                }}
              >
                <div className="flex items-center gap-2 px-3 pt-3 pb-2.5 border-b border-white/[0.05]">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value.slice(0, 50))}
                    onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                    placeholder="Say something…"
                    maxLength={50}
                    className="border rounded-lg px-3 py-1.5 text-white text-xs w-44 outline-none placeholder-white/15 transition-colors"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      borderColor: 'rgba(255,255,255,0.06)',
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(250,204,21,0.2)'}
                    onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={sendChat}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white/70 hover:text-white transition-all"
                    style={{ background: 'rgba(250,204,21,0.15)', border: '1px solid rgba(250,204,21,0.2)' }}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14m-7-7l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1 p-2.5">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => fireEmote(emoji)}
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all hover:scale-110"
                      style={{ background: 'rgba(255,255,255,0.03)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-2">
            {/* Leave button */}
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              onClick={stand}
              className="h-11 px-4 rounded-full flex items-center gap-1.5 text-sm font-semibold text-red-300/80 hover:text-red-200 transition-colors"
              style={{
                background: 'rgba(220,38,38,0.1)',
                border: '1px solid rgba(220,38,38,0.18)',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 16px rgba(220,38,38,0.15), 0 8px 24px rgba(0,0,0,0.3)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)'}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Leave
            </motion.button>

            {/* Emote / chat button */}
            <motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => setShowEmotePanel(!showEmotePanel)}
              className="w-11 h-11 rounded-full flex items-center justify-center text-base"
              style={{
                background: showEmotePanel ? 'rgba(250,204,21,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${showEmotePanel ? 'rgba(250,204,21,0.25)' : 'rgba(255,255,255,0.08)'}`,
                backdropFilter: 'blur(16px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              }}
            >
              {showEmotePanel ? <span className="text-white/60 text-sm">✕</span> : '💬'}
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
};
