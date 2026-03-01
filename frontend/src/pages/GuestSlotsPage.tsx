import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { useGuest } from '../contexts/GuestContext';

type SymKey = 'cherry' | 'lemon' | 'bell' | 'star' | 'diamond';

const SYMBOLS: Record<SymKey, { emoji: string; glow: string }> = {
  cherry:  { emoji: '🍒', glow: '#f87171' },
  lemon:   { emoji: '🍋', glow: '#facc15' },
  bell:    { emoji: '🔔', glow: '#fb923c' },
  star:    { emoji: '⭐', glow: '#c084fc' },
  diamond: { emoji: '💎', glow: '#38bdf8' },
};

const PAY_TABLE = [
  { label: '💎 💎 💎', name: 'Triple Diamond', mult: '100×', tier: 'jackpot' },
  { label: '⭐ ⭐ ⭐', name: 'Triple Star',    mult: '25×',  tier: 'mega'    },
  { label: '🔔 🔔 🔔', name: 'Triple Bell',   mult: '10×',  tier: 'big'     },
  { label: '🍋 🍋 🍋', name: 'Triple Lemon',  mult: '5×',   tier: 'medium'  },
  { label: '🍒 🍒 🍒', name: 'Triple Cherry', mult: '3×',   tier: 'medium'  },
  { label: '💎 💎 —',  name: 'Diamond Pair',  mult: '15×',  tier: 'big'     },
  { label: '⭐ ⭐ —',  name: 'Star Pair',     mult: '8×',   tier: 'medium'  },
  { label: '🔔 🔔 —',  name: 'Bell Pair',     mult: '3×',   tier: 'small'   },
  { label: '🍋 🍋 —',  name: 'Lemon Pair',    mult: '2×',   tier: 'small'   },
  { label: '🍒 🍒 —',  name: 'Cherry Pair',   mult: '1.5×', tier: 'small'   },
  { label: '🍒 — —',   name: 'Cherry Trost',  mult: '0.6×', tier: 'small'   },
];

const TIER_COLORS: Record<string, string> = {
  jackpot: '#06b6d4',
  mega:    '#c084fc',
  big:     '#fbbf24',
  medium:  '#4ade80',
  small:   '#9ca3af',
};

const BET_OPTIONS = [10, 25, 50, 100, 250, 500];

