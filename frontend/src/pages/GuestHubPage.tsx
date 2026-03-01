import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGuest } from '../contexts/GuestContext';

interface GuestGameCard {
  id: string;
  icon: string;
  name: string;
  description: string;
  route: string;
  gradient: string;
  border: string;
  accent: string;
  glow: string;
  badge?: string;
}

const GUEST_GAMES: GuestGameCard[] = [
  {
    id: 'blackjack',
    icon: '🃏',
    name: 'Blackjack',
    description: 'Schlage den Dealer mit 21, ohne zu überziehen.',
    route: '/games/guest/blackjack',
    gradient: 'from-emerald-900/50 to-emerald-800/20',
    border: 'border-emerald-700/40',
    accent: 'text-emerald-300',
    glow: 'hover:shadow-emerald-900/60',
  },
  {
    id: 'slots',
    icon: '🎰',
    name: 'Slots',
    description: 'Drehe die Walzen und treffe Symbole, um groß zu gewinnen.',
    route: '/games/guest/slots',
    gradient: 'from-purple-900/50 to-purple-800/20',
    border: 'border-purple-700/40',
    accent: 'text-purple-300',
    glow: 'hover:shadow-purple-900/60',
  },
  {
    id: 'mines',
    icon: '💣',
    name: 'Mines',
    description: 'Decke Felder auf, meide Minen und kassiere, bevor es zu spät ist.',
    route: '/games/guest/mines',
    gradient: 'from-red-900/50 to-red-800/20',
    border: 'border-red-700/40',
    accent: 'text-red-300',
    glow: 'hover:shadow-red-900/60',
  },
  {
    id: 'poker',
    icon: '♠️',
    name: 'Poker',
    description: "Texas Hold'em mit anderen Gästen. Separate Tische — kein Account nötig.",
    route: '/games/guest/poker',
    gradient: 'from-sky-900/50 to-sky-800/20',
    border: 'border-sky-700/40',
    accent: 'text-sky-300',
    glow: 'hover:shadow-sky-900/60',
  },
];

export const GuestHubPage = () => {
  const { balance } = useGuest();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#080d1a] text-white py-10 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-900/30 border border-violet-700/40 text-violet-300 text-xs font-semibold mb-5">
            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
            Gastmodus
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">Willkommen, Gast!</h1>
          <p className="text-gray-400 text-sm max-w-md">
            Spiele ohne Account — 1.000 Münzen pro Sitzung. Die Münzen werden nicht gespeichert.
          </p>

          {/* Session balance */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-5 inline-flex items-center gap-3 bg-[#111827] border border-yellow-800/40 rounded-2xl px-5 py-3"
          >
            <span className="text-yellow-400 text-2xl">🪙</span>
            <div>
              <p className="text-xs text-gray-500 font-medium leading-none mb-0.5">Sitzungsguthaben</p>
              <p className="text-2xl font-bold text-yellow-400 tabular-nums">{balance.toLocaleString()}</p>
            </div>
          </motion.div>
        </motion.div>

        {/* Game cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5">
          {GUEST_GAMES.map((game, i) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.35 }}
              className={`relative bg-gradient-to-br ${game.gradient} border ${game.border} rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${game.glow} ${game.badge ? 'opacity-60 cursor-not-allowed' : ''}`}
              onClick={() => { if (!game.badge) navigate(game.route); }}
            >
              {game.badge && (
                <div className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-[#111827] border border-white/10 text-gray-500 text-[10px] font-semibold tracking-wide uppercase">
                  {game.badge}
                </div>
              )}
              <div className="text-4xl mb-4 select-none">{game.icon}</div>
              <h3 className={`text-xl font-bold mb-2 ${game.accent}`}>{game.name}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{game.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Register CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-10 p-5 rounded-2xl bg-[#111827] border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div>
            <p className="text-sm font-semibold text-gray-200">Möchtest du Coins dauerhaft behalten?</p>
            <p className="text-xs text-gray-500 mt-0.5">Erstelle ein kostenloses Konto und erhalte täglich 1.000 Coins.</p>
          </div>
          <button
            onClick={() => navigate('/register')}
            className="flex-shrink-0 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 rounded-xl text-sm font-semibold transition-colors"
          >
            Jetzt registrieren
          </button>
        </motion.div>
      </div>
    </div>
  );
};
