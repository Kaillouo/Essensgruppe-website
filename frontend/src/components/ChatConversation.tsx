import { useState, useRef, useEffect, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { ApiService } from '../services/api.service';
import { DirectMessage, ChatUser } from '../types';

interface Props {
  contact: ChatUser;
  onBack: () => void;
  onRemoveContact: (userId: string) => void;
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'gerade eben';
  if (mins < 60) return `vor ${mins} Min.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

export function ChatConversation({ contact, onBack, onRemoveContact }: Props) {
  const { user } = useAuth();
  const { socket, onlineUsers, latestChatMessage } = useSocket();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isOnline = onlineUsers.some((u) => u.userId === contact.id);

  const loadMessages = useCallback(async () => {
    try {
      const msgs = await ApiService.getChatMessages(contact.id) as DirectMessage[];
      setMessages(msgs);
      // Mark as read
      socket?.emit('chat:read', { fromUserId: contact.id });
    } catch {
      // ignore
    }
  }, [contact.id, socket]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Check if contact is blocked
  useEffect(() => {
    ApiService.getBlocks().then((blocks: any[]) => {
      setIsBlocked(blocks.some((b: any) => b.blockedId === contact.id));
    }).catch(() => {});
  }, [contact.id]);

  async function toggleBlock() {
    setBlockLoading(true);
    try {
      if (isBlocked) {
        await ApiService.unblockUser(contact.id);
        setIsBlocked(false);
      } else {
        await ApiService.blockUser(contact.id);
        setIsBlocked(true);
      }
    } catch {
      // ignore
    } finally {
      setBlockLoading(false);
    }
  }

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Listen for incoming messages from this contact
  useEffect(() => {
    if (!latestChatMessage) return;
    const msg = latestChatMessage;
    const isRelevant =
      (msg.senderId === contact.id && msg.receiverId === user?.id) ||
      (msg.senderId === user?.id && msg.receiverId === contact.id);
    if (!isRelevant) return;

    setMessages((prev) => {
      // avoid duplicates
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
    // Mark as read when conversation is open
    if (msg.senderId === contact.id) {
      socket?.emit('chat:read', { fromUserId: contact.id });
    }
  }, [latestChatMessage, contact.id, user?.id, socket]);

  // Typing indicator from socket
  useEffect(() => {
    if (!socket) return;
    const handler = ({ fromUserId }: { fromUserId: string }) => {
      if (fromUserId !== contact.id) return;
      setIsTyping(true);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => setIsTyping(false), 3000);
    };
    socket.on('chat:typing_indicator', handler);
    return () => {
      socket.off('chat:typing_indicator', handler);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
  }, [socket, contact.id]);

  function sendMessage() {
    const text = input.trim();
    if (!text || !socket) return;
    socket.emit('chat:send', { toUserId: contact.id, content: text });
    setInput('');
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else {
      // Emit typing indicator (throttle: don't spam on every keystroke)
      socket?.emit('chat:typing', { toUserId: contact.id });
    }
  }

  function handleDelete() {
    onRemoveContact(contact.id);
  }

  const avatarUrl = contact.avatarUrl
    ? (contact.avatarUrl.startsWith('http') ? contact.avatarUrl : `http://localhost:3000${contact.avatarUrl}`)
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/10 flex-shrink-0">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white transition-colors p-1 rounded"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt={contact.username} className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-indigo-600/40 flex items-center justify-center text-xs font-bold text-indigo-300">
                {contact.username[0].toUpperCase()}
              </div>
            )}
            {isOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border border-gray-900" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-none">{contact.username}</p>
            <p className={`text-xs mt-0.5 ${isOnline ? 'text-green-400' : 'text-gray-500'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
        <button
          onClick={toggleBlock}
          disabled={blockLoading}
          title={isBlocked ? 'Entsperren' : 'Blockieren'}
          className={`transition-colors p-1 rounded flex-shrink-0 ${isBlocked ? 'text-green-400 hover:text-green-300' : 'text-gray-500 hover:text-orange-400'}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          title="Kontakt entfernen"
          className="text-gray-500 hover:text-red-400 transition-colors p-1 rounded flex-shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div className="flex-shrink-0 bg-red-900/30 border-b border-red-500/20 px-3 py-2 flex items-center justify-between gap-2">
          <p className="text-xs text-red-300">Kontakt entfernen?</p>
          <div className="flex gap-1.5">
            <button
              onClick={handleDelete}
              className="text-xs bg-red-600 hover:bg-red-500 text-white px-2 py-0.5 rounded transition-colors"
            >
              Ja
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="text-xs bg-white/10 hover:bg-white/20 text-gray-300 px-2 py-0.5 rounded transition-colors"
            >
              Nein
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 text-xs mt-6 px-4">
            <p>Noch keine Nachrichten.</p>
            <p className="mt-1 text-gray-600">Nachrichten werden nach 24 Stunden gelöscht.</p>
          </div>
        )}
        {messages.map((msg) => {
          const fromMe = msg.senderId === user?.id;
          return (
            <div key={msg.id} className={`flex flex-col ${fromMe ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  fromMe
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-white/10 text-gray-200 rounded-bl-sm'
                }`}
              >
                {msg.content}
              </div>
              <span className="text-[10px] text-gray-600 mt-0.5 px-1">{formatTime(msg.createdAt)}</span>
            </div>
          );
        })}
        {isTyping && (
          <div className="flex items-start">
            <div className="bg-white/10 rounded-2xl rounded-bl-sm px-3 py-2">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-3 py-2.5 border-t border-white/10">
        {isBlocked ? (
          <p className="text-xs text-center text-orange-400 py-1">Du hast diesen Nutzer blockiert. Entsperre ihn, um Nachrichten zu senden.</p>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Nachricht schreiben..."
              className="flex-1 bg-white/10 border border-white/10 rounded-full px-3 py-1.5 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500/50"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
