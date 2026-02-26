import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { ApiService } from '../services/api.service';

// ── Types ─────────────────────────────────────────────────────────────────────

type Suit = 'h' | 'd' | 'c' | 's';
type Card = { rank: number; suit: Suit };
type GameStatus =
  | 'IDLE'
  | 'PLAYING'
  | 'PLAYER_BUST'
  | 'DEALER_BUST'
  | 'WIN'
  | 'LOSS'
  | 'PUSH'
  | 'BLACKJACK';

interface GameState {
  playerHand: Card[];
  dealerHand: Card[];
  dealerHoleHidden: boolean;
  playerValue: number;
  dealerValue: number;
  bet: number;
  originalBet: number;
  doubled: boolean;
  status: GameStatus;
  balance: number;
}

// ── Card helpers ──────────────────────────────────────────────────────────────

const SUIT_SYM: Record<Suit, string> = { h: '♥', d: '♦', c: '♣', s: '♠' };
const SUIT_RED: Record<Suit, boolean> = { h: true, d: true, c: false, s: false };

function rankStr(r: number) {
  return r === 14 ? 'A' : r === 13 ? 'K' : r === 12 ? 'Q' : r === 11 ? 'J' : String(r);
}

function localHandValue(hand: Card[]): { value: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const c of hand) {
    if (c.rank === 14)           { total += 11; aces++; }
    else if (c.rank >= 11)       total += 10;
    else                         total += c.rank;
  }
  let softAces = aces;
  while (total > 21 && softAces > 0) { total -= 10; softAces--; }
  return { value: total, soft: softAces > 0 };
}

// ── Playing card component ────────────────────────────────────────────────────

function PlayingCard({
  card, index = 0, glow = false, shake = false,
}: {
  card: Card; index?: number; glow?: boolean; shake?: boolean;
}) {
  const sym  = SUIT_SYM[card.suit];
  const red  = SUIT_RED[card.suit];
  const rank = rankStr(card.rank);

  return (
    <motion.div
      key={`${card.rank}${card.suit}`}
      initial={{ x: -120, y: -50, opacity: 0, scale: 0.5, rotate: -15 }}
      animate={shake
        ? { x: [0, -8, 8, -6, 6, 0], rotate: 0, opacity: 1, scale: 1 }
        : { x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }
      }
      transition={{
        duration: shake ? 0.45 : 0.45,
        delay: shake ? 0 : index * 0.13,
        ease: shake ? 'easeInOut' : [0.34, 1.56, 0.64, 1],
      }}
      className="relative w-[72px] h-[104px] rounded-[9px] bg-white border border-gray-200 flex flex-col justify-between p-[5px] select-none flex-shrink-0"
      style={{
        boxShadow: glow
          ? '0 0 24px rgba(251,191,36,0.6), 0 12px 32px rgba(0,0,0,0.65)'
          : '0 8px 28px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.3)',
      }}
    >
      <div className={`text-[13px] font-black leading-none ${red ? 'text-red-600' : 'text-gray-900'}`}>
        {rank}<br />{sym}
      </div>
      <div className={`absolute inset-0 flex items-center justify-center text-[34px] font-black pointer-events-none select-none ${red ? 'text-red-100' : 'text-gray-100'}`}>
        {sym}
      </div>
      <div className={`text-[13px] font-black leading-none rotate-180 self-end ${red ? 'text-red-600' : 'text-gray-900'}`}>
        {rank}<br />{sym}
      </div>
    </motion.div>
  );
}

function CardBack({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ x: -120, y: -50, opacity: 0, scale: 0.5, rotate: -15 }}
      animate={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: 0.45, delay: index * 0.13, ease: [0.34, 1.56, 0.64, 1] }}
      className="w-[72px] h-[104px] rounded-[9px] border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0"
      style={{
        background: 'linear-gradient(145deg, #1a237e 0%, #283593 50%, #1a237e 100%)',
        boxShadow: '0 8px 28px rgba(0,0,0,0.6)',
      }}
    >
      <div
        className="w-[80%] h-[80%] border border-blue-400/30 rounded-[6px]"
        style={{
          background: 'repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(255,255,255,0.05) 3px,rgba(255,255,255,0.05) 6px)',
        }}
      />
    </motion.div>
  );
}

