import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ApiService } from '../services/api.service';

interface Prediction {
  id: string;
  title: string;
  closeDate: string;
  status: 'OPEN' | 'CLOSED';
  outcome: boolean | null;
  visibility: 'ALL' | 'ESSENSGRUPPE_ONLY';
  createdAt: string;
  creator: { id: string; username: string };
  totalYes: number;
  totalNo: number;
  yesCount: number;
  noCount: number;
  userBet: { side: boolean; amount: number } | null;
}

type FilterTab = 'open' | 'closed';

// ─── small info tooltip ───────────────────────────────────────────────────────
const RulesInfo = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-6 h-6 rounded-full border border-gray-600 text-gray-500 hover:text-gray-300 hover:border-gray-400 text-xs font-bold transition-colors flex items-center justify-center"
        title="Wie es funktioniert"
      >
        i
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              className="absolute left-8 top-0 z-50 w-72 bg-[#1a2235] border border-white/10 rounded-2xl p-4 shadow-2xl text-sm"
            >
              <p className="text-white font-semibold mb-2">Wie der Prediction Market funktioniert</p>
              <ul className="text-gray-400 space-y-1.5 text-xs leading-relaxed">
                <li>• Jeder kann eine Ja/Nein-Frage erstellen und ein Ablaufdatum festlegen.</li>
                <li>• <span className="text-amber-400 font-medium">Ersteller können nicht</span> auf ihre eigene Vorhersage wetten — verhindert Manipulation.</li>
                <li>• Andere Mitglieder setzen Coins auf Ja oder Nein. Eine Wette pro Person.</li>
                <li>• Der Ersteller löst die Frage auf, indem er das tatsächliche Ergebnis auswählt.</li>
                <li>• <span className="text-green-400 font-medium">Gewinner teilen den gesamten Verliererpool</span> proportional zur Wettgröße.</li>
                <li>• Hat niemand auf die Gewinnerseite gesetzt, werden alle Einsätze zurückerstattet.</li>
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── percentage bar ───────────────────────────────────────────────────────────
const BetBar = ({ yes, no }: { yes: number; no: number }) => {
  const total = yes + no;
  const yesPct = total === 0 ? 50 : Math.round((yes / total) * 100);
  const noPct  = 100 - yesPct;
  return (
    <div className="mt-3 mb-1">
      <div className="flex rounded-full overflow-hidden h-2 bg-white/5">
        <div
          className="bg-green-500 transition-all duration-500"
          style={{ width: `${yesPct}%` }}
        />
        <div
          className="bg-red-500 flex-1 transition-all duration-500"
          style={{ width: `${noPct}%` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-xs text-gray-500">
        <span className="text-green-400 font-medium">YES {yesPct}%</span>
        <span className="text-red-400 font-medium">NO {noPct}%</span>
      </div>
    </div>
  );
};

// ─── main page ────────────────────────────────────────────────────────────────
export const PredictionPage = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<FilterTab>('open');

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDate, setCreateDate] = useState('');
  const [createVisibility, setCreateVisibility] = useState<'ALL' | 'ESSENSGRUPPE_ONLY'>('ALL');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const canSetVisibility = user?.role === 'ESSENSGRUPPE_MITGLIED' || user?.role === 'ADMIN';

  // Bet modal
  const [betTarget, setBetTarget] = useState<Prediction | null>(null);
  const [betSide, setBetSide] = useState<boolean>(true);
  const [betAmount, setBetAmount] = useState('');
  const [betLoading, setBetLoading] = useState(false);
  const [betError, setBetError] = useState('');

  // Resolve modal
  const [resolveTarget, setResolveTarget] = useState<Prediction | null>(null);
  const [resolveOutcome, setResolveOutcome] = useState<boolean>(true);
  const [resolveLoading, setResolveLoading] = useState(false);
  const [resolveError, setResolveError] = useState('');

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Prediction | null>(null);

  useEffect(() => {
    loadPredictions();
  }, []);

  const loadPredictions = async () => {
    try {
      setLoading(true);
      const data = await ApiService.getPredictions() as Prediction[];
      setPredictions(data);
    } catch {
      setError('Vorhersagen konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const profile = await ApiService.getProfile() as typeof user;
      if (profile) updateUser(profile);
    } catch {}
  };

  // ── create ──────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!createTitle.trim() || !createDate) {
      setCreateError('Bitte alle Felder ausfüllen');
      return;
    }
    setCreateLoading(true);
    setCreateError('');
    try {
      const created = await ApiService.createPrediction({
        title: createTitle.trim(),
        closeDate: new Date(createDate).toISOString(),
        visibility: createVisibility,
      }) as Prediction;
      setPredictions((prev) => [created, ...prev]);
      setShowCreate(false);
      setCreateTitle('');
      setCreateDate('');
      setCreateVisibility('ALL');
      setTab('open');
    } catch (err: any) {
      setCreateError(err.message || 'Erstellen fehlgeschlagen');
    } finally {
      setCreateLoading(false);
    }
  };

  // ── bet ─────────────────────────────────────────────────────────────────────
  const handleBet = async () => {
    const amount = parseInt(betAmount, 10);
    if (!betTarget || isNaN(amount) || amount < 1) {
      setBetError('Bitte gültigen Betrag eingeben');
      return;
    }
    const available = (user?.balance ?? 0) - (user?.reserved ?? 0);
    if (amount > available) {
      setBetError(`Nicht genug Guthaben (verfügbar: ${available})`);
      return;
    }
    setBetLoading(true);
    setBetError('');
    try {
      const updated = await ApiService.placeBet(betTarget.id, { side: betSide, amount }) as Prediction;
      setPredictions((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setBetTarget(null);
      setBetAmount('');
      await refreshUser();
    } catch (err: any) {
      setBetError(err.message || 'Wette konnte nicht platziert werden');
    } finally {
      setBetLoading(false);
    }
  };

  // ── resolve ─────────────────────────────────────────────────────────────────
  const handleResolve = async () => {
    if (!resolveTarget) return;
    setResolveLoading(true);
    setResolveError('');
    try {
      await ApiService.resolvePrediction(resolveTarget.id, resolveOutcome);
      await loadPredictions();
      setResolveTarget(null);
      await refreshUser();
    } catch (err: any) {
      setResolveError(err.message || 'Auflösung fehlgeschlagen');
    } finally {
      setResolveLoading(false);
    }
  };

  // ── delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (pred: Prediction) => {
    try {
      await ApiService.deletePrediction(pred.id);
      setPredictions((prev) => prev.filter((p) => p.id !== pred.id));
    } catch (err: any) {
      alert(err.message || 'Löschen fehlgeschlagen');
    } finally {
      setDeleteTarget(null);
    }
  };

  // ── helpers ─────────────────────────────────────────────────────────────────
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });

  const potentialWin = (pred: Prediction, side: boolean, amount: number): number => {
    const myPool    = (side ? pred.totalYes : pred.totalNo) + amount;
    const otherPool = side ? pred.totalNo : pred.totalYes;
    if (myPool === 0) return amount;
    return amount + Math.floor((amount / myPool) * otherPool);
  };

  const filtered = predictions.filter((p) =>
    tab === 'open' ? p.status === 'OPEN' : p.status === 'CLOSED'
  );

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080d1a] text-white py-8 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/games')}
              className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
            >
              ← Games
            </button>
            <span className="text-gray-700">/</span>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              🔮 Prediction Market
            </h1>
            <RulesInfo />
          </div>
          <div className="flex items-center gap-2 bg-[#111827] border border-yellow-800/40 rounded-xl px-3 py-2">
            <span className="text-yellow-400">🪙</span>
            <span className="font-bold text-yellow-400">{(user?.balance ?? 0).toLocaleString()}</span>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[#111827] p-1 rounded-xl w-fit border border-white/5">
          {(['open', 'closed'] as FilterTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative px-5 py-2 rounded-lg text-sm font-semibold transition-colors duration-150 ${
                tab === t ? 'text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab === t && (
                <motion.div
                  layoutId="predTab"
                  className="absolute inset-0 bg-primary-600 rounded-lg"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">{t === 'open' ? 'Offen' : 'Geschlossen'}</span>
              <span className="relative z-10 ml-1.5 text-xs opacity-60">
                ({predictions.filter((p) => (t === 'open' ? p.status === 'OPEN' : p.status === 'CLOSED')).length})
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <p className="text-center text-red-400 py-20">{error}</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            <p className="text-5xl mb-4">🔮</p>
            <p className="text-lg font-medium text-gray-500">
              {tab === 'open' ? 'Noch keine offenen Vorhersagen' : 'Noch keine aufgelösten Vorhersagen'}
            </p>
            {tab === 'open' && (
              <button
                onClick={() => setShowCreate(true)}
                className="mt-4 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 rounded-xl text-sm font-semibold transition-colors"
              >
                Erste Vorhersage erstellen
              </button>
            )}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {filtered.map((pred, i) => {
                const isCreator = pred.creator.id === user?.id;
                const hasBet    = pred.userBet !== null;
                const isClosed  = pred.status === 'CLOSED';
                const total     = pred.totalYes + pred.totalNo;

                return (
                  <motion.div
                    key={pred.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-[#111827] border border-white/8 rounded-2xl p-5 flex flex-col gap-3"
                  >
                    {/* Title + status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold leading-snug">{pred.title}</p>
                        {pred.visibility === 'ESSENSGRUPPE_ONLY' && (
                          <span style={{ fontSize: 11, background: '#4a1a6b', color: '#d4a0ff', padding: '2px 6px', borderRadius: 4, display: 'inline-block', marginTop: 4 }}>Nur EG</span>
                        )}
                      </div>
                      {isClosed ? (
                        <span className={`flex-shrink-0 text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                          pred.outcome ? 'bg-green-900/50 text-green-400 border border-green-700/40'
                                       : 'bg-red-900/50 text-red-400 border border-red-700/40'
                        }`}>
                          {pred.outcome ? 'YES ✓' : 'NO ✓'}
                        </span>
                      ) : (
                        <span className="flex-shrink-0 text-xs px-2.5 py-0.5 rounded-full bg-primary-900/40 text-primary-300 border border-primary-700/30">
                          OFFEN
                        </span>
                      )}
                    </div>

                    {/* Meta */}
                    <p className="text-xs text-gray-500">
                      Von <span className="text-gray-400">{pred.creator.username}</span>
                      {isCreator && <span className="ml-1 text-amber-400">(du)</span>}
                      {' · '}
                      {isClosed ? 'Aufgelöst' : 'Schließt'} {fmtDate(pred.closeDate)}
                    </p>

                    {/* Bet bar */}
                    <BetBar yes={pred.totalYes} no={pred.totalNo} />

                    {/* Bet totals */}
                    <div className="flex justify-between text-xs">
                      <span className="text-green-400">
                        🪙 {pred.totalYes.toLocaleString()} ({pred.yesCount} {pred.yesCount === 1 ? 'Wette' : 'Wetten'})
                      </span>
                      <span className="text-gray-500 font-medium">
                        Gesamt: {total.toLocaleString()}
                      </span>
                      <span className="text-red-400">
                        🪙 {pred.totalNo.toLocaleString()} ({pred.noCount} {pred.noCount === 1 ? 'Wette' : 'Wetten'})
                      </span>
                    </div>

                    {/* User bet badge */}
                    {hasBet && (
                      <div className={`text-xs px-3 py-1.5 rounded-lg border ${
                        pred.userBet!.side
                          ? 'bg-green-900/20 border-green-700/30 text-green-400'
                          : 'bg-red-900/20 border-red-700/30 text-red-400'
                      }`}>
                        Deine Wette: 🪙 {pred.userBet!.amount.toLocaleString()} auf{' '}
                        <span className="font-semibold">{pred.userBet!.side ? 'YES' : 'NO'}</span>
                        {isClosed && pred.outcome !== null && (
                          pred.outcome === pred.userBet!.side
                            ? <span className="ml-1 text-green-300 font-bold">✓ Gewonnen</span>
                            : <span className="ml-1 text-red-300">✗ Verloren</span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      {!isClosed && !hasBet && !isCreator && (
                        <button
                          onClick={() => {
                            setBetTarget(pred);
                            setBetSide(true);
                            setBetAmount('');
                            setBetError('');
                          }}
                          className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-semibold transition-colors"
                        >
                          Wette platzieren
                        </button>
                      )}
                      {!isClosed && isCreator && (
                        <button
                          onClick={() => {
                            setResolveTarget(pred);
                            setResolveOutcome(true);
                            setResolveError('');
                          }}
                          className="flex-1 py-2 bg-amber-900/30 hover:bg-amber-900/50 border border-amber-700/40 text-amber-300 rounded-xl text-sm font-semibold transition-colors"
                        >
                          Auflösen →
                        </button>
                      )}
                      {!isClosed && isCreator && pred.yesCount === 0 && pred.noCount === 0 && (
                        <button
                          onClick={() => setDeleteTarget(pred)}
                          className="px-3 py-2 text-gray-600 hover:text-red-400 transition-colors text-sm"
                          title="Vorhersage löschen"
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* ── FAB: New Prediction ── */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 320, damping: 26 }}
        onClick={() => { setShowCreate(true); setCreateError(''); }}
        className="fixed bottom-6 left-6 z-30 w-12 h-12 bg-primary-600 hover:bg-primary-700 rounded-full shadow-xl shadow-primary-900/50 flex items-center justify-center text-white text-2xl font-light transition-colors duration-150"
        title="Neue Vorhersage"
      >
        +
      </motion.button>

      {/* ── Create Modal ── */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.93, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.93, y: 12 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="bg-[#111827] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold text-white mb-1">Neue Vorhersage</h2>
              <p className="text-xs text-gray-500 mb-5">Stelle eine Ja/Nein-Frage und lass andere auf das Ergebnis wetten.</p>

              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Frage</label>
              <input
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value.slice(0, 300))}
                placeholder="Fahren wir im Mai zur Abi-Fahrt?"
                className="w-full bg-[#0a0e1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary-600/50 mb-4"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              />
              <div className="flex justify-between text-xs text-gray-600 -mt-3 mb-4">
                <span />
                <span>{createTitle.length}/300</span>
              </div>

              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Auflösungsdatum</label>
              <input
                type="datetime-local"
                value={createDate}
                onChange={(e) => setCreateDate(e.target.value)}
                className="w-full bg-[#0a0e1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-600/50 mb-5 [color-scheme:dark]"
              />

              {canSetVisibility && (
                <div className="mb-4">
                  <label className="block text-xs mb-1.5 font-medium" style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: 11 }}>Sichtbarkeit</label>
                  <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.10)', overflow: 'hidden' }}>
                    <button type="button" onClick={() => setCreateVisibility('ALL')} style={{ flex: 1, padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: createVisibility === 'ALL' ? 'rgba(99,102,241,0.30)' : 'transparent', color: createVisibility === 'ALL' ? '#c4b5fd' : 'rgba(255,255,255,0.35)', border: 'none', borderRight: '1px solid rgba(255,255,255,0.08)', transition: 'all 0.15s', fontFamily: 'inherit' }}>Alle</button>
                    <button type="button" onClick={() => setCreateVisibility('ESSENSGRUPPE_ONLY')} style={{ flex: 1, padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: createVisibility === 'ESSENSGRUPPE_ONLY' ? 'rgba(99,102,241,0.30)' : 'transparent', color: createVisibility === 'ESSENSGRUPPE_ONLY' ? '#c4b5fd' : 'rgba(255,255,255,0.35)', border: 'none', transition: 'all 0.15s', fontFamily: 'inherit' }}>Nur Essensgruppe</button>
                  </div>
                </div>
              )}

              {createError && <p className="text-red-400 text-xs mb-4">{createError}</p>}

              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">
                  Abbrechen
                </button>
                <button
                  onClick={handleCreate}
                  disabled={createLoading}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700 rounded-xl text-sm font-semibold transition-colors"
                >
                  {createLoading ? 'Wird erstellt…' : 'Erstellen'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bet Modal ── */}
      <AnimatePresence>
        {betTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4"
            onClick={() => setBetTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.93, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.93, y: 12 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="bg-[#111827] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-base font-bold text-white mb-1">Wette platzieren</h2>
              <p className="text-xs text-gray-500 mb-1 leading-relaxed">"{betTarget.title}"</p>
              <p className="text-xs text-orange-400/80 mb-4">Coins werden jetzt <strong>reserviert</strong> und nur abgezogen, wenn du verlierst.</p>

              {/* Yes / No toggle */}
              <div className="flex gap-2 mb-5">
                <button
                  onClick={() => setBetSide(true)}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm border transition-all duration-150 ${
                    betSide
                      ? 'bg-green-600 border-green-500 text-white'
                      : 'bg-green-900/20 border-green-800/30 text-green-500 hover:bg-green-900/40'
                  }`}
                >
                  YES
                </button>
                <button
                  onClick={() => setBetSide(false)}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm border transition-all duration-150 ${
                    !betSide
                      ? 'bg-red-600 border-red-500 text-white'
                      : 'bg-red-900/20 border-red-800/30 text-red-500 hover:bg-red-900/40'
                  }`}
                >
                  NO
                </button>
              </div>

              {/* Amount */}
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Einsatz (Coins)</label>
              <input
                type="number"
                min="1"
                max={(user?.balance ?? 0) - (user?.reserved ?? 0)}
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                placeholder={`Verfügbar: ${((user?.balance ?? 0) - (user?.reserved ?? 0)).toLocaleString()}`}
                className="w-full bg-[#0a0e1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary-600/50 mb-2"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleBet(); }}
              />

              {/* Potential win preview */}
              {betAmount && !isNaN(parseInt(betAmount)) && parseInt(betAmount) > 0 && (
                <p className="text-xs text-gray-500 mb-4">
                  Falls <span className={betSide ? 'text-green-400' : 'text-red-400'}>{betSide ? 'YES' : 'NO'}</span> gewinnt,
                  behältst du deine <span className="text-white">{parseInt(betAmount)}</span> + gewinnst{' '}
                  <span className="text-yellow-400 font-semibold">
                    🪙 ~{(potentialWin(betTarget, betSide, parseInt(betAmount)) - parseInt(betAmount)).toLocaleString()} extra
                  </span>
                  <span className="text-gray-600"> (Schätzung)</span>
                </p>
              )}

              {betError && <p className="text-red-400 text-xs mb-4">{betError}</p>}

              <div className="flex gap-3 justify-end">
                <button onClick={() => setBetTarget(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">
                  Abbrechen
                </button>
                <button
                  onClick={handleBet}
                  disabled={betLoading || !betAmount || isNaN(parseInt(betAmount)) || parseInt(betAmount) < 1}
                  className={`px-5 py-2 rounded-xl text-sm font-semibold transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed ${
                    betSide ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {betLoading ? 'Wird platziert…' : `Wette auf ${betSide ? 'YES' : 'NO'}`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Resolve Modal ── */}
      <AnimatePresence>
        {resolveTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4"
            onClick={() => setResolveTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.93, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.93, y: 12 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="bg-[#111827] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-base font-bold text-white mb-1">Vorhersage auflösen</h2>
              <p className="text-xs text-gray-500 mb-5 leading-relaxed">"{resolveTarget.title}"</p>

              <p className="text-xs text-gray-400 font-medium mb-3">Was war das Ergebnis?</p>
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setResolveOutcome(true)}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm border transition-all duration-150 ${
                    resolveOutcome
                      ? 'bg-green-600 border-green-500 text-white'
                      : 'bg-green-900/20 border-green-800/30 text-green-500 hover:bg-green-900/40'
                  }`}
                >
                  YES
                </button>
                <button
                  onClick={() => setResolveOutcome(false)}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm border transition-all duration-150 ${
                    !resolveOutcome
                      ? 'bg-red-600 border-red-500 text-white'
                      : 'bg-red-900/20 border-red-800/30 text-red-500 hover:bg-red-900/40'
                  }`}
                >
                  NO
                </button>
              </div>

              {/* Payout preview */}
              <div className="bg-[#0a0e1a] border border-white/5 rounded-xl p-3 mb-4 text-xs text-gray-400 space-y-1">
                <p className="font-medium text-gray-300 mb-1.5">Auszahlungsvorschau</p>
                {(() => {
                  const winBets = (resolveOutcome ? resolveTarget.totalYes : resolveTarget.totalNo);
                  const loseBets = (resolveOutcome ? resolveTarget.totalNo : resolveTarget.totalYes);
                  const winCount = resolveOutcome ? resolveTarget.yesCount : resolveTarget.noCount;
                  if (winCount === 0) return <p className="text-amber-400">Niemand hat auf {resolveOutcome ? 'YES' : 'NO'} gesetzt — alle Einsätze werden zurückerstattet.</p>;
                  return (
                    <>
                      <p>Gewinner-Pool: 🪙 {winBets.toLocaleString()}</p>
                      <p>Verlierer-Pool ausgezahlt: 🪙 {loseBets.toLocaleString()}</p>
                      <p className="text-green-400 font-medium">Gewinner teilen 🪙 {(winBets + loseBets).toLocaleString()} gesamt</p>
                    </>
                  );
                })()}
              </div>

              {resolveError && <p className="text-red-400 text-xs mb-4">{resolveError}</p>}

              <div className="flex gap-3 justify-end">
                <button onClick={() => setResolveTarget(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">
                  Abbrechen
                </button>
                <button
                  onClick={handleResolve}
                  disabled={resolveLoading}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-700 rounded-xl text-sm font-semibold transition-colors"
                >
                  {resolveLoading ? 'Wird aufgelöst…' : 'Bestätigen & Auszahlen'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirm ── */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.93, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.93, y: 12 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="bg-[#111827] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-base font-bold text-white mb-2">Vorhersage löschen?</h2>
              <p className="text-sm text-gray-400 mb-5">"{deleteTarget.title}"</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">
                  Abbrechen
                </button>
                <button
                  onClick={() => handleDelete(deleteTarget)}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-sm font-semibold transition-colors"
                >
                  Löschen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
