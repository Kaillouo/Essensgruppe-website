import { useState, useRef } from 'react';
import type { OnlineUser } from '../contexts/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { DailyCoinsClaim } from '../components/DailyCoinsClaim';

type Tab = 'singleplayer' | 'multiplayer';

interface GameCardDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  route: string;
  gradient: string;
  accent: string;
  border: string;
  glowColor: string;
  requiresPlayers?: string;
}

const singlePlayerGames: GameCardDef[] = [
  {
    id: 'slots',
    name: 'Slots',
    icon: '🎰',
    description: 'Drehe die Walzen und treffe Symbole, um groß zu gewinnen.',
    route: '/games/slots',
    gradient: 'from-purple-900/50 to-purple-800/20',
    accent: 'text-purple-300',
    border: 'border-purple-700/40',
    glowColor: 'hover:shadow-purple-900/60',
  },
  {
    id: 'blackjack',
    name: 'Blackjack',
    icon: '🃏',
    description: 'Schlage den Dealer mit 21, ohne zu überziehen.',
    route: '/games/blackjack',
    gradient: 'from-emerald-900/50 to-emerald-800/20',
    accent: 'text-emerald-300',
    border: 'border-emerald-700/40',
    glowColor: 'hover:shadow-emerald-900/60',
  },
  {
    id: 'mines',
    name: 'Mines',
    icon: '💣',
    description: 'Decke Felder auf, meide Minen und kassiere, bevor es zu spät ist.',
    route: '/games/mines',
    gradient: 'from-red-900/50 to-red-800/20',
    accent: 'text-red-300',
    border: 'border-red-700/40',
    glowColor: 'hover:shadow-red-900/60',
  },
];

const multiplayerGames: GameCardDef[] = [
  {
    id: 'poker',
    name: 'Poker',
    icon: '♠️',
    description: "Texas Hold'em am Live-Tisch. Setz dich mit anderen Spielern und kämpfe um den Pot.",
    route: '/games/poker',
    gradient: 'from-sky-900/50 to-sky-800/20',
    accent: 'text-sky-300',
    border: 'border-sky-700/40',
    glowColor: 'hover:shadow-sky-900/60',
    requiresPlayers: 'Live-Mehrspielertisch',
  },
  {
    id: 'prediction',
    name: 'Prediction Market',
    icon: '🔮',
    description: "Stelle eine Ja/Nein-Frage. Spieler wählen eine Seite — Gewinner teilen den gesamten Verliererpool.",
    route: '/games/prediction',
    gradient: 'from-amber-900/50 to-amber-800/20',
    accent: 'text-amber-300',
    border: 'border-amber-700/40',
    glowColor: 'hover:shadow-amber-900/60',
    requiresPlayers: 'Für alle online Spieler offen',
  },
];

