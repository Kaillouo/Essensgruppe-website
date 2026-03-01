import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { useGuest } from '../contexts/GuestContext';

type GamePhase = 'idle' | 'playing' | 'won' | 'lost';
type TileState = 'unrevealed' | 'safe' | 'mine-hit' | 'mine-revealed';

function localMultiplier(mineCount: number, safeRevealed: number): number {
  const total = 25;
  let m = 0.95;
  for (let i = 0; i < safeRevealed; i++) {
    m *= (total - i) / (total - mineCount - i);
  }
  return m;
}

function AnimCounter({ value }: { value: number }) {
  const mv = useMotionValue(value);
  const display = useTransform(mv, (v) => Math.round(v).toLocaleString());
  useEffect(() => {
    const ctrl = animate(mv, value, { duration: 0.7, ease: 'easeOut' });
    return ctrl.stop;
  }, [value, mv]);
  return <motion.span>{display}</motion.span>;
}

function ActionBtn({ label, sublabel, onClick, disabled, loading, color = 'neutral', fullWidth = false }: {
  label: string; sublabel?: string; onClick: () => void;
  disabled?: boolean; loading?: boolean;
  color?: 'red' | 'green' | 'blue' | 'gold' | 'neutral'; fullWidth?: boolean;
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
      whileHover={disabled ? {} : { scale: 1.03, boxShadow: `0 0 20px ${p.glow}` }}
      whileTap={disabled ? {} : { scale: 0.96 }}
      onClick={onClick} disabled={disabled || loading}
      className={`flex flex-col items-center justify-center px-4 py-3 rounded-xl font-black tracking-wide transition-opacity ${fullWidth ? 'w-full' : ''}`}
      style={{ background: p.bg, border: `1px solid ${p.border}`, color: p.text, opacity: disabled ? 0.35 : 1 }}
    >
      <span className="text-sm">{loading ? '…' : label}</span>
      {sublabel && <span className="text-[10px] font-medium opacity-55 mt-0.5">{sublabel}</span>}
    </motion.button>
  );
}

