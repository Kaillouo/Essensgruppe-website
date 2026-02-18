import { motion } from 'framer-motion';

export const MinecraftPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Minecraft Server</h1>
          <p className="text-xl text-gray-600 mb-8">Server info page coming in Phase 3</p>

          <div className="card max-w-2xl mx-auto">
            <div className="text-6xl mb-4">⛏️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Under Construction</h2>
            <p className="text-gray-600 mb-4">
              This page will feature:
            </p>
            <ul className="text-left text-gray-600 space-y-2">
              <li>• Server IP with copy button</li>
              <li>• Embedded BlueMap (already running on port 8100)</li>
              <li>• Server announcements</li>
              <li>• Rules and guidelines</li>
              <li>• Player leaderboards</li>
              <li>• How to join instructions</li>
              <li>• Server status indicator</li>
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
