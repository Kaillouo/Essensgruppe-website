import { motion } from 'framer-motion';

export const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-16 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-2xl"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-10">Datenschutz</h1>
        <p className="text-2xl md:text-3xl font-semibold text-gray-800 leading-relaxed">
          wir mögen kein Bürokraitie, Leider kein Privatsphär versprochen.
          <br />
          Wir Vertrauen!
        </p>
      </motion.div>
    </div>
  );
};
