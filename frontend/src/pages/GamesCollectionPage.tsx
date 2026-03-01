import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { DailyCoinsClaim } from '../components/DailyCoinsClaim';

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
  badge?: string;
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
    badge: 'Live',
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
    badge: 'Offen',
  },
];

interface Props {
  mode: 'singleplayer' | 'multiplayer';
}

export const GamesCollectionPage = ({ mode }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const games = mode === 'singleplayer' ? singlePlayerGames : multiplayerGames;
  const title = mode === 'singleplayer' ? '🎮 Einzelspieler' : '👥 Mehrspieler';
  const desc = mode === 'singleplayer'
    ? 'Spiele allein gegen die Bank. Jederzeit verfügbar, kein Warten.'
    : 'Tritt gegen andere Online-Mitglieder an. Live-Spiele mit echten Spielern.';

  return (
    <div className="min-h-screen bg-[#080d1a] text-white py-8 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-4"
        >
          <div>
            {/* Back link */}
            <Link
              to="/games"
              className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-xs font-medium transition-colors mb-3"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Spielübersicht
            </Link>
            <h1 className="text-3xl font-bold text-white">{title}</h1>
            <p className="text-gray-500 mt-1 text-sm">{desc}</p>
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

        {/* Game cards */}
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {games.map((game, i) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.3 }}
                className={`bg-gradient-to-br ${game.gradient} border ${game.border} rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${game.glowColor}`}
                onClick={() => navigate(game.route)}
              >
                {game.badge && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    {game.badge}
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
    </div>
  );
};
