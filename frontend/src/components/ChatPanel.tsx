import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatContactList } from './ChatContactList';
import { ChatConversation } from './ChatConversation';
import { ChatAIConversation } from './ChatAIConversation';
import { ApiService } from '../services/api.service';
import { ChatUser } from '../types';

type View = 'contacts' | 'chat' | 'ai';

interface Props {
  isOpen: boolean;
  /** Distance from screen bottom in px (default 80 = above standard bubble/navbar) */
  bottomOffset?: number;
}

export function ChatPanel({ isOpen, bottomOffset = 80 }: Props) {
  const [view, setView] = useState<View>('contacts');
  const [activeContact, setActiveContact] = useState<ChatUser | null>(null);

  function openContact(user: ChatUser) {
    setActiveContact(user);
    setView('chat');
  }

  function goBack() {
    setView('contacts');
    setActiveContact(null);
  }

  async function removeContact(userId: string) {
    try {
      await ApiService.removeChatContact(userId);
    } catch {
      // ignore
    }
    goBack();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          className="fixed w-[340px] h-[480px] z-[9997] rounded-2xl overflow-hidden shadow-2xl"
          style={{
            bottom: `${bottomOffset}px`,
            right: '24px',
            background: 'rgba(17, 24, 39, 0.88)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {view === 'contacts' && (
            <ChatContactList onSelectContact={openContact} onSelectAI={() => setView('ai')} />
          )}
          {view === 'chat' && activeContact && (
            <ChatConversation
              contact={activeContact}
              onBack={goBack}
              onRemoveContact={removeContact}
            />
          )}
          {view === 'ai' && (
            <ChatAIConversation onBack={goBack} />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