function AnimCounter({ value }: { value: number }) {
  const mv = useMotionValue(value);
  const display = useTransform(mv, (v) => Math.round(v).toLocaleString());
  useEffect(() => {
    const ctrl = animate(mv, value, { duration: 0.6, ease: 'easeOut' });
    return ctrl.stop;
  }, [value, mv]);
  return <motion.span>{display}</motion.span>;
}

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const GuestSlotsPage = () => {
  const { guestId, balance, setBalance } = useGuest();

  const [bet, setBet] = useState(50);
  const [reels, setReels] = useState<[SymKey, SymKey, SymKey]>(['cherry', 'cherry', 'cherry']);
  const [spinning, setSpinning] = useState(false);
  const [displayReels, setDisplayReels] = useState<[SymKey, SymKey, SymKey]>(['cherry', 'cherry', 'cherry']);
  const [lastResult, setLastResult] = useState<{ winType: string; net: number; payout: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPay, setShowPay] = useState(false);

  const SYM_ORDER: SymKey[] = ['cherry', 'lemon', 'bell', 'star', 'diamond'];
  function randSym(): SymKey { return SYM_ORDER[Math.floor(Math.random() * 5)]; }

  async function spin() {
    if (spinning || balance < bet) return;
    setSpinning(true);
    setLastResult(null);
    setError(null);

    // Animate reels while waiting for result
    const spinInterval = setInterval(() => {
      setDisplayReels([randSym(), randSym(), randSym()]);
    }, 80);

    try {
      const res = await fetch(`${API_URL}/guest/slots/spin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-guest-id': guestId },
        body: JSON.stringify({ bet }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler');

      clearInterval(spinInterval);
      setReels(data.reels);
      setDisplayReels(data.reels);
      setBalance(data.balance);
      setLastResult({ winType: data.winType, net: data.net, payout: data.payout });
    } catch (e: any) {
      clearInterval(spinInterval);
      setError(e.message ?? 'Fehler beim Drehen');
    } finally {
      setSpinning(false);
    }
  }

  const isWin = lastResult && lastResult.net > 0;
  const winGlow = isWin && reels[0] ? SYMBOLS[reels[0]].glow : null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#05080f' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04]"
        style={{ background: 'rgba(5,8,15,0.85)', backdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-center gap-4">
          <Link to="/games/guest" className="flex items-center gap-1.5 text-white/35 hover:text-white/75 text-xs font-medium transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Zurück
          </Link>
          <span className="text-purple-300 font-black tracking-[0.2em] text-sm uppercase">Slots</span>
          <span className="px-2 py-0.5 rounded-full bg-violet-900/40 border border-violet-700/40 text-violet-300 text-[10px] font-semibold">Gastmodus</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg" style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.12)' }}>
          <div className="w-2 h-2 rounded-full bg-yellow-400/60" />
          <span className="text-yellow-300 font-black text-sm tabular-nums"><AnimCounter value={balance} /></span>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row items-start justify-center gap-8 px-4 py-8 max-w-5xl mx-auto w-full">

        {/* Slot machine */}
        <div className="flex-1 flex flex-col items-center">
          {/* Machine body */}
          <div className="relative rounded-3xl p-6 w-full max-w-sm"
            style={{
              background: 'linear-gradient(160deg,#0d1525 0%,#080d1a 50%,#0d1030 100%)',
              border: '2px solid #4c1d95',
              boxShadow: '0 0 60px rgba(124,58,237,0.35),0 30px 60px rgba(0,0,0,0.8)',
            }}
          >
            {/* Marquee */}
            <div className="text-center mb-4">
              <span className="text-[11px] font-black tracking-[0.3em] uppercase" style={{ color: '#06b6d4' }}>
                EG SLOTS — GASTMODUS
              </span>
            </div>

            {/* Reel window */}
            <div className="rounded-xl p-3 mb-4" style={{ background: '#04060e', border: '2px solid #2e1065', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.9)' }}>
              <div className="flex gap-3 justify-center">
                {displayReels.map((sym, i) => (
                  <motion.div
                    key={i}
                    animate={spinning ? { y: [0, -4, 4, -2, 2, 0] } : { y: 0 }}
                    transition={{ duration: 0.15, repeat: spinning ? Infinity : 0 }}
                    className="flex items-center justify-center rounded-xl w-[80px] h-[90px]"
                    style={{
                      background: '#060a14',
                      border: `1px solid rgba(124,58,237,${spinning ? '0.8' : '0.4'})`,
                      boxShadow: isWin && !spinning && reels[i] === reels[0]
                        ? `0 0 30px ${winGlow}80`
                        : `0 0 8px rgba(124,58,237,0.2)`,
                    }}
                  >
                    <span className="text-4xl select-none">{SYMBOLS[sym].emoji}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Win message */}
            <AnimatePresence mode="wait">
              {lastResult && (
                <motion.div
                  key={lastResult.winType}
                  initial={{ opacity: 0, scale: 0.8, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-center mb-4 px-4 py-2 rounded-xl"
                  style={{
                    background: isWin ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${isWin ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  }}
                >
                  {isWin ? (
                    <>
                      <p className="text-xs text-purple-300 font-semibold mb-1">Gewonnen!</p>
                      <p className="text-2xl font-black" style={{ color: '#a78bfa' }}>+{lastResult.payout.toLocaleString()}</p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 font-medium">Kein Gewinn</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bet selector */}
            <div className="mb-4">
              <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-2">Einsatz</p>
              <div className="grid grid-cols-3 gap-2">
                {BET_OPTIONS.map((v) => (
                  <button
                    key={v}
                    onClick={() => setBet(v)}
                    disabled={v > balance || spinning}
                    className="py-2 rounded-xl text-sm font-bold transition-colors"
                    style={{
                      background: bet === v ? '#4c1d95' : '#0d1025',
                      border: `1px solid ${bet === v ? '#7c3aed' : '#2d1b69'}`,
                      color: bet === v ? '#a78bfa' : v > balance ? '#374151' : '#6b7280',
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Spin button */}
            <motion.button
              whileHover={spinning || balance < bet ? {} : { scale: 1.02 }}
              whileTap={spinning || balance < bet ? {} : { scale: 0.97 }}
              onClick={spin}
              disabled={spinning || balance < bet}
              className="w-full py-4 rounded-2xl font-black text-lg tracking-wide transition-all"
              style={{
                background: spinning || balance < bet ? '#1e1b4b' : 'linear-gradient(135deg,#7c3aed 0%,#6d28d9 100%)',
                boxShadow: spinning || balance < bet ? 'none' : '0 0 30px rgba(124,58,237,0.6)',
                color: spinning || balance < bet ? '#4b5563' : '#fff',
              }}
            >
              {spinning ? '⟳ Dreht…' : balance < bet ? 'Zu wenig Guthaben' : '🎰 Drehen'}
            </motion.button>

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs text-center mt-3">{error}</motion.p>
            )}
          </div>
        </div>

        {/* Paytable */}
        <div className="w-full lg:w-72 shrink-0">
          <button
            onClick={() => setShowPay((p) => !p)}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl mb-3 text-sm font-semibold text-gray-400 hover:text-gray-200 transition-colors lg:hidden"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            Gewinntabelle {showPay ? '▲' : '▼'}
          </button>
          <div className={`lg:block ${showPay ? 'block' : 'hidden'}`}>
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(13,18,37,0.8)', border: '1px solid rgba(124,58,237,0.2)' }}>
              <div className="px-4 py-3 border-b border-white/[0.04]">
                <p className="text-xs font-black uppercase tracking-wider text-purple-300">Gewinntabelle</p>
              </div>
              <div className="divide-y divide-white/[0.03]">
                {PAY_TABLE.map((row) => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <span className="text-sm font-medium text-gray-300">{row.label}</span>
                      <p className="text-[10px] text-gray-600 mt-0.5">{row.name}</p>
                    </div>
                    <span className="text-sm font-black tabular-nums" style={{ color: TIER_COLORS[row.tier] }}>{row.mult}</span>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 border-t border-white/[0.04]">
                <p className="text-[10px] text-gray-600">~1.6% Hausvorteil · 98.4% Auszahlquote</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
