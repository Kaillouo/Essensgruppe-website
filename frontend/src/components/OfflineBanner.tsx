import { AnimatePresence, motion } from 'framer-motion';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ type: 'spring', stiffness: 340, damping: 30 }}
          className="w-full bg-[#1a1200] border-b border-yellow-500/30 px-4 py-2 flex items-center justify-center gap-2 text-sm text-yellow-400"
        >
          <span className="text-yellow-500">⚠</span>
          Kein Internet — du siehst zwischengespeicherte Inhalte. Einige Funktionen sind nicht verfügbar.
        </motion.div>
      )}
    </AnimatePresence>
  );
}
