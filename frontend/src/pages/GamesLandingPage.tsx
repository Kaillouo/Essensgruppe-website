import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { DailyCoinsClaim } from '../components/DailyCoinsClaim';

interface ModeCard {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  route: string;
  gradient: string;
  border: string;
  accent: string;
  glow: string;
}

const MODES: ModeCard[] = [
  {
    id: 'singleplayer',
    icon: '🎮',
    title: 'Einzelspieler',
    subtitle: '3 Spiele',
    description: 'Spiele allein gegen die Bank. Blackjack, Slots und Mines — jederzeit verfügbar.',
    route: '/games/singleplayer',
    gradient: 'from-emerald-900/40 to-emerald-800/10',
    border: 'border-emerald-700/35',
    accent: 'text-emerald-300',
    glow: 'group-hover:shadow-emerald-900/50',
  },
  {
    id: 'multiplayer',
    icon: '👥',
    title: 'Mehrspieler',
    subtitle: '2 Spiele',
    description: 'Tritt gegen andere Mitglieder an. Live-Poker und Vorhersagemarkt.',
    route: '/games/multiplayer',
    gradient: 'from-sky-900/40 to-sky-800/10',
    border: 'border-sky-700/35',
    accent: 'text-sky-300',
    glow: 'group-hover:shadow-sky-900/50',
  },
  {
    id: 'guest',
    icon: '👤',
    title: 'Gastmodus',
    subtitle: 'Kein Account nötig',
    description: 'Teile den Gastmodus-Link mit jemandem. 1.000 Münzen pro Sitzung, keine Registrierung.',
    route: '/games/guest',
    gradient: 'from-violet-900/40 to-violet-800/10',
    border: 'border-violet-700/35',
    accent: 'text-violet-300',
    glow: 'group-hover:shadow-violet-900/50',
  },
];

export const GamesLandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#080d1a] text-white py-10 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col lg:flex-row lg:items-end lg:justify-between mb-12 gap-4"
        >
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">🎲 Spiele</h1>
            <p className="text-gray-500 text-sm">Wähle deinen Spielmodus</p>
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

        {/* Mode cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {MODES.map((mode, i) => (
            <motion.div
              key={mode.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              onClick={() => navigate(mode.route)}
              className={`group relative bg-gradient-to-br ${mode.gradient} border ${mode.border} rounded-2xl p-7 cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl ${mode.glow}`}
            >
              {/* Icon */}
              <div className="text-5xl mb-5 select-none">{mode.icon}</div>

              {/* Title + subtitle */}
              <div className="mb-3">
                <h2 className={`text-xl font-bold ${mode.accent}`}>{mode.title}</h2>
                <p className="text-xs text-gray-500 mt-0.5 font-medium">{mode.subtitle}</p>
              </div>

              {/* Description */}
              <p className="text-gray-400 text-sm leading-relaxed">{mode.description}</p>

              {/* Arrow */}
              <div className={`absolute top-6 right-6 ${mode.accent} opacity-0 group-hover:opacity-60 transition-opacity duration-200`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-gray-600 text-xs mt-10"
        >
          Alle Coins sind virtuell — kein Echtgeld.
        </motion.p>
      </div>
    </div>
  );
};
