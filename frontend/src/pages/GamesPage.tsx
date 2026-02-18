import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

export const GamesPage = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900">Gambling Games</h1>
            <div className="px-6 py-3 bg-yellow-100 rounded-lg">
              <span className="text-sm text-gray-600">Your Balance: </span>
              <span className="text-2xl font-bold text-yellow-600">{user?.balance || 0}</span>
              <span className="text-sm text-gray-600"> coins</span>
            </div>
          </div>

          <div className="card max-w-2xl mx-auto text-center">
            <div className="text-6xl mb-4">🎲</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Coming in Phase 4</h2>
            <p className="text-gray-600 mb-4">
              The gambling framework will include:
            </p>
            <ul className="text-left text-gray-600 space-y-2">
              <li>• Multiple game types (coin flip, dice, etc.)</li>
              <li>• Real-time gameplay via WebSocket</li>
              <li>• Balance management system</li>
              <li>• Transaction history</li>
              <li>• Game statistics and leaderboards</li>
              <li>• 5% house edge on all games</li>
            </ul>
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <p className="text-green-700">
                <strong>Good news!</strong> You already have {user?.balance || 1000} coins to get started when games launch!
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