// Flip reveal: back rotates to edge, front rotates in from edge
function FlippingCard({ card, isHidden, index = 0, glow = false }: {
  card: Card; isHidden: boolean; index?: number; glow?: boolean;
}) {
  return (
    <div className="flex-shrink-0">
      <AnimatePresence mode="wait">
        {isHidden ? (
          <motion.div
            key="back"
            exit={{ rotateY: -90, transition: { duration: 0.18, ease: 'easeIn' } }}
          >
            <CardBack index={index} />
          </motion.div>
        ) : (
          <motion.div
            key="front"
            initial={{ rotateY: 90 }}
            animate={{ rotateY: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut', delay: 0.18 }}
          >
            <PlayingCard card={card} index={0} glow={glow} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Hand value badge ──────────────────────────────────────────────────────────

function ValueBadge({ hand }: { hand: Card[] }) {
  const { value, soft } = localHandValue(hand);
  if (hand.length === 0) return null;
  const isBust = value > 21;
  const isBJ   = hand.length === 2 && value === 21;

  return (
    <motion.div
      key={value}
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="px-3 py-1 rounded-full text-sm font-black tracking-wide"
      style={{
        background: isBust
          ? 'rgba(239,68,68,0.2)'
          : isBJ
          ? 'rgba(251,191,36,0.2)'
          : 'rgba(0,0,0,0.4)',
        border: `1px solid ${isBust ? 'rgba(239,68,68,0.4)' : isBJ ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.1)'}`,
        color: isBust ? '#f87171' : isBJ ? '#fbbf24' : '#e5e7eb',
        backdropFilter: 'blur(8px)',
      }}
    >
      {isBJ ? '🃏 21' : isBust ? `${value} BUST` : soft ? `${value} soft` : value}
    </motion.div>
  );
}

// ── Chip component ────────────────────────────────────────────────────────────

const CHIP_DEFS = [
  { value: 25,   color: '#2563eb', edge: '#60a5fa', label: '25'  },
  { value: 50,   color: '#16a34a', edge: '#4ade80', label: '50'  },
  { value: 100,  color: '#dc2626', edge: '#f87171', label: '100' },
  { value: 250,  color: '#7c3aed', edge: '#a78bfa', label: '250' },
  { value: 500,  color: '#374151', edge: '#9ca3af', label: '500' },
];

function Chip({ color, edge, label, onClick, disabled }: {
  value: number; color: string; edge: string; label: string;
  onClick: () => void; disabled?: boolean;
}) {
  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.12, y: -5 }}
      whileTap={disabled ? {} : { scale: 0.93 }}
      onClick={onClick}
      disabled={disabled}
      className="relative w-[56px] h-[56px] rounded-full flex items-center justify-center text-white font-black text-[11px] select-none"
      style={{
        background: `radial-gradient(circle at 38% 32%, color-mix(in srgb, ${color} 80%, white), ${color})`,
        border: `2.5px solid ${edge}`,
        boxShadow: disabled
          ? 'none'
          : `0 6px 18px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2), 0 0 0 1px ${color}60`,
        opacity: disabled ? 0.3 : 1,
      }}
    >
      {/* Inner ring */}
      <div className="absolute inset-[5px] rounded-full border border-white/25 pointer-events-none" />
      {/* Highlight dot */}
      <div className="absolute top-[9px] left-[12px] w-[6px] h-[4px] rounded-full bg-white/30 pointer-events-none" />
      <span style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>{label}</span>
    </motion.button>
  );
}

// ── Animated balance number ───────────────────────────────────────────────────

function AnimCounter({ value }: { value: number }) {
  const mv = useMotionValue(value);
  const display = useTransform(mv, (v) => Math.round(v).toLocaleString());

  useEffect(() => {
    const ctrl = animate(mv, value, { duration: 0.7, ease: 'easeOut' });
    return ctrl.stop;
  }, [value, mv]);

  return <motion.span>{display}</motion.span>;
}

// ── Floating result number (like poker emotes) ────────────────────────────────

function FloatingResult({ net, id }: { net: number; id: number }) {
  const isWin  = net > 0;
  const isPush = net === 0;
  const color  = isWin ? '#4ade80' : isPush ? '#94a3b8' : '#f87171';
  const glow   = isWin ? 'rgba(74,222,128,0.4)' : isPush ? 'none' : 'rgba(248,113,113,0.3)';
  const label  = isWin ? `+${net.toLocaleString()}` : isPush ? '±0' : net.toLocaleString();
  const size   = Math.abs(net) >= 500 ? 'text-3xl' : Math.abs(net) >= 100 ? 'text-2xl' : 'text-xl';

  return (
    <motion.div
      key={id}
      initial={{ opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 0, y: -72, scale: 1.15 }}
      transition={{ duration: 1.3, ease: 'easeOut' }}
      className={`absolute pointer-events-none font-black tabular-nums ${size}`}
      style={{
        color,
        textShadow: `0 0 20px ${glow}, 0 2px 4px rgba(0,0,0,0.5)`,
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 30,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </motion.div>
  );
}

// ── Streak fire ───────────────────────────────────────────────────────────────

function StreakIndicator({ streak }: { streak: number }) {
  if (streak < 2) return null;
  const tier = streak >= 7 ? 'ultra' : streak >= 5 ? 'fire' : streak >= 3 ? 'hot' : 'warm';
  const colors = {
    warm:  { glow: 'rgba(251,191,36,0.3)', text: '#fbbf24' },
    hot:   { glow: 'rgba(249,115,22,0.4)', text: '#fb923c' },
    fire:  { glow: 'rgba(239,68,68,0.5)',  text: '#f87171' },
    ultra: { glow: 'rgba(168,85,247,0.6)', text: '#c084fc' },
  }[tier];

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
      style={{
        background: 'rgba(0,0,0,0.4)',
        border: `1px solid ${colors.glow.replace('0.', '0.5')}`,
        boxShadow: `0 0 20px ${colors.glow}`,
      }}
    >
      <motion.span
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        {tier === 'ultra' ? '⚡' : '🔥'}
      </motion.span>
      <span className="font-black text-sm tabular-nums" style={{ color: colors.text }}>
        ×{streak}
      </span>
    </motion.div>
  );
}

// ── History pill ──────────────────────────────────────────────────────────────

function HistoryPill({ status }: { status: GameStatus }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    WIN:         { bg: 'rgba(16,185,129,0.25)', color: '#4ade80', label: 'W'  },
    DEALER_BUST: { bg: 'rgba(16,185,129,0.25)', color: '#4ade80', label: 'W'  },
    BLACKJACK:   { bg: 'rgba(251,191,36,0.3)',  color: '#fbbf24', label: 'BJ' },
    LOSS:        { bg: 'rgba(239,68,68,0.2)',   color: '#f87171', label: 'L'  },
    PLAYER_BUST: { bg: 'rgba(239,68,68,0.2)',   color: '#f87171', label: 'L'  },
    PUSH:        { bg: 'rgba(255,255,255,0.07)',color: '#94a3b8', label: 'P'  },
  };
  const s = map[status] ?? map.PUSH;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0, x: 8 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}30` }}
    >
      {s.label}
    </motion.div>
  );
}

// ── Action button ─────────────────────────────────────────────────────────────

function ActionBtn({
  label, sublabel, onClick, disabled, loading, color = 'neutral',
}: {
  label: string; sublabel?: string; onClick: () => void;
  disabled?: boolean; loading?: boolean; color?: 'red' | 'green' | 'blue' | 'gold' | 'neutral';
}) {
  const palettes = {
    red:     { bg: 'rgba(220,38,38,0.18)',   border: 'rgba(220,38,38,0.3)',   text: '#f87171',  glow: 'rgba(220,38,38,0.2)'  },
    green:   { bg: 'rgba(22,163,74,0.18)',   border: 'rgba(22,163,74,0.3)',   text: '#4ade80',  glow: 'rgba(22,163,74,0.2)'  },
    blue:    { bg: 'rgba(37,99,235,0.18)',   border: 'rgba(37,99,235,0.3)',   text: '#60a5fa',  glow: 'rgba(37,99,235,0.2)'  },
    gold:    { bg: 'rgba(217,119,6,0.22)',   border: 'rgba(251,191,36,0.4)',  text: '#fbbf24',  glow: 'rgba(251,191,36,0.25)' },
    neutral: { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.1)', text: '#e5e7eb',  glow: 'none'                  },
  };
  const p = palettes[color];

  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.04, boxShadow: `0 0 24px ${p.glow}` }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      onClick={onClick}
      disabled={disabled || loading}
      className="flex flex-col items-center justify-center px-8 py-3 rounded-xl font-black tracking-wide transition-opacity"
      style={{
        background: p.bg,
        border: `1px solid ${p.border}`,
        color: p.text,
        opacity: disabled ? 0.3 : 1,
        minWidth: 100,
      }}
    >
      <span className="text-base">{loading ? '…' : label}</span>
      {sublabel && <span className="text-[10px] font-medium opacity-60 mt-0.5">{sublabel}</span>}
    </motion.button>
  );
}


// ── Ambient felt particles ────────────────────────────────────────────────────

function AmbientParticles() {
  const pts = Array.from({ length: 14 }, (_, i) => ({
    id: i,
    left: `${8 + (i * 43) % 85}%`,
    delay: i * 0.9,
    dur: 10 + (i % 4) * 2.5,
    size: 1.5 + (i % 3) * 1,
    opacity: 0.06 + (i % 4) * 0.025,
  }));
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {pts.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.left, bottom: '-3%',
            width: p.size, height: p.size,
            background: `radial-gradient(circle, rgba(74,222,128,${p.opacity + 0.1}) 0%, transparent 70%)`,
          }}
          animate={{
            y: [0, -(typeof window !== 'undefined' ? window.innerHeight + 40 : 800)],
            x: [0, Math.sin(p.id) * 30],
            opacity: [0, p.opacity, p.opacity, 0],
          }}
          transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: 'linear' }}
        />
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export const BlackjackPage = () => {
  const { user, updateUser } = useAuth();

  const [balance, setBalance]         = useState(user?.balance ?? 0);
  const [betAmount, setBetAmount]     = useState(50);
  const [gameState, setGameState]     = useState<GameState | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [streak, setStreak]           = useState(0);
  const [handHistory, setHandHistory] = useState<GameStatus[]>([]);
  const [floatingResult, setFloatingResult] = useState<{ net: number; id: number } | null>(null);

  const errorTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const floatTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const status: GameStatus = gameState?.status ?? 'IDLE';
  const isPlaying          = status === 'PLAYING';
  const canDouble          = isPlaying && (gameState?.playerHand.length ?? 0) === 2 && balance >= (gameState?.originalBet ?? Infinity);
  const effectiveBet       = Math.min(betAmount, balance);
  const canDeal            = !isPlaying && effectiveBet >= 10;

  // Chip adder
  const addChip = (v: number) => {
    if (isPlaying) return;
    setBetAmount((p) => Math.min(p + v, balance));
  };
  const clearBet = () => { if (!isPlaying) setBetAmount(0); };
  const allIn    = () => { if (!isPlaying) setBetAmount(balance); };

  function showError(msg: string) {
    setError(msg);
    if (errorTimer.current) clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setError(null), 3500);
  }

  function applyResult(state: GameState) {
    setBalance(state.balance);
    updateUser({ ...user!, balance: state.balance });

    const s   = state.status as GameStatus;
    const won = s === 'WIN' || s === 'DEALER_BUST' || s === 'BLACKJACK';

    // Compute net chips for floating label
    let net = 0;
    if (s === 'BLACKJACK')              net = Math.floor(state.originalBet * 1.5);
    else if (s === 'WIN' || s === 'DEALER_BUST') net = state.bet;
    else if (s === 'PUSH')              net = 0;
    else                                net = -state.bet;

    // Show floating +/- number
    if (floatTimer.current) clearTimeout(floatTimer.current);
    setFloatingResult({ net, id: Date.now() });
    floatTimer.current = setTimeout(() => setFloatingResult(null), 1400);

    // Auto-clear table after brief pause so player can deal again fast
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => setGameState(null), 1600);

    if (won)                            setStreak((p) => p + 1);
    else if (s === 'LOSS' || s === 'PLAYER_BUST') setStreak(0);
    setHandHistory((p) => [s, ...p].slice(0, 14));
  }

  async function deal() {
    if (effectiveBet < 10) return showError('Mindesteinsatz ist 10 Chips');
    if (effectiveBet > balance) return showError('Nicht genug Guthaben');
    setLoading(true);
    try {
      const raw = await ApiService.blackjackDeal(effectiveBet) as any;
      const state: GameState = { ...raw, status: raw.status ?? 'PLAYING' };
      setGameState(state);
      setBalance(state.balance);
      updateUser({ ...user!, balance: state.balance });
      if (state.status !== 'PLAYING') applyResult(state);
    } catch (e: any) {
      showError(e.message ?? 'Austeilen fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  }

  async function hit() {
    if (!isPlaying || loading) return;
    setLoading(true);
    try {
      const raw = await ApiService.blackjackHit() as any;
      const state: GameState = { ...raw, balance: raw.balance ?? balance };
      setGameState(state);
      if (state.status !== 'PLAYING') applyResult(state);
    } catch (e: any) {
      showError(e.message ?? 'Fehler');
    } finally {
      setLoading(false);
    }
  }

  async function stand() {
    if (!isPlaying || loading) return;
    setLoading(true);
    try {
      const raw = await ApiService.blackjackStand() as any;
      const state: GameState = { ...raw, balance: raw.balance ?? balance };
      setGameState(state);
      applyResult(state);
    } catch (e: any) {
      showError(e.message ?? 'Fehler');
    } finally {
      setLoading(false);
    }
  }

  async function doubleDown() {
    if (!canDouble || loading) return;
    setLoading(true);
    try {
      const raw = await ApiService.blackjackDouble() as any;
      const state: GameState = { ...raw, balance: raw.balance ?? balance };
      setGameState(state);
      applyResult(state);
    } catch (e: any) {
      showError(e.message ?? 'Fehler');
    } finally {
      setLoading(false);
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (canDeal) deal(); }
      if (e.code === 'KeyH') hit();
      if (e.code === 'KeyS') stand();
      if (e.code === 'KeyD') doubleDown();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div
      className="min-h-screen flex flex-col overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #051a09 0%, #010a04 75%)' }}
    >
      <AmbientParticles />

      {/* ── Header ── */}
      <div
        className="shrink-0 flex items-center justify-between px-5 py-3 z-10 border-b border-white/[0.04]"
        style={{ background: 'rgba(2,8,4,0.7)', backdropFilter: 'blur(20px)' }}
      >
        {/* Left: back + title */}
        <div className="flex items-center gap-4">
          <Link
            to="/games"
            className="flex items-center gap-1.5 text-white/35 hover:text-white/75 text-xs font-medium transition-colors tracking-wide"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Zurück
          </Link>
          <div className="flex items-center gap-2">
            <span
              className="text-white/60 font-black tracking-[0.25em] text-sm uppercase"
              style={{ fontFamily: "'Georgia', serif" }}
            >
              Blackjack
            </span>
            <span className="text-white/15 text-xs">21</span>
          </div>
        </div>

        {/* Center: streak */}
        <AnimatePresence>
          {streak >= 2 && <StreakIndicator streak={streak} />}
        </AnimatePresence>

        {/* Right: balance */}
        <div
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg"
          style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.12)' }}
        >
          <div className="w-2 h-2 rounded-full bg-yellow-400/60" />
          <span className="text-yellow-300 font-black text-sm tabular-nums">
            <AnimCounter value={balance} />
          </span>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 flex items-center justify-center px-4 py-6 z-10">
        <div className="w-full max-w-2xl flex flex-col gap-0">

          {/* Felt surface */}
          <div
            className="relative rounded-[32px] overflow-hidden"
            style={{
              background: 'radial-gradient(ellipse at 50% 30%, #1a5c2a 0%, #0e3d1a 50%, #071f0d 100%)',
              boxShadow: '0 0 0 6px #0a3014, 0 0 0 10px #061a0a, 0 40px 80px rgba(0,0,0,0.9)',
              minHeight: 440,
            }}
          >
            {/* Felt noise overlay */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.06] z-0"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                backgroundSize: '120px 120px',
              }}
            />

            {/* Inner rim highlight */}
            <div
              className="absolute inset-0 rounded-[32px] pointer-events-none z-0"
              style={{ boxShadow: 'inset 0 0 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)' }}
            />

            {/* EG watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0" style={{ opacity: 0.04 }}>
              <span className="text-white font-black text-[80px] tracking-widest select-none">EG</span>
            </div>

            {/* ── Game area ── */}
            <div className="relative z-10 flex flex-col items-center justify-between py-8 px-6" style={{ minHeight: 440 }}>

              {/* Dealer zone */}
              <div className="flex flex-col items-center gap-3 w-full">
                <div className="flex items-center gap-2">
                  <span className="text-white/30 text-[10px] font-bold tracking-[0.3em] uppercase">Dealer</span>
                  {gameState && (
                    <ValueBadge
                      hand={gameState.dealerHoleHidden ? gameState.dealerHand : gameState.dealerHand}
                    />
                  )}
                </div>

                {/* Dealer cards */}
                <div className="flex gap-2 flex-wrap justify-center min-h-[104px] items-center">
                  {!gameState ? (
                    // Placeholder outlines
                    [0, 1].map((i) => (
                      <div
                        key={i}
                        className="w-[72px] h-[104px] rounded-[9px]"
                        style={{ border: '1.5px dashed rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.1)' }}
                      />
                    ))
                  ) : (
                    gameState.dealerHand.map((card, i) => (
                      <FlippingCard
                        key={`d${i}`}
                        card={card}
                        isHidden={i === 1 && gameState.dealerHoleHidden}
                        index={i}
                        glow={!gameState.dealerHoleHidden && gameState.dealerValue === 21}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Center divider */}
              <div className="relative w-full flex items-center justify-center" style={{ minHeight: 48 }}>
                {/* Divider line */}
                <div className="absolute inset-x-0 top-1/2 h-[1px]" style={{ background: 'rgba(255,255,255,0.04)' }} />

                {/* Floating +/- result */}
                <AnimatePresence>
                  {floatingResult && (
                    <FloatingResult net={floatingResult.net} id={floatingResult.id} />
                  )}
                </AnimatePresence>

                {/* Pot badge (current bet during play) */}
                {isPlaying && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="px-4 py-1.5 rounded-full flex items-center gap-2"
                    style={{
                      background: 'rgba(0,0,0,0.5)',
                      border: '1px solid rgba(251,191,36,0.2)',
                      boxShadow: '0 0 20px rgba(251,191,36,0.1)',
                    }}
                  >
                    <span className="text-yellow-400/60 text-[10px] font-bold tracking-widest uppercase">Einsatz</span>
                    <span className="text-yellow-300 font-black text-sm tabular-nums">
                      {gameState!.bet.toLocaleString()}
                      {gameState!.doubled && (
                        <span className="text-yellow-500/70 font-normal text-xs ml-1">(verdoppelt)</span>
                      )}
                    </span>
                  </motion.div>
                )}
              </div>

              {/* Player zone */}
              <div className="flex flex-col items-center gap-3 w-full">
                {/* Player cards */}
                <div className="flex gap-2 flex-wrap justify-center min-h-[104px] items-center">
                  {!gameState ? (
                    [0, 1].map((i) => (
                      <div
                        key={i}
                        className="w-[72px] h-[104px] rounded-[9px]"
                        style={{ border: '1.5px dashed rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.1)' }}
                      />
                    ))
                  ) : (
                    gameState.playerHand.map((card, i) => (
                      <PlayingCard
                        key={`p${i}`}
                        card={card}
                        index={i}
                        glow={localHandValue(gameState.playerHand).value === 21}
                        shake={status === 'PLAYER_BUST' && i === gameState.playerHand.length - 1}
                      />
                    ))
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-white/30 text-[10px] font-bold tracking-[0.3em] uppercase">Du</span>
                  {gameState && <ValueBadge hand={gameState.playerHand} />}
                </div>
              </div>
            </div>
          </div>

          {/* ── Controls ── */}
          <div
            className="rounded-b-2xl px-6 py-4 flex flex-col gap-4"
            style={{ background: 'rgba(2,8,4,0.8)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.04)', borderTop: 'none' }}
          >

            {/* Betting row */}
            {!isPlaying && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex flex-col gap-3"
              >
                {/* Bet display + chips */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-white/30 text-xs font-medium tracking-wide uppercase">Einsatz</span>
                    <motion.div
                      key={betAmount}
                      initial={{ scale: 0.85 }}
                      animate={{ scale: 1 }}
                      className="px-3 py-1 rounded-lg"
                      style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}
                    >
                      <span className="text-yellow-300 font-black text-base tabular-nums">
                        {Math.min(betAmount, balance).toLocaleString()}
                      </span>
                    </motion.div>
                    {betAmount > 0 && (
                      <button
                        onClick={clearBet}
                        className="text-white/20 hover:text-white/50 text-sm transition-colors"
                      >✕</button>
                    )}
                  </div>

                  <button
                    onClick={allIn}
                    className="px-3 py-1 rounded-lg text-red-400/70 hover:text-red-300 text-xs font-bold tracking-wide transition-colors"
                    style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.15)' }}
                  >
                    ALL IN
                  </button>
                </div>

                {/* Chips */}
                <div className="flex items-center justify-center gap-3">
                  {CHIP_DEFS.map((c) => (
                    <Chip
                      key={c.value}
                      {...c}
                      onClick={() => addChip(c.value)}
                      disabled={c.value > balance}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Deal button */}
            {!isPlaying && (
              <ActionBtn
                label={loading ? 'Austeilen…' : 'Austeilen'}
                sublabel={canDeal ? 'Leertaste / Enter' : 'Zuerst Einsatz setzen'}
                onClick={deal}
                disabled={!canDeal}
                loading={loading}
                color="gold"
              />
            )}

            {/* In-play actions */}
            {isPlaying && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-3"
              >
                <ActionBtn label="Karte"      sublabel="H" onClick={hit}       disabled={loading} color="green"   />
                <ActionBtn label="Halten"     sublabel="S" onClick={stand}     disabled={loading} color="red"     />
                <ActionBtn
                  label="Verdoppeln"
                  sublabel={canDouble ? `${gameState!.originalBet.toLocaleString()} mehr · D` : 'Zu wenig Chips'}
                  onClick={doubleDown}
                  disabled={!canDouble || loading}
                  color="blue"
                />
              </motion.div>
            )}

          </div>
        </div>
      </div>

      {/* ── Hand history ── */}
      {handHistory.length > 0 && (
        <div className="shrink-0 flex items-center justify-center gap-1.5 px-5 pb-4 z-10 flex-wrap">
          <span className="text-white/15 text-[10px] font-medium tracking-widest uppercase mr-1">Verlauf</span>
          <AnimatePresence initial={false}>
            {handHistory.map((s, i) => (
              <HistoryPill key={`${s}-${i}`} status={s} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Error toast ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl text-red-200 text-xs font-semibold"
            style={{
              background: 'rgba(220,38,38,0.18)',
              border: '1px solid rgba(220,38,38,0.3)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 0 20px rgba(220,38,38,0.15)',
            }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Rules panel (bottom strip) ── */}
      <div className="shrink-0 flex items-center justify-center gap-6 px-5 py-2 border-t border-white/[0.03] z-10">
        {[
          ['Blackjack', '3:2'],
          ['Gewinn', '1:1'],
          ['Dealer hält', '17+'],
        ].map(([label, rule]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="text-white/15 text-[9px] font-medium tracking-wide uppercase">{label}</span>
            <span className="text-white/30 text-[9px] font-black">{rule}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
