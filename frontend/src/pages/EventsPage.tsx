import { motion } from 'framer-motion';

export const EventsPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">ABI 27 Events</h1>
          <p className="text-xl text-gray-600 mb-8">Event planning system coming in Phase 3</p>

          <div className="card max-w-2xl mx-auto">
            <div className="text-6xl mb-4">📅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Under Construction</h2>
            <p className="text-gray-600 mb-4">
              The event planning system will include:
            </p>
            <ul className="text-left text-gray-600 space-y-2">
              <li>• Submit event proposals</li>
              <li>• Vote on proposed events</li>
              <li>• Task assignment and planning</li>
              <li>• Event photo galleries</li>
              <li>• Social media links integration</li>
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
