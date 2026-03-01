import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../contexts/SocketContext';

/**
 * Floating chat bubble — only rendered on pages without a Navbar
 * (landing page). On all other pages chat is accessible via the Navbar icon.
 */
export function ChatBubble() {
  const { chatOpen, toggleChat, unreadChatCount } = useSocket();

  return (
    <motion.button
      onClick={toggleChat}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.94 }}
      className="fixed bottom-6 right-6 z-[9998] w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-900/50 flex items-center justify-center transition-colors"
      aria-label="Chat öffnen"
    >
      <AnimatePresence mode="wait">
        {chatOpen ? (
          <motion.svg
            key="close"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </motion.svg>
        ) : (
          <motion.svg
            key="chat"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="w-5 h-5 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
          </motion.svg>
        )}
      </AnimatePresence>

      {/* Unread badge */}
      {!chatOpen && unreadChatCount > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-0.5 leading-none"
        >
          {unreadChatCount > 99 ? '99+' : unreadChatCount}
        </motion.span>
      )}
    </motion.button>
  );
}
