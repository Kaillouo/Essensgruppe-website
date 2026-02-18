import { motion } from 'framer-motion';

export const LinksPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Links & Resources</h1>
          <p className="text-xl text-gray-600 mb-8">Resource hub coming in Phase 3</p>

          <div className="card max-w-2xl mx-auto">
            <div className="text-6xl mb-4">🔗</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Under Construction</h2>
            <p className="text-gray-600 mb-4">
              This section will include:
            </p>
            <ul className="text-left text-gray-600 space-y-2">
              <li>• Teacher contact list</li>
              <li>• Class schedules (Stundenplan)</li>
              <li>• School website links</li>
              <li>• Moodle and other resources</li>
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
