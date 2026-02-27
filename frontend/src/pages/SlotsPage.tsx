import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ApiService } from '../services/api.service';

// ── Types ─────────────────────────────────────────────────────────────────────
type SymKey = 'cherry' | 'lemon' | 'bell' | 'star' | 'diamond';

interface SpinResult {
  reels: [SymKey, SymKey, SymKey];
  payout: number;
  winType: string;
  net: number;
  balance: number;
}

// ── Symbol data ───────────────────────────────────────────────────────────────
const SYMBOLS: Record<SymKey, { emoji: string; name: string; glow: string }> = {
  cherry:  { emoji: '🍒', name: 'Cherry',  glow: '#f87171' },
  lemon:   { emoji: '🍋', name: 'Lemon',   glow: '#facc15' },
  bell:    { emoji: '🔔', name: 'Bell',    glow: '#fb923c' },
  star:    { emoji: '⭐', name: 'Star',    glow: '#c084fc' },
  diamond: { emoji: '💎', name: 'Diamond', glow: '#38bdf8' },
};

const SYM_ORDER: SymKey[] = ['cherry', 'lemon', 'bell', 'star', 'diamond'];

function prevSym(s: SymKey): SymKey {
  return SYM_ORDER[(SYM_ORDER.indexOf(s) - 1 + 5) % 5];
}
function nextSym(s: SymKey): SymKey {
  return SYM_ORDER[(SYM_ORDER.indexOf(s) + 1) % 5];
}
function randSym(): SymKey {
  return SYM_ORDER[Math.floor(Math.random() * SYM_ORDER.length)];
}

// ── Theme (Neon) ──────────────────────────────────────────────────────────────
const T = {
  pageBg: '#05080f',
  machineBg: 'linear-gradient(160deg, #0d1525 0%, #080d1a 50%, #0d1030 100%)',
  machineBorder: '#4c1d95',
  machineShadow: '0 0 60px rgba(124,58,237,0.35), 0 30px 60px rgba(0,0,0,0.8)',
  screenBg: '#04060e',
  screenBorder: '#2e1065',
  screenInset: 'inset 0 0 40px rgba(0,0,0,0.9)',
  reelBg: '#060a14',
  reelBorder: '1px solid rgba(124,58,237,0.4)',
  reelGlow: (active: boolean) => active
    ? '0 0 30px rgba(124,58,237,0.8), inset 0 0 20px rgba(124,58,237,0.1)'
    : '0 0 8px rgba(124,58,237,0.2)',
  winLineBg: 'rgba(124,58,237,0.15)',
  winLineBar: '#7c3aed',
  jackpotColor: '#06b6d4',
  accentColor: '#7c3aed',
  accentLight: '#a78bfa',
  btnBg: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
  btnGlow: '0 0 30px rgba(124,58,237,0.6), 0 4px 20px rgba(0,0,0,0.4)',
  btnDisabled: '#1e1b4b',
  chipBg: '#0d1025',
  chipBorder: '#2d1b69',
  chipSelected: '#4c1d95',
  chipText: '#a78bfa',
  ledColor: '#a78bfa',
  textMuted: '#6b7280',
  marqueeColor: '#06b6d4',
} as const;

// ── Paytable display ──────────────────────────────────────────────────────────
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
  { label: '🍒 — —',   name: 'Cherry Bonus',  mult: '0.6×', tier: 'bonus'   },
];

const BET_CHIPS = [10, 25, 50, 100, 250, 500];