export const GamesPage = () => {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket(); // shared global socket — tracks ALL logged-in users
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('singleplayer');
  const [bubbleOpen, setBubbleOpen] = useState(false);

  // Messaging
  const [messageTarget, setMessageTarget] = useState<OnlineUser | null>(null);
  const [messageText, setMessageText] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const cooldownInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendMessage = () => {
    if (!messageTarget || !messageText.trim() || cooldown > 0) return;
    socket?.emit('games:message', {
      toUserId: messageTarget.userId,
      message: messageText.trim(),
    });
    setMessageText('');
    setMessageTarget(null);
    // Start 60-second cooldown
    setCooldown(60);
    if (cooldownInterval.current) clearInterval(cooldownInterval.current);
    cooldownInterval.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownInterval.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const games = activeTab === 'singleplayer' ? singlePlayerGames : multiplayerGames;

  return (
    <div className="min-h-screen bg-[#080d1a] text-white py-8 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header — title + balance + daily claim */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-white">Games</h1>
            <p className="text-gray-500 mt-1 text-sm">Setze deine Coins und erklimme die Bestenliste</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-[#111827] border border-yellow-800/40 rounded-xl px-4 py-2.5">
              <span className="text-yellow-400 text-lg">🪙</span>
              <span className="text-xl font-bold text-yellow-400">
                {(user?.balance ?? 0).toLocaleString()}
              </span>
            </div>
            <DailyCoinsClaim />
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex gap-1 mb-8 bg-[#111827] p-1 rounded-xl w-fit border border-white/5"
        >
          {(['singleplayer', 'multiplayer'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-150 ${
                activeTab === tab ? 'text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="tabIndicator"
                  className="absolute inset-0 bg-primary-600 rounded-lg"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {tab === 'singleplayer' ? <><span>🎮</span> Einzelspieler</> : <><span>👥</span> Multiplayer</>}
              </span>
            </button>
          ))}
        </motion.div>

        {/* Tab description */}
        <AnimatePresence mode="wait">
          <motion.p
            key={activeTab + '-desc'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="text-gray-500 text-sm mb-6"
          >
            {activeTab === 'singleplayer'
              ? 'Spiele allein gegen die Bank. Jederzeit verfügbar, kein Warten.'
              : 'Tritt gegen andere Online-Mitglieder an. Live-Spiele mit echten Spielern.'}
          </motion.p>
        </AnimatePresence>

        {/* Game cards */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {games.map((game, i) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.3 }}
                className={`bg-gradient-to-br ${game.gradient} border ${game.border} rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${game.glowColor}`}
                onClick={() => navigate(game.route)}
              >
                {game.requiresPlayers && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    {game.requiresPlayers}
                  </div>
                )}
                <div className="text-5xl mb-4 select-none">{game.icon}</div>
                <h3 className={`text-xl font-bold mb-2 ${game.accent}`}>{game.name}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{game.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Online Users Bubble (multiplayer tab only, fixed bottom-right) ── */}
      <AnimatePresence>
        {activeTab === 'multiplayer' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed bottom-6 right-6 z-30"
          >
            {/* Expanded user list */}
            <AnimatePresence>
              {bubbleOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-14 right-0 w-56 bg-[#111827] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-white/5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Gerade online</p>
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    {onlineUsers.length === 0 ? (
                      <p className="text-gray-600 text-xs text-center py-5">Niemand anderes online</p>
                    ) : (
                      onlineUsers.map((u) => (
                        <div
                          key={u.userId}
                          className="flex items-center justify-between px-4 py-2.5 hover:bg-white/5 group"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0" />
                            <span className="text-sm text-gray-200 truncate">{u.username}</span>
                          </div>
                          <button
                            onClick={() => { setMessageTarget(u); setBubbleOpen(false); }}
                            disabled={cooldown > 0}
                            className="text-xs text-primary-400 hover:text-primary-300 opacity-0 group-hover:opacity-100 transition-opacity disabled:text-gray-600 disabled:cursor-not-allowed ml-2 flex-shrink-0"
                            title={cooldown > 0 ? `Cooldown: ${cooldown}s` : 'Nachricht senden'}
                          >
                            {cooldown > 0 ? `${cooldown}s` : '✉'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Toggle bubble */}
            <button
              onClick={() => setBubbleOpen((p) => !p)}
              className="flex items-center gap-2 bg-[#111827] border border-white/10 hover:border-green-500/30 rounded-full px-4 py-2.5 shadow-xl transition-colors duration-200"
            >
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm font-semibold text-gray-200">
                {onlineUsers.length} online
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Message Compose Modal ── */}
      <AnimatePresence>
        {messageTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4"
            onClick={() => setMessageTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 12 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="bg-[#111827] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-semibold text-gray-300 mb-0.5">
                Nachricht an <span className="text-white">{messageTarget.username}</span>
              </h3>
              <p className="text-xs text-gray-600 mb-4">Sofortnachricht — wird nirgends gespeichert.</p>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value.slice(0, 120))}
                placeholder="Komm Poker spielen!"
                rows={2}
                className="w-full bg-[#0a0e1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-primary-600/50 mb-3"
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                autoFocus
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">{messageText.length}/120</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMessageTarget(null)}
                    className="px-4 py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={sendMessage}
                    disabled={!messageText.trim() || cooldown > 0}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl text-sm font-semibold transition-colors"
                  >
                    Senden
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