function MinesTile({ index, tileState, onClick, isRevealing }: {
  index: number; tileState: TileState; onClick: () => void; isRevealing: boolean;
}) {
  const isClickable = tileState === 'unrevealed';
  const bgColor = { unrevealed: 'rgba(255,255,255,0.04)', safe: 'rgba(16,185,129,0.15)', 'mine-hit': 'rgba(239,68,68,0.25)', 'mine-revealed': 'rgba(251,146,60,0.10)' }[tileState];
  const borderColor = { unrevealed: 'rgba(255,255,255,0.08)', safe: 'rgba(16,185,129,0.4)', 'mine-hit': 'rgba(239,68,68,0.5)', 'mine-revealed': 'rgba(251,146,60,0.22)' }[tileState];
  const glow = { unrevealed: 'none', safe: '0 0 14px rgba(16,185,129,0.22)', 'mine-hit': '0 0 22px rgba(239,68,68,0.35)', 'mine-revealed': 'none' }[tileState];

  return (
    <motion.button
      onClick={onClick} disabled={!isClickable}
      className="relative aspect-square rounded-xl flex items-center justify-center select-none overflow-hidden"
      style={{ background: bgColor, border: `1px solid ${borderColor}`, boxShadow: glow, cursor: isClickable ? 'pointer' : 'default' }}
      whileHover={isClickable ? { scale: 1.06, borderColor: 'rgba(255,255,255,0.22)' } : {}}
      whileTap={isClickable ? { scale: 0.92 } : {}}
      animate={isRevealing ? { scale: [1, 0.88, 1] } : {}}
      transition={{ duration: 0.15 }}
    >
      <AnimatePresence mode="wait">
        {tileState === 'safe' && (
          <motion.span key="gem" initial={{ scale: 0, rotate: -25 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 440, damping: 18 }} className="text-2xl leading-none">💎</motion.span>
        )}
        {tileState === 'mine-hit' && (
          <motion.span key="explosion" initial={{ scale: 0 }} animate={{ scale: [0, 1.4, 1], rotate: [0, 12, -8, 0] }} transition={{ duration: 0.38 }} className="text-2xl leading-none">💥</motion.span>
        )}
        {tileState === 'mine-revealed' && (
          <motion.span key="mine" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.22, delay: (index % 7) * 0.04 }} className="text-xl leading-none opacity-55">💣</motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function MineCountPicker({ value, onChange, disabled }: { value: number; onChange: (n: number) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);
  return (
    <div ref={ref} className="flex flex-col gap-1.5">
      <span className="text-white/40 text-[10px] font-medium tracking-widest uppercase">Minen</span>
      <button onClick={() => { if (!disabled) setOpen((o) => !o); }} disabled={disabled}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-white font-black text-sm disabled:opacity-40 transition-colors"
        style={{ background: open ? 'rgba(220,38,38,0.12)' : 'rgba(255,255,255,0.05)', border: open ? '1px solid rgba(220,38,38,0.35)' : '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="flex items-center gap-2"><span className="text-base leading-none">💣</span><span>{value} {value === 1 ? 'Mine' : 'Minen'}</span></div>
        <motion.svg animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="w-3.5 h-3.5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0, y: -6 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -6 }} transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden rounded-xl" style={{ background: 'rgba(20,4,4,0.95)', border: '1px solid rgba(220,38,38,0.2)' }}
          >
            <div className="grid grid-cols-6 gap-1 p-2">
              {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => {
                const selected = n === value;
                return (
                  <motion.button key={n} onClick={() => { onChange(n); setOpen(false); }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    className="aspect-square flex items-center justify-center rounded-lg text-xs font-black transition-colors"
                    style={{ background: selected ? 'rgba(220,38,38,0.35)' : 'rgba(255,255,255,0.04)', border: selected ? '1px solid rgba(220,38,38,0.5)' : '1px solid rgba(255,255,255,0.06)', color: selected ? '#f87171' : 'rgba(255,255,255,0.5)', boxShadow: selected ? '0 0 10px rgba(220,38,38,0.2)' : 'none' }}
                  >{n}</motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── API helper ─────────────────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL || '/api';

async function guestPost(endpoint: string, guestId: string, body?: object) {
  const res = await fetch(`${API_URL}/guest${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-guest-id': guestId },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Fehler');
  return data;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export const GuestMinesPage = () => {
  const { guestId, balance, setBalance } = useGuest();

  const [phase, setPhase]           = useState<GamePhase>('idle');
  const [mineCount, setMineCount]   = useState(3);
  const [betAmount, setBetAmount]   = useState(100);
  const [tiles, setTiles]           = useState<TileState[]>(Array(25).fill('unrevealed'));
  const [revealingIdx, setRevIdx]   = useState<number | null>(null);
  const [multiplier, setMultiplier] = useState(0.95);
  const [currentPayout, setPayout]  = useState(0);
  const [, setMinePosns] = useState<number[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const errRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const maxSafe = 25 - mineCount;
  const safeRevealed = tiles.filter((t) => t === 'safe').length;
  const nextMultiplier = safeRevealed < maxSafe ? localMultiplier(mineCount, safeRevealed + 1) : multiplier;
  const nextPayout = Math.floor(betAmount * nextMultiplier);

  function showError(msg: string) {
    setError(msg);
    if (errRef.current) clearTimeout(errRef.current);
    errRef.current = setTimeout(() => setError(null), 3000);
  }

  function applyMineReveal(minePositions: number[], hitIndex: number | null) {
    setTiles((prev) => prev.map((t, i) => {
      if (t === 'safe') return 'safe';
      if (i === hitIndex) return 'mine-hit';
      if (minePositions.includes(i)) return 'mine-revealed';
      return t;
    }));
    setMinePosns(minePositions);
  }

  async function startGame() {
    if (balance < betAmount) return showError('Nicht genug Sitzungsguthaben.');
    setLoading(true);
    try {
      const data = await guestPost('/mines/start', guestId, { bet: betAmount, mineCount });
      setBalance(data.balance);
      setTiles(Array(25).fill('unrevealed'));
      setMultiplier(data.multiplier);
      setPayout(data.currentPayout);
      setMinePosns([]);
      setPhase('playing');
    } catch (e: any) {
      showError(e.message ?? 'Fehler beim Starten');
    } finally {
      setLoading(false);
    }
  }

  async function revealTile(index: number) {
    if (phase !== 'playing' || tiles[index] !== 'unrevealed' || loading) return;
    setRevIdx(index);
    setLoading(true);
    try {
      const data = await guestPost('/mines/reveal', guestId, { cellIndex: index });
      setRevIdx(null);

      if (data.isMine) {
        applyMineReveal(data.minePositions, index);
        setPhase('lost');
        setBalance(data.balance);
      } else {
        setTiles((prev) => prev.map((t, i) => i === index ? 'safe' : t));
        setMultiplier(data.multiplier);
        setPayout(data.currentPayout);
        if (data.status === 'WON') {
          setBalance(data.balance);
          applyMineReveal(data.minePositions, null);
          setPhase('won');
        }
      }
    } catch (e: any) {
      setRevIdx(null);
      showError(e.message ?? 'Fehler');
    } finally {
      setLoading(false);
    }
  }

  async function cashout() {
    if (phase !== 'playing' || safeRevealed === 0 || loading) return;
    setLoading(true);
    try {
      const data = await guestPost('/mines/cashout', guestId);
      setBalance(data.balance);
      applyMineReveal(data.minePositions, null);
      setMultiplier(data.multiplier);
      setPayout(data.payout);
      setPhase('won');
    } catch (e: any) {
      showError(e.message ?? 'Fehler beim Auszahlen');
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setPhase('idle');
    setTiles(Array(25).fill('unrevealed'));
    setMultiplier(0.95);
    setPayout(0);
    setMinePosns([]);
    setError(null);
  }

  const BET_OPTIONS = [50, 100, 250, 500, 1000];

  return (
    <div className="min-h-screen flex flex-col overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 0%,#150505 0%,#060204 75%)' }}
    >
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3 z-10 border-b border-white/[0.04]"
        style={{ background: 'rgba(6,2,4,0.7)', backdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-center gap-4">
          <Link to="/games/guest" className="flex items-center gap-1.5 text-white/35 hover:text-white/75 text-xs font-medium transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Zurück
          </Link>
          <span className="text-red-300 font-black tracking-[0.25em] text-sm uppercase">Mines</span>
          <span className="px-2 py-0.5 rounded-full bg-violet-900/40 border border-violet-700/40 text-violet-300 text-[10px] font-semibold">Gastmodus</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg" style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.12)' }}>
          <div className="w-2 h-2 rounded-full bg-yellow-400/60" />
          <span className="text-yellow-300 font-black text-sm tabular-nums"><AnimCounter value={balance} /></span>
        </div>
      </div>

      {/* Layout */}
      <div className="flex-1 flex flex-col lg:flex-row items-start justify-center gap-6 px-4 py-6 max-w-5xl mx-auto w-full z-10">

        {/* Grid (top on mobile, right on desktop) */}
        <div className="w-full lg:flex-1 order-1 lg:order-2">
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(5,1fr)', maxWidth: 440, margin: '0 auto' }}>
            {tiles.map((tileState, i) => (
              <MinesTile
                key={i} index={i} tileState={tileState}
                onClick={() => revealTile(i)}
                isRevealing={revealingIdx === i}
              />
            ))}
          </div>
        </div>

        {/* Controls (bottom on mobile, left on desktop) */}
        <div className="w-full lg:w-64 shrink-0 order-2 lg:order-1 flex flex-col gap-4">

          {/* Mine picker */}
          <MineCountPicker value={mineCount} onChange={setMineCount} disabled={phase === 'playing'} />

          {/* Bet */}
          <div className="flex flex-col gap-1.5">
            <span className="text-white/40 text-[10px] font-medium tracking-widest uppercase">Einsatz</span>
            <div className="grid grid-cols-3 gap-1.5">
              {BET_OPTIONS.map((v) => (
                <button key={v} onClick={() => { if (phase !== 'playing') setBetAmount(v); }}
                  disabled={phase === 'playing' || v > balance}
                  className="py-2 rounded-xl text-xs font-bold transition-colors"
                  style={{
                    background: betAmount === v ? 'rgba(220,38,38,0.18)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${betAmount === v ? 'rgba(220,38,38,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    color: betAmount === v ? '#f87171' : v > balance ? '#374151' : 'rgba(255,255,255,0.45)',
                    opacity: phase === 'playing' ? 0.4 : 1,
                  }}
                >{v}</button>
              ))}
            </div>
          </div>

          {/* Multiplier info (playing state) */}
          {phase === 'playing' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl px-4 py-3 flex flex-col gap-2"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Multiplikator</span>
                <span className="font-black text-emerald-400">{multiplier.toFixed(2)}×</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Nächstes Feld</span>
                <span className="font-black text-white/70">{nextMultiplier.toFixed(2)}× → {nextPayout.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Auszahlung</span>
                <span className="font-black text-yellow-300 tabular-nums">{currentPayout.toLocaleString()}</span>
              </div>
            </motion.div>
          )}

          {/* Action buttons */}
          {phase === 'idle' && (
            <ActionBtn label={loading ? 'Starten…' : 'Spiel starten'} onClick={startGame} disabled={loading || balance < betAmount} loading={loading} color="red" fullWidth />
          )}
          {phase === 'playing' && (
            <ActionBtn label={`Auszahlen · ${currentPayout.toLocaleString()}`} sublabel={safeRevealed === 0 ? 'Erst ein Feld aufdecken' : undefined} onClick={cashout} disabled={safeRevealed === 0 || loading} color="green" fullWidth />
          )}
          {(phase === 'won' || phase === 'lost') && (
            <div className="flex flex-col gap-2">
              <div className={`rounded-xl px-4 py-3 text-center ${phase === 'won' ? 'bg-emerald-900/20 border border-emerald-700/30' : 'bg-red-900/20 border border-red-700/30'}`}>
                <p className={`text-lg font-black ${phase === 'won' ? 'text-emerald-300' : 'text-red-300'}`}>
                  {phase === 'won' ? `+${currentPayout.toLocaleString()} 🎉` : 'MINE! 💥'}
                </p>
              </div>
              <ActionBtn label="Neues Spiel" onClick={reset} color="neutral" fullWidth />
            </div>
          )}

          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs text-center">{error}</motion.p>
          )}
        </div>
      </div>
    </div>
  );
};
