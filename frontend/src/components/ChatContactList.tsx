import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { ApiService } from '../services/api.service';
import { ChatContact, ChatUser } from '../types';

interface Props {
  onSelectContact: (user: ChatUser) => void;
  onSelectAI: () => void;
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'gerade eben';
  if (mins < 60) return `${mins} Min.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} Std.`;
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

export function ChatContactList({ onSelectContact, onSelectAI }: Props) {
  const { onlineUsers, latestChatMessage } = useSocket();
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
  const [searching, setSearching] = useState(false);

  const loadContacts = useCallback(async () => {
    try {
      const data = await ApiService.getChatContacts() as ChatContact[];
      setContacts(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  // Refresh contact list when a new message arrives
  useEffect(() => {
    if (latestChatMessage) {
      loadContacts();
    }
  }, [latestChatMessage, loadContacts]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await ApiService.searchChatUsers(searchQuery) as ChatUser[];
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function startChat(user: ChatUser) {
    setSearchQuery('');
    setSearchResults([]);
    onSelectContact(user);
  }

  function getAvatarUrl(url: string | null) {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `http://localhost:3000${url}`;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-white/10 flex-shrink-0">
        <h3 className="text-sm font-semibold text-white mb-2">Chats</h3>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Benutzer suchen..."
          className="w-full bg-white/10 border border-white/10 rounded-full px-3 py-1.5 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500/50"
        />
      </div>

      {/* Search results */}
      {searchQuery.trim() && (
        <div className="flex-shrink-0 border-b border-white/10">
          {searching && (
            <p className="text-xs text-gray-500 px-3 py-2">Suche...</p>
          )}
          {!searching && searchResults.length === 0 && (
            <p className="text-xs text-gray-500 px-3 py-2">Kein Benutzer gefunden</p>
          )}
          {searchResults.map((u) => (
            <button
              key={u.id}
              onClick={() => startChat(u)}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors text-left"
            >
              {getAvatarUrl(u.avatarUrl) ? (
                <img src={getAvatarUrl(u.avatarUrl)!} alt={u.username} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-indigo-600/40 flex items-center justify-center text-xs font-bold text-indigo-300 flex-shrink-0">
                  {u.username[0].toUpperCase()}
                </div>
              )}
              <span className="text-sm text-white">{u.username}</span>
              <span className="ml-auto text-xs text-indigo-400">Nachricht</span>
            </button>
          ))}
        </div>
      )}

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* AI Bot — always at top */}
        <button
          onClick={onSelectAI}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/5 transition-colors text-left border-b border-white/5"
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-base flex-shrink-0">
            🤖
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white">KI-Assistent</p>
            <p className="text-xs text-purple-400 truncate">Powered by Claude</p>
          </div>
        </button>

        {contacts.length === 0 && !searchQuery && (
          <div className="text-center text-gray-600 text-xs mt-6 px-4">
            <p>Noch keine Kontakte</p>
            <p className="mt-1">Suche nach Benutzern oben</p>
          </div>
        )}

        {contacts.map((c) => {
          const isOnline = onlineUsers.some((u) => u.userId === c.user.id);
          const avatarUrl = getAvatarUrl(c.user.avatarUrl);
          return (
            <button
              key={c.id}
              onClick={() => onSelectContact(c.user)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
            >
              <div className="relative flex-shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={c.user.username} className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-indigo-600/40 flex items-center justify-center text-sm font-bold text-indigo-300">
                    {c.user.username[0].toUpperCase()}
                  </div>
                )}
                {isOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border border-gray-900" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-sm font-medium text-white truncate">{c.user.username}</p>
                  {c.lastMessage && (
                    <span className="text-[10px] text-gray-600 flex-shrink-0">{formatTime(c.lastMessage.createdAt)}</span>
                  )}
                </div>
                {c.lastMessage && (
                  <p className="text-xs text-gray-500 truncate">
                    {c.lastMessage.fromMe ? 'Du: ' : ''}{c.lastMessage.content}
                  </p>
                )}
              </div>
              {c.unreadCount > 0 && (
                <span className="flex-shrink-0 bg-indigo-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {c.unreadCount > 9 ? '9+' : c.unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
