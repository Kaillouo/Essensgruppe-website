import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { ApiService } from '../services/api.service';

// ── Types ─────────────────────────────────────────────────────────────────────

type GamePhase = 'idle' | 'playing' | 'won' | 'lost';
type TileState = 'unrevealed' | 'safe' | 'mine-hit' | 'mine-revealed';

// ── Local multiplier formula (mirrors backend, used for "next tile" preview) ──

function localMultiplier(mineCount: number, safeRevealed: number): number {
  const total = 25;
  let m = 0.95;
  for (let i = 0; i < safeRevealed; i++) {
    m *= (total - i) / (total - mineCount - i);
  }
  return m;
}

// ── Animated balance counter ──────────────────────────────────────────────────

function AnimCounter({ value }: { value: number }) {
  const mv = useMotionValue(value);
  const display = useTransform(mv, (v) => Math.round(v).toLocaleString());
  useEffect(() => {
    const ctrl = animate(mv, value, { duration: 0.7, ease: 'easeOut' });
    return ctrl.stop;
  }, [value, mv]);
  return <motion.span>{display}</motion.span>;
}

// ── Action button ─────────────────────────────────────────────────────────────

function ActionBtn({
  label, sublabel, onClick, disabled, loading, color = 'neutral', fullWidth = false,
}: {
  label: string; sublabel?: string; onClick: () => void;
  disabled?: boolean; loading?: boolean;
  color?: 'red' | 'green' | 'blue' | 'gold' | 'neutral';
  fullWidth?: boolean;
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
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex flex-col items-center justify-center px-4 py-3 rounded-xl font-black tracking-wide transition-opacity ${fullWidth ? 'w-full' : ''}`}
      style={{
        background: p.bg,
        border: `1px solid ${p.border}`,
        color: p.text,
        opacity: disabled ? 0.35 : 1,
      }}
    >
      <span className="text-sm">{loading ? '…' : label}</span>
      {sublabel && <span className="text-[10px] font-medium opacity-55 mt-0.5">{sublabel}</span>}
    </motion.button>
  );
}

// ── Custom mine-count fold-down picker ────────────────────────────────────────

function MineCountPicker({ value, onChange, disabled }: {
  value: number;
  onChange: (n: number) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="flex flex-col gap-1.5">
      <span className="text-white/40 text-[10px] font-medium tracking-widest uppercase">Minen</span>

      {/* Trigger */}
      <button
        onClick={() => { if (!disabled) setOpen((o) => !o); }}
        disabled={disabled}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-white font-black text-sm disabled:opacity-40 transition-colors"
        style={{
          background: open ? 'rgba(220,38,38,0.12)' : 'rgba(255,255,255,0.05)',
          border: open ? '1px solid rgba(220,38,38,0.35)' : '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">💣</span>
          <span>{value} {value === 1 ? 'Mine' : 'Minen'}</span>
        </div>
        <motion.svg
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-3.5 h-3.5 text-white/30"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      {/* Fold-down grid */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -6 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -6 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden rounded-xl"
            style={{
              background: 'rgba(20,4,4,0.95)',
              border: '1px solid rgba(220,38,38,0.2)',
            }}
          >
            <div className="grid grid-cols-6 gap-1 p-2">
              {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => {
                const selected = n === value;
                return (
                  <motion.button
                    key={n}
                    onClick={() => { onChange(n); setOpen(false); }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="aspect-square flex items-center justify-center rounded-lg text-xs font-black transition-colors"
                    style={{
                      background: selected ? 'rgba(220,38,38,0.35)' : 'rgba(255,255,255,0.04)',
                      border: selected ? '1px solid rgba(220,38,38,0.5)' : '1px solid rgba(255,255,255,0.06)',
                      color: selected ? '#f87171' : 'rgba(255,255,255,0.5)',
                      boxShadow: selected ? '0 0 10px rgba(220,38,38,0.2)' : 'none',
                    }}
                  >
                    {n}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Ambient particles ─────────────────────────────────────────────────────────

function AmbientParticles() {
  const pts = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    left: `${10 + (i * 47) % 82}%`,
    delay: i * 1.1,
    dur: 11 + (i % 4) * 2.5,
    size: 1.5 + (i % 3) * 1,
    opacity: 0.05 + (i % 4) * 0.02,
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
            background: `radial-gradient(circle, rgba(239,68,68,${p.opacity + 0.08}) 0%, transparent 70%)`,
          }}
          animate={{
            y: [0, -(typeof window !== 'undefined' ? window.innerHeight + 40 : 800)],
            x: [0, Math.sin(p.id) * 25],
            opacity: [0, p.opacity, p.opacity, 0],
          }}
          transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: 'linear' }}
        />
      ))}
    </div>
  );
}

// ── Single tile ───────────────────────────────────────────────────────────────

function MinesTile({
  index, tileState, onClick, isRevealing,
}: {
  index: number;
  tileState: TileState;
  onClick: () => void;
  isRevealing: boolean;
}) {
  const isClickable = tileState === 'unrevealed';

  const bgColor = {
    unrevealed:      'rgba(255,255,255,0.04)',
    safe:            'rgba(16,185,129,0.15)',
    'mine-hit':      'rgba(239,68,68,0.25)',
    'mine-revealed': 'rgba(251,146,60,0.10)',
  }[tileState];

  const borderColor = {
    unrevealed:      'rgba(255,255,255,0.08)',
    safe:            'rgba(16,185,129,0.4)',
    'mine-hit':      'rgba(239,68,68,0.5)',
    'mine-revealed': 'rgba(251,146,60,0.22)',
  }[tileState];

  const glow = {
    unrevealed:      'none',
    safe:            '0 0 14px rgba(16,185,129,0.22)',
    'mine-hit':      '0 0 22px rgba(239,68,68,0.35)',
    'mine-revealed': 'none',
  }[tileState];

  return (
    <motion.button
      onClick={onClick}
      disabled={!isClickable}
      className="relative aspect-square rounded-xl flex items-center justify-center select-none overflow-hidden"
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        boxShadow: glow,
        cursor: isClickable ? 'pointer' : 'default',
      }}
      whileHover={isClickable ? { scale: 1.06, borderColor: 'rgba(255,255,255,0.22)' } : {}}
      whileTap={isClickable ? { scale: 0.92 } : {}}
      animate={isRevealing ? { scale: [1, 0.88, 1] } : {}}
      transition={{ duration: 0.15 }}
    >
      <AnimatePresence mode="wait">
        {tileState === 'safe' && (
          <motion.span
            key="gem"
            initial={{ scale: 0, rotate: -25 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 440, damping: 18 }}
            className="text-2xl leading-none"
          >
            💎
          </motion.span>
        )}
        {tileState === 'mine-hit' && (
          <motion.span
            key="explosion"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.4, 1], rotate: [0, 12, -8, 0] }}
            transition={{ duration: 0.38 }}
            className="text-2xl leading-none"
          >
            💥
          </motion.span>
        )}
        {tileState === 'mine-revealed' && (
          <motion.span
            key="mine"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.22, delay: (index % 7) * 0.04 }}
            className="text-xl leading-none opacity-55"
          >
            💣
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// ── Controls panel — shared between desktop (left) and mobile (bottom) ────────

function ControlsPanel({
  phase, bet, setBet, mineCount, setMineCount,
  balance, multiplier, currentPayout, winAmount,
  nextTileDelta, cashoutDisabled, loading,
  onStart, onReset, onCashout,
  mobile,
}: {
  phase: GamePhase;
  bet: number; setBet: (n: number) => void;
  mineCount: number; setMineCount: (n: number) => void;
  balance: number;
  multiplier: number; currentPayout: number; winAmount: number;
  nextTileDelta: number | null;
  cashoutDisabled: boolean; loading: boolean;
  onStart: () => void; onReset: () => void; onCashout: () => void;
  mobile: boolean;
}) {
  const isPlaying = phase === 'playing';

  if (mobile) {
    // ── Mobile bottom panel ──────────────────────────────────────────────────
    return (
      <div
        className="shrink-0 flex flex-col gap-3 px-4 pt-3 pb-4 z-10 border-t border-white/[0.04]"
        style={{ background: 'rgba(5,1,1,0.92)', backdropFilter: 'blur(16px)' }}
      >
        {/* Config row (bet + mines) — hidden while playing */}
        {!isPlaying && (
          <div className="flex gap-3">
            {/* Bet */}
            <div className="flex-1 flex flex-col gap-1.5">
              <span className="text-white/40 text-[10px] font-medium tracking-widest uppercase">Einsatz</span>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  value={bet}
                  onChange={(e) => setBet(Math.max(10, Math.min(50000, parseInt(e.target.value) || 10)))}
                  min={10} max={50000} step={10}
                  className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-black text-sm focus:outline-none focus:border-red-500/40 tabular-nums"
                />
                <button
                  onClick={() => setBet(Math.max(10, Math.floor(balance / 2)))}
                  className="px-2.5 py-2 rounded-xl text-[10px] text-white/50 hover:text-white/80 bg-white/5 border border-white/[0.06] font-semibold"
                >
                  ½
                </button>
                <button
                  onClick={() => setBet(Math.max(10, balance))}
                  className="px-2.5 py-2 rounded-xl text-[10px] text-white/50 hover:text-white/80 bg-white/5 border border-white/[0.06] font-semibold"
                >
                  Max
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mine picker — hidden while playing */}
        {!isPlaying && (
          <MineCountPicker value={mineCount} onChange={setMineCount} disabled={isPlaying} />
        )}

        {/* Stats row — visible while playing */}
        {phase !== 'idle' && (
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-0">
              <span className="text-white/30 text-[9px] font-medium tracking-widest uppercase">Multi</span>
              <motion.span key={multiplier} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-white font-black text-base tabular-nums">
                {multiplier.toFixed(2)}×
              </motion.span>
            </div>
            {nextTileDelta !== null && (
              <div className="flex flex-col gap-0">
                <span className="text-white/30 text-[9px] font-medium tracking-widest uppercase">Nächste</span>
                <span className="text-emerald-400/70 font-bold text-sm tabular-nums">+{nextTileDelta.toFixed(3)}×</span>
              </div>
            )}
            <div className="flex flex-col gap-0 ml-auto text-right">
              <span className="text-white/30 text-[9px] font-medium tracking-widest uppercase">Gewinn</span>
              <motion.span key={currentPayout} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-yellow-300 font-black text-base tabular-nums">
                {phase === 'won' ? winAmount.toLocaleString() : currentPayout.toLocaleString()} 🪙
              </motion.span>
            </div>
          </div>
        )}

        {/* Action button */}
        {(phase === 'idle' || phase === 'won' || phase === 'lost') && (
          <ActionBtn
            label={phase === 'idle' ? 'Spiel starten' : 'Nochmal spielen'}
            onClick={phase === 'idle' ? onStart : onReset}
            disabled={loading} loading={loading && phase === 'idle'}
            color="red" fullWidth
          />
        )}
        {phase === 'playing' && (
          <ActionBtn
            label="Auszahlen"
            sublabel={cashoutDisabled ? 'Erst ein Feld aufdecken' : `${currentPayout.toLocaleString()} Coins`}
            onClick={onCashout}
            disabled={cashoutDisabled} loading={loading}
            color="green" fullWidth
          />
        )}
      </div>
    );
  }

  // ── Desktop left panel ───────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col gap-4 p-5 h-full border-r border-white/[0.04]"
      style={{ background: 'rgba(5,1,1,0.6)', backdropFilter: 'blur(16px)' }}
    >
      {/* Bet */}
      <div className="flex flex-col gap-2">
        <label className="text-white/40 text-[10px] font-medium tracking-widest uppercase">Einsatz</label>
        <input
          type="number"
          value={bet}
          onChange={(e) => setBet(Math.max(10, Math.min(50000, parseInt(e.target.value) || 10)))}
          disabled={isPlaying}
          min={10} max={50000} step={10}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-black text-sm disabled:opacity-40 focus:outline-none focus:border-red-500/40 tabular-nums"
        />
        <div className="flex gap-2">
          <button
            onClick={() => setBet(Math.max(10, Math.floor(balance / 2)))}
            disabled={isPlaying}
            className="flex-1 py-1.5 rounded-lg text-[10px] text-white/50 hover:text-white/80 bg-white/5 border border-white/[0.06] hover:bg-white/8 disabled:opacity-30 transition-colors font-semibold tracking-wide"
          >
            Halb
          </button>
          <button
            onClick={() => setBet(Math.max(10, balance))}
            disabled={isPlaying}
            className="flex-1 py-1.5 rounded-lg text-[10px] text-white/50 hover:text-white/80 bg-white/5 border border-white/[0.06] hover:bg-white/8 disabled:opacity-30 transition-colors font-semibold tracking-wide"
          >
            Max
          </button>
        </div>
      </div>

      {/* Mine count picker */}
      <MineCountPicker value={mineCount} onChange={setMineCount} disabled={isPlaying} />

      {/* Stats */}
      <AnimatePresence>
        {phase !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col gap-3 overflow-hidden"
          >
            <div className="h-px bg-white/[0.06]" />

            <div className="flex flex-col gap-0.5">
              <span className="text-white/30 text-[10px] font-medium tracking-widest uppercase">Multiplikator</span>
              <motion.span key={multiplier} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="text-white font-black text-xl tabular-nums">
                {multiplier.toFixed(2)}×
              </motion.span>
            </div>

            {nextTileDelta !== null && (
              <div className="flex flex-col gap-0.5">
                <span className="text-white/30 text-[10px] font-medium tracking-widest uppercase">Nächste Kachel</span>
                <span className="text-emerald-400/70 font-bold text-sm tabular-nums">
                  +{nextTileDelta.toFixed(3)}×
                </span>
              </div>
            )}

            <div className="flex flex-col gap-0.5">
              <span className="text-white/30 text-[10px] font-medium tracking-widest uppercase">Gewinn</span>
              <motion.span key={currentPayout} initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="text-yellow-300 font-black text-lg tabular-nums">
                {currentPayout.toLocaleString()} 🪙
              </motion.span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1" />

      {(phase === 'idle' || phase === 'won' || phase === 'lost') && (
        <ActionBtn
          label={phase === 'idle' ? 'Spiel starten' : 'Nochmal spielen'}
          onClick={phase === 'idle' ? onStart : onReset}
          disabled={loading} loading={loading && phase === 'idle'}
          color="red" fullWidth
        />
      )}
      {phase === 'playing' && (
        <ActionBtn
          label="Auszahlen"
          sublabel={cashoutDisabled ? 'Erst ein Feld aufdecken' : `${currentPayout.toLocaleString()} Coins`}
          onClick={onCashout}
          disabled={cashoutDisabled} loading={loading}
          color="green" fullWidth
        />
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export const MinesPage = () => {
  const { user, updateUser } = useAuth();

  const [bet, setBet]             = useState(100);
  const [mineCount, setMineCount] = useState(3);

  const [phase, setPhase]               = useState<GamePhase>('idle');
  const [revealedSafe, setRevealedSafe] = useState<number[]>([]);
  const [minePositions, setMinePositions] = useState<number[]>([]);
  const [hitMine, setHitMine]           = useState<number | null>(null);
  const [multiplier, setMultiplier]     = useState(0.95);
  const [currentPayout, setCurrentPayout] = useState(0);
  const [balance, setBalance]           = useState(user?.balance ?? 0);

  const [revealingCell, setRevealingCell] = useState<number | null>(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [winAmount, setWinAmount]       = useState(0);

  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { if (user) setBalance(user.balance); }, [user?.balance]);

  function showError(msg: string) {
    setError(msg);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setError(''), 3500);
  }

  function getTileState(i: number): TileState {
    if (revealedSafe.includes(i)) return 'safe';
    if (hitMine === i) return 'mine-hit';
    if (minePositions.includes(i)) return 'mine-revealed';
    return 'unrevealed';
  }

  const maxSafe = 25 - mineCount;
  const canShowNextTile = phase === 'playing' && revealedSafe.length < maxSafe;
  const nextMultiplier  = canShowNextTile ? localMultiplier(mineCount, revealedSafe.length + 1) : null;
  const nextTileDelta   = nextMultiplier !== null ? nextMultiplier - multiplier : null;

  async function handleStart() {
    if (loading || phase === 'playing') return;
    if (bet < 10) return showError('Mindesteinsatz ist 10 Coins');
    if (bet > balance) return showError('Nicht genug Guthaben');
    setLoading(true);
    try {
      const res = await ApiService.startMines(bet, mineCount);
      setRevealedSafe([]); setMinePositions([]); setHitMine(null);
      setMultiplier(res.multiplier); setCurrentPayout(res.currentPayout);
      setBalance(res.balance); updateUser({ ...user!, balance: res.balance });
      setPhase('playing');
    } catch (e: any) { showError(e.message ?? 'Spiel konnte nicht gestartet werden'); }
    finally { setLoading(false); }
  }

  async function handleReveal(cellIndex: number) {
    if (phase !== 'playing' || revealingCell !== null) return;
    if (revealedSafe.includes(cellIndex) || minePositions.includes(cellIndex)) return;
    setRevealingCell(cellIndex);
    try {
      const res = await ApiService.revealMines(cellIndex);
      setRevealedSafe(res.revealedSafe);
      setMultiplier(res.multiplier);
      setCurrentPayout(res.currentPayout);
      if (res.isMine) {
        setHitMine(cellIndex);
        setMinePositions(res.minePositions ?? []);
        setPhase('lost');
      } else if (res.status === 'WON') {
        setMinePositions(res.minePositions ?? []);
        setWinAmount(res.currentPayout);
        setBalance(res.balance!); updateUser({ ...user!, balance: res.balance! });
        setPhase('won');
      }
    } catch (e: any) { showError(e.message ?? 'Fehler beim Aufdecken'); }
    finally { setRevealingCell(null); }
  }

  async function handleCashout() {
    if (phase !== 'playing' || revealedSafe.length === 0 || loading) return;
    setLoading(true);
    try {
      const res = await ApiService.cashoutMines();
      setMinePositions(res.minePositions); setRevealedSafe(res.revealedSafe);
      setMultiplier(res.multiplier); setCurrentPayout(res.payout); setWinAmount(res.payout);
      setBalance(res.balance); updateUser({ ...user!, balance: res.balance });
      setPhase('won');
    } catch (e: any) { showError(e.message ?? 'Auszahlung fehlgeschlagen'); }
    finally { setLoading(false); }
  }

  function handleReset() {
    setPhase('idle'); setRevealedSafe([]); setMinePositions([]);
    setHitMine(null); setMultiplier(0.95); setCurrentPayout(0);
    setWinAmount(0); setRevealingCell(null);
  }

  const cashoutDisabled = revealedSafe.length === 0 || loading;

  const sharedControlProps = {
    phase, bet, setBet, mineCount, setMineCount, balance,
    multiplier, currentPayout, winAmount, nextTileDelta,
    cashoutDisabled, loading,
    onStart: handleStart, onReset: handleReset, onCashout: handleCashout,
  };

  // ── Grid section shared between both layouts ──────────────────────────────
  const gridSection = (
    <div className="flex items-center justify-center w-full h-full p-3 md:p-6">
      <div className="w-full max-w-[260px] md:max-w-[540px] flex flex-col gap-3 md:gap-4">

        {/* Result banner */}
        <AnimatePresence>
          {(phase === 'won' || phase === 'lost') && (
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              {phase === 'won' && (
                <div className="text-emerald-400 font-black text-lg md:text-2xl"
                  style={{ textShadow: '0 0 20px rgba(52,211,153,0.5)' }}>
                  Gewonnen! +{winAmount.toLocaleString()} 🪙
                </div>
              )}
              {phase === 'lost' && (
                <div className="text-red-400 font-black text-lg md:text-2xl"
                  style={{ textShadow: '0 0 20px rgba(248,113,113,0.5)' }}>
                  Mine getroffen! −{bet.toLocaleString()} 🪙
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 5×5 grid */}
        <motion.div
          className="grid grid-cols-5 gap-1.5 md:gap-2"
          animate={phase === 'lost' ? { x: [0, -7, 7, -5, 5, -3, 3, 0] } : {}}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        >
          {Array.from({ length: 25 }, (_, i) => (
            <MinesTile
              key={i}
              index={i}
              tileState={getTileState(i)}
              onClick={() => handleReveal(i)}
              isRevealing={revealingCell === i}
            />
          ))}
        </motion.div>

        {phase === 'idle' && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center text-white/20 text-xs font-medium">
            Einsatz & Minen wählen, dann Spiel starten
          </motion.p>
        )}
      </div>
    </div>
  );

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1a0505 0%, #050101 75%)' }}
    >
      <AmbientParticles />

      {/* ── Header ── */}
      <div
        className="shrink-0 flex items-center justify-between px-5 py-3 z-10 border-b border-white/[0.04]"
        style={{ background: 'rgba(8,2,2,0.7)', backdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-center gap-4">
          <Link to="/games"
            className="flex items-center gap-1.5 text-white/35 hover:text-white/75 text-xs font-medium transition-colors tracking-wide">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Zurück
          </Link>
          <span className="text-white/60 font-black tracking-[0.25em] text-sm uppercase">Mines</span>
        </div>

        <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg"
          style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.12)' }}>
          <div className="w-2 h-2 rounded-full bg-yellow-400/60" />
          <span className="text-yellow-300 font-black text-sm tabular-nums">
            <AnimCounter value={balance} />
          </span>
        </div>
      </div>

      {/* ── Body: desktop side-by-side, mobile stacked ── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 z-10">

        {/* Grid — order-1 on mobile (top), order-2 on desktop (right) */}
        <div className="order-1 md:order-2 flex-1 min-h-0 overflow-hidden">
          {gridSection}
        </div>

        {/* Desktop left panel — hidden on mobile */}
        <div className="hidden md:flex md:order-1 md:w-60 md:shrink-0 flex-col overflow-y-auto">
          <ControlsPanel {...sharedControlProps} mobile={false} />
        </div>

        {/* Mobile bottom panel — hidden on desktop */}
        <div className="md:hidden order-2">
          <ControlsPanel {...sharedControlProps} mobile={true} />
        </div>
      </div>

      {/* ── Rules strip ── */}
      <div className="shrink-0 hidden md:flex items-center justify-center gap-6 px-5 py-2 border-t border-white/[0.03] z-10">
        {[['Hausrand', '5%'], ['Grid', '5×5'], ['Minen', '1–24']].map(([label, val]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="text-white/15 text-[9px] font-medium tracking-wide uppercase">{label}</span>
            <span className="text-white/30 text-[9px] font-black">{val}</span>
          </div>
        ))}
      </div>

      {/* ── Error toast ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl text-red-200 text-xs font-semibold whitespace-nowrap"
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
    </div>
  );
};
