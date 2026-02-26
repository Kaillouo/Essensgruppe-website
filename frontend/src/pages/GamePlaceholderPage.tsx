import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';

const gameInfo: Record<string, { name: string; icon: string; category: string; description: string }> = {
  slots: {
    name: 'Slots',
    icon: '🎰',
    category: 'Einzelspieler',
    description: 'Walzen drehen, Symbole kombinieren, gewinnen.',
  },
  blackjack: {
    name: 'Blackjack',
    icon: '🃏',
    category: 'Einzelspieler',
    description: 'Den Dealer mit 21 schlagen.',
  },
  mines: {
    name: 'Mines',
    icon: '💣',
    category: 'Einzelspieler',
    description: 'Felder aufdecken, Minen meiden, kassieren.',
  },
  poker: {
    name: 'Poker',
    icon: '♠️',
    category: 'Multiplayer',
    description: "Texas Hold'em mit echten Spielern.",
  },
  prediction: {
    name: 'Prediction Market',
    icon: '🔮',
    category: 'Multiplayer',
    description: 'Auf Ja/Nein-Ergebnisse mit anderen Spielern wetten.',
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
          <p className="text-yellow-400 font-semibold mb-1">Demnächst verfügbar</p>
          <p className="text-gray-500 text-sm">
            Dieses Spiel ist noch in Entwicklung. Schau bald wieder vorbei!
          </p>
        </div>

        <button
          onClick={() => navigate('/games')}
          className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 rounded-xl text-sm font-semibold transition-colors duration-150"
        >
          ← Zurück zu Games
        </button>
      </motion.div>
    </div>
  );
};