// ── Win info helper ───────────────────────────────────────────────────────────
function getWinInfo(winType: string): {
  label: string; isWin: boolean; isBig: boolean; isBonus: boolean;
} {
  if (winType === 'loss') {
    return { label: 'Kein Gewinn', isWin: false, isBig: false, isBonus: false };
  }
  if (winType === 'cherry_consolation') {
    return { label: '🍒 Cherry Bonus', isWin: true, isBig: false, isBonus: true };
  }
  if (winType.startsWith('pair_')) {
    const sym = winType.replace('pair_', '') as SymKey;
    return {
      label: `${SYMBOLS[sym].emoji}${SYMBOLS[sym].emoji} ${SYMBOLS[sym].name} Pair`,
      isWin: true, isBig: sym === 'diamond' || sym === 'star', isBonus: false,
    };
  }
  if (winType.startsWith('three_')) {
    const sym = winType.replace('three_', '') as SymKey;
    return {
      label: `${SYMBOLS[sym].emoji}${SYMBOLS[sym].emoji}${SYMBOLS[sym].emoji} JACKPOT!`,
      isWin: true, isBig: true, isBonus: false,
    };
  }
  return { label: 'Win', isWin: true, isBig: false, isBonus: false };
}

// ── Reel component ─────────────────────────────────────────────────────────────
interface ReelProps {
  symbol: SymKey;
  isSpinning: boolean;
  stopped: boolean;
  theme: typeof T;
}

