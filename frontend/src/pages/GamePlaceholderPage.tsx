import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';

const gameInfo: Record<string, { name: string; icon: string; category: string; description: string }> = {
  slots: {
    name: 'Slots',
    icon: '🎰',
    category: 'Single Player',
    description: 'Spinning reels with symbols. Match to win.',
  },
  blackjack: {
    name: 'Blackjack',
    icon: '🃏',
    category: 'Single Player',
    description: 'Beat the dealer to 21.',
  },
  mines: {
    name: 'Mines',
    icon: '💣',
    category: 'Single Player',
    description: 'Reveal tiles, avoid mines, cash out.',
  },
  poker: {
    name: 'Poker',
    icon: '♠️',
    category: 'Multiplayer',
    description: "Texas Hold'em with live players.",
  },
  prediction: {
    name: 'Prediction Market',
    icon: '🔮',
    category: 'Multiplayer',
    description: 'Bet on Yes/No outcomes with other players.',
  },
};

export const GamePlaceholderPage = () => {
  const { game } = useParams<{ game: string }>();
  const navigate = useNavigate();
  const info = game ? gameInfo[game] : undefined;

  return (
    <div className="min-h-screen bg-[#080d1a] text-white flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center max-w-md"
      >
        <div className="text-7xl mb-6">{info?.icon ?? '🎲'}</div>

        <h1 className="text-3xl font-bold text-white mb-2">{info?.name ?? 'Game'}</h1>

        {info && (
          <span className="inline-block text-xs px-3 py-1 bg-primary-600/20 border border-primary-600/30 text-primary-300 rounded-full mb-4">
            {info.category}
          </span>
        )}

        <p className="text-gray-400 mb-8">{info?.description}</p>

        <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 mb-8">
          <p className="text-yellow-400 font-semibold mb-1">Coming Soon</p>
          <p className="text-gray-500 text-sm">
            This game is currently in development. Check back soon!
          </p>
        </div>

        <button
          onClick={() => navigate('/games')}
          className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 rounded-xl text-sm font-semibold transition-colors duration-150"
        >
          ← Back to Games
        </button>
      </motion.div>
    </div>
  );
};