function Reel({ symbol, isSpinning, stopped, theme }: ReelProps) {
  const sym = SYMBOLS[symbol];

  return (
    <div
      style={{
        width: 120,
        height: 128,
        background: theme.reelBg,
        border: theme.reelBorder,
        borderRadius: 12,
        boxShadow: theme.reelGlow(isSpinning),
        position: 'relative',
        overflow: 'hidden',
        transition: 'box-shadow 0.3s',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Symbol above (blurred — gives strip illusion) */}
      <div
        style={{
          position: 'absolute',
          top: 2,
          fontSize: 30,
          opacity: 0.28,
          filter: 'blur(3px)',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        {SYMBOLS[prevSym(symbol)].emoji}
      </div>

      {/* Center symbol (the result) */}
      <motion.div
        key={`${symbol}-${isSpinning ? 'spin' : 'stop'}`}
        initial={stopped ? { scale: 0.7, opacity: 0 } : false}
        animate={
          isSpinning
            ? { y: [0, -6, 0], scale: [1, 0.88, 1], filter: ['blur(0px)', 'blur(3px)', 'blur(0px)'] }
            : { y: 0, scale: 1, filter: 'blur(0px)', opacity: 1 }
        }
        transition={
          isSpinning
            ? { duration: 0.12, repeat: Infinity, ease: 'linear' }
            : stopped
              ? { type: 'spring', stiffness: 500, damping: 22, duration: 0.3 }
              : { duration: 0.15 }
        }
        style={{
          fontSize: 58,
          lineHeight: 1,
          userSelect: 'none',
          zIndex: 2,
          filter: isSpinning ? undefined : `drop-shadow(0 0 10px ${sym.glow}60)`,
        }}
      >
        {sym.emoji}
      </motion.div>

      {/* Symbol below (blurred — gives strip illusion) */}
      <div
        style={{
          position: 'absolute',
          bottom: 2,
          fontSize: 30,
          opacity: 0.28,
          filter: 'blur(3px)',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        {SYMBOLS[nextSym(symbol)].emoji}
      </div>

      {/* Top gradient fade */}
      <div
        style={{
          position: 'absolute', inset: 0, top: 0, left: 0, right: 0, height: '38%',
          background: `linear-gradient(to bottom, ${theme.reelBg}ff, transparent)`,
          pointerEvents: 'none', zIndex: 3,
        }}
      />
      {/* Bottom gradient fade */}
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '38%',
          background: `linear-gradient(to top, ${theme.reelBg}ff, transparent)`,
          pointerEvents: 'none', zIndex: 3,
        }}
      />

      {/* Win line glow (center horizontal bar) */}
      {!isSpinning && (
        <div
          style={{
            position: 'absolute', left: 0, right: 0,
            top: '50%', transform: 'translateY(-50%)',
            height: 2,
            background: `linear-gradient(90deg, transparent, ${sym.glow}60, transparent)`,
            zIndex: 4, pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}

// ── Win particles (big wins only) ─────────────────────────────────────────────
function WinParticles() {
  const COIN_COUNT = 14;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 20 }}>
      {Array.from({ length: COIN_COUNT }, (_, i) => {
        const angle = (i / COIN_COUNT) * 360;
        const rad = angle * (Math.PI / 180);
        const dist = 120 + Math.random() * 60;
        return (
          <motion.div
            key={i}
            initial={{ x: '50%', y: '50%', opacity: 1, scale: 0.5 }}
            animate={{
              x: `calc(50% + ${Math.cos(rad) * dist}px)`,
              y: `calc(50% + ${Math.sin(rad) * dist}px)`,
              opacity: 0,
              scale: 1.8,
            }}
            transition={{ duration: 1.0, ease: 'easeOut', delay: i * 0.04 }}
            style={{ position: 'absolute', fontSize: 20, userSelect: 'none' }}
          >
            🪙
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Main SlotsPage ─────────────────────────────────────────────────────────────
export const SlotsPage = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [bet, setBet] = useState(50);
  const [spinning, setSpinning] = useState(false);
  const [showPayTable, setShowPayTable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reel display state
  const [reels, setReels] = useState<[SymKey, SymKey, SymKey]>(['cherry', 'bell', 'star']);
  const [reelSpinning, setReelSpinning] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [reelStopped, setReelStopped] = useState<[boolean, boolean, boolean]>([false, false, false]);

  // Result display
  const [lastResult, setLastResult] = useState<SpinResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  // Cycling interval refs
  const cycleRefs = useRef<[
    ReturnType<typeof setInterval> | null,
    ReturnType<typeof setInterval> | null,
    ReturnType<typeof setInterval> | null,
  ]>([null, null, null]);

  const balance = user?.balance ?? 0;

  // Start fast cycling for a reel
  function startCycle(i: number) {
    if (cycleRefs.current[i]) clearInterval(cycleRefs.current[i]!);
    cycleRefs.current[i] = setInterval(() => {
      setReels(prev => {
        const next = [...prev] as [SymKey, SymKey, SymKey];
        next[i] = randSym();
        return next;
      });
    }, 65);
  }

  // Stop a reel with gradual slowdown → lock on target
  function stopReel(i: number, target: SymKey, onDone: () => void) {
    if (cycleRefs.current[i]) {
      clearInterval(cycleRefs.current[i]!);
      cycleRefs.current[i] = null;
    }

    // Gradually show fewer random symbols before locking
    const slowSteps = [90, 150, 230, 340];
    let step = 0;

    const doStep = () => {
      const delay = slowSteps[step];
      if (delay === undefined) {
        // Final lock
        setReels(prev => {
          const next = [...prev] as [SymKey, SymKey, SymKey];
          next[i] = target;
          return next;
        });
        setReelSpinning(prev => {
          const next = [...prev] as [boolean, boolean, boolean];
          next[i] = false;
          return next;
        });
        setReelStopped(prev => {
          const next = [...prev] as [boolean, boolean, boolean];
          next[i] = true;
          return next;
        });
        onDone();
        return;
      }

      // Show one more random symbol
      setReels(prev => {
        const next = [...prev] as [SymKey, SymKey, SymKey];
        next[i] = randSym();
        return next;
      });
      step++;
      setTimeout(doStep, delay);
    };

    doStep();
  }

  const spin = useCallback(async () => {
    if (spinning || balance < bet) return;
    setError(null);
    setShowResult(false);
    setLastResult(null);
    setSpinning(true);

    // Start all reels
    setReelSpinning([true, true, true]);
    setReelStopped([false, false, false]);
    startCycle(0);
    startCycle(1);
    startCycle(2);

    try {
      const result = await ApiService.spinSlots(bet);

      let doneCount = 0;
      const checkAllDone = () => {
        doneCount++;
        if (doneCount === 3) {
          setSpinning(false);
          setLastResult(result);
          setShowResult(true);
          updateUser({ ...user!, balance: result.balance });
        }
      };

      // Stop reels left → right with 700ms stagger
      stopReel(0, result.reels[0], checkAllDone);
      setTimeout(() => stopReel(1, result.reels[1], checkAllDone), 700);
      setTimeout(() => stopReel(2, result.reels[2], checkAllDone), 1400);
    } catch (err: any) {
      cycleRefs.current.forEach(r => r && clearInterval(r));
      cycleRefs.current = [null, null, null];
      setReelSpinning([false, false, false]);
      setSpinning(false);
      setError(err?.message || 'Drehen fehlgeschlagen');
    }
  }, [spinning, balance, bet, user]);

  // Keyboard: Space = spin
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !spinning) { e.preventDefault(); spin(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [spin]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      cycleRefs.current.forEach(r => r && clearInterval(r));
    };
  }, []);

  const winInfo = lastResult ? getWinInfo(lastResult.winType) : null;
  const canSpin = !spinning && balance >= bet;

  const adjustBet = (delta: number) => {
    setBet(prev => Math.max(10, Math.min(Math.min(balance, 10000), prev + delta)));
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center py-6 px-4"
      style={{ background: T.pageBg }}
    >
      {/* ── Header ── */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/games')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          ← Zurück
        </button>

        <button
          onClick={() => setShowPayTable(v => !v)}
          className="px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-200"
          style={{
            background: showPayTable ? T.accentColor : 'rgba(255,255,255,0.05)',
            color: showPayTable ? '#fff' : '#6b7280',
            border: `1px solid ${showPayTable ? T.accentColor : 'rgba(255,255,255,0.08)'}`,
          }}
        >
          Gewinntabelle
        </button>
      </div>

      {/* ── Balance pill ── */}
      <div
        className="flex items-center gap-2 px-5 py-2 rounded-full mb-6 text-sm font-bold"
        style={{
          background: 'rgba(0,0,0,0.4)',
          border: `1px solid ${T.accentColor}30`,
          color: T.accentLight,
        }}
      >
        <span>🪙</span>
        <span>{balance.toLocaleString()} Coins</span>
      </div>

      {/* ── Machine Cabinet ── */}
      <motion.div
        layout
        className="w-full max-w-lg relative"
        style={{
          background: T.machineBg,
          border: `2px solid ${T.machineBorder}60`,
          borderRadius: 28,
          boxShadow: T.machineShadow,
          padding: '0 0 28px 0',
        }}
      >
        {/* Side decoration dots */}
        {[0, 1].map(side => (
          <div
            key={side}
            style={{
              position: 'absolute',
              top: '15%',
              [side === 0 ? 'left' : 'right']: -8,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {[0, 1, 2, 3, 4].map(j => (
              <div
                key={j}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: T.ledColor,
                  boxShadow: `0 0 8px ${T.ledColor}`,
                  opacity: 0.6 + j * 0.08,
                }}
              />
            ))}
          </div>
        ))}

        {/* ── Marquee / Jackpot banner ── */}
        <div
          className="overflow-hidden rounded-t-[26px] px-6 py-3 mb-2 text-center relative"
          style={{
            background: `linear-gradient(90deg, transparent, ${T.accentColor}25, transparent)`,
            borderBottom: `1px solid ${T.accentColor}30`,
          }}
        >
          <span
            className="text-xs font-bold tracking-[0.3em] uppercase"
            style={{
              color: T.marqueeColor,
              textShadow: `0 0 12px ${T.marqueeColor}`,
            }}
          >
            ★ JACKPOT: 100× ★ STAR: 25× ★ BELL: 10× ★ RTP: 98% ★
          </span>
        </div>

        {/* Machine label */}
        <div className="text-center mb-1">
          <span
            className="text-2xl font-black tracking-widest uppercase"
            style={{ color: T.accentLight, letterSpacing: '0.25em' }}
          >
            SLOTS
          </span>
        </div>

        {/* ── Reel Window ── */}
        <div className="px-6">
          <div
            style={{
              background: T.screenBg,
              border: `3px solid ${T.screenBorder}`,
              borderRadius: 18,
              boxShadow: T.screenInset,
              padding: '16px 20px',
              position: 'relative',
            }}
          >
            {/* Win line (horizontal stripe behind reels) */}
            <div
              style={{
                position: 'absolute',
                left: 0, right: 0,
                top: '50%', transform: 'translateY(-50%)',
                height: 6,
                background: T.winLineBg,
                zIndex: 0,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: '10%', right: '10%',
                top: '50%', transform: 'translateY(-50%)',
                height: 1,
                background: T.winLineBar,
                opacity: 0.5,
                zIndex: 0,
              }}
            />

            {/* Reels */}
            <div className="flex gap-4 justify-center relative" style={{ zIndex: 1 }}>
              {([0, 1, 2] as const).map(i => (
                <Reel
                  key={i}
                  symbol={reels[i]}
                  isSpinning={reelSpinning[i]}
                  stopped={reelStopped[i] && !reelSpinning[i]}
                  theme={T}
                />
              ))}
            </div>

            {/* Win label inside screen */}
            <div className="mt-4 h-9 flex items-center justify-center relative">
              <AnimatePresence mode="wait">
                {showResult && lastResult && winInfo ? (
                  <motion.div
                    key={lastResult.winType + lastResult.payout}
                    initial={{ opacity: 0, y: 8, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="flex items-center gap-3"
                  >
                    {winInfo.isBig && <WinParticles />}

                    <span
                      className="font-bold text-sm tracking-wide"
                      style={{
                        color: winInfo.isWin
                          ? winInfo.isBig
                            ? T.jackpotColor
                            : winInfo.isBonus
                              ? '#fbbf24'
                              : '#4ade80'
                          : '#6b7280',
                        textShadow: winInfo.isBig ? `0 0 16px ${T.jackpotColor}` : 'none',
                      }}
                    >
                      {winInfo.label}
                    </span>

                    {winInfo.isWin && (
                      <span
                        className="font-black text-base"
                        style={{ color: T.accentLight }}
                      >
                        +{lastResult.payout.toLocaleString()}
                      </span>
                    )}
                    {!winInfo.isWin && (
                      <span className="text-sm text-gray-600">
                        -{bet}
                      </span>
                    )}
                  </motion.div>
                ) : spinning ? (
                  <motion.div
                    key="spinning"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="text-xs tracking-widest uppercase"
                    style={{ color: T.accentLight }}
                  >
                    Dreht...
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    className="text-xs text-gray-700 tracking-wider uppercase"
                  >
                    SPIN drücken oder [Leertaste]
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ── Controls ── */}
        <div className="px-6 mt-6 space-y-4">
          {/* Bet chips */}
          <div>
            <div className="text-xs uppercase tracking-wider mb-2" style={{ color: T.textMuted }}>
              Einsatz
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {BET_CHIPS.map(chip => (
                <button
                  key={chip}
                  onClick={() => setBet(chip)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150"
                  style={{
                    background: bet === chip ? T.chipSelected : T.chipBg,
                    border: `1px solid ${bet === chip ? T.accentColor : T.chipBorder}`,
                    color: bet === chip ? '#fff' : T.chipText,
                    boxShadow: bet === chip ? `0 0 12px ${T.accentColor}50` : 'none',
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Fine-tune bet */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => adjustBet(-10)}
                className="w-8 h-8 rounded-lg text-lg font-bold flex items-center justify-center transition-colors"
                style={{
                  background: T.chipBg,
                  border: `1px solid ${T.chipBorder}`,
                  color: T.chipText,
                }}
              >
                −
              </button>
              <div
                className="flex-1 text-center font-black text-lg"
                style={{ color: T.accentLight }}
              >
                {bet.toLocaleString()} 🪙
              </div>
              <button
                onClick={() => adjustBet(10)}
                className="w-8 h-8 rounded-lg text-lg font-bold flex items-center justify-center transition-colors"
                style={{
                  background: T.chipBg,
                  border: `1px solid ${T.chipBorder}`,
                  color: T.chipText,
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center text-sm text-red-400"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* SPIN button */}
          <motion.button
            onClick={spin}
            disabled={!canSpin}
            whileTap={canSpin ? { scale: 0.96 } : {}}
            className="w-full py-4 rounded-2xl font-black text-xl tracking-widest uppercase transition-all duration-200"
            style={{
              background: canSpin ? T.btnBg : T.btnDisabled,
              boxShadow: canSpin ? T.btnGlow : 'none',
              color: canSpin ? '#fff' : '#374151',
              cursor: canSpin ? 'pointer' : 'not-allowed',
              border: 'none',
              letterSpacing: '0.2em',
            }}
          >
            {spinning ? (
              <motion.span
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
              >
                ⟳ Dreht...
              </motion.span>
            ) : (
              '🎰 SPIN'
            )}
          </motion.button>

          {balance < bet && !spinning && (
            <p className="text-center text-xs text-red-500">
              Nicht genug Guthaben — Einsatz anpassen
            </p>
          )}
        </div>

        {/* ── Last spin net result flash ── */}
        <AnimatePresence>
          {showResult && lastResult && (
            <motion.div
              key="flash"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap"
              style={{
                background: lastResult.net >= 0 ? '#16a34a' : '#dc2626',
                color: '#fff',
                boxShadow: lastResult.net >= 0
                  ? '0 0 20px rgba(22,163,74,0.7)'
                  : '0 0 20px rgba(220,38,38,0.5)',
              }}
            >
              {lastResult.net >= 0 ? `+${lastResult.net}` : lastResult.net} Coins
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Pay Table panel ── */}
      <AnimatePresence>
        {showPayTable && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-lg mt-6 rounded-2xl overflow-hidden"
            style={{
              background: T.machineBg,
              border: `1px solid ${T.machineBorder}40`,
              boxShadow: `0 10px 40px rgba(0,0,0,0.5)`,
            }}
          >
            <div
              className="px-5 py-3 border-b flex items-center justify-between"
              style={{ borderColor: `${T.accentColor}20` }}
            >
              <h3 className="font-bold text-sm" style={{ color: T.accentLight }}>
                Gewinntabelle
              </h3>
              <span className="text-xs" style={{ color: T.textMuted }}>
                Gewinnhäufigkeit ≈ 54% · Haus-Vorteil ≈ 1,6%
              </span>
            </div>

            <div className="divide-y" style={{ borderColor: `${T.accentColor}10` }}>
              {PAY_TABLE.map((row) => {
                const tierColors: Record<string, string> = {
                  jackpot: T.jackpotColor,
                  mega: '#c084fc',
                  big: '#fb923c',
                  medium: '#4ade80',
                  small: '#9ca3af',
                  bonus: '#fbbf24',
                };
                return (
                  <div
                    key={row.label}
                    className="flex items-center justify-between px-5 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-mono w-20 tracking-wide">{row.label}</span>
                      <span className="text-xs" style={{ color: T.textMuted }}>
                        {row.name}
                      </span>
                    </div>
                    <span
                      className="font-black text-sm"
                      style={{ color: tierColors[row.tier] }}
                    >
                      {row.mult}
                    </span>
                  </div>
                );
              })}
            </div>

            <div
              className="px-5 py-3 text-xs text-center"
              style={{ color: T.textMuted, borderTop: `1px solid ${T.accentColor}10` }}
            >
              Paare gelten links (Walzen 1+2). Cherry-Bonus tritt nur auf Walze 1 auf.
              Eigene Walzenbilder können jederzeit eingetauscht werden.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom spacer */}
      <div className="h-12" />
    </div>
  );
};
