import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface OnlineUser {
  userId: string;
  username: string;
}

export interface IncomingMessage {
  fromUsername: string;
  message: string;
}

interface SocketContextType {
  socket: Socket | null;
  onlineUsers: OnlineUser[]; // everyone online except self
  incomingMessage: IncomingMessage | null;
  clearIncomingMessage: () => void;
}

// ── Context ───────────────────────────────────────────────────────────────────
const SocketContext = createContext<SocketContextType>({
  socket: null,
  onlineUsers: [],
  incomingMessage: null,
  clearIncomingMessage: () => {},
});

// ── Provider ──────────────────────────────────────────────────────────────────
// Establishes a single Socket.io connection for any logged-in user.
// The socket is automatically created on login and destroyed on logout/unmount.
// All pages benefit from this — the online-users list reflects everyone with
// an Essensgruppe tab open, regardless of which page they're viewing.
export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [incomingMessage, setIncomingMessage] = useState<IncomingMessage | null>(null);
  const incomingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');

    // No token / not logged in → ensure disconnected
    if (!user || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setOnlineUsers([]);
      return;
    }

    // Connect on login
    const socket = io({ auth: { token }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    // Server broadcasts all online users on any connect/disconnect
    socket.on('site:online_users', (users: OnlineUser[]) => {
      setOnlineUsers(users.filter(u => u.userId !== user.id));
    });

    // Global message toast — works anywhere on the site
    socket.on('games:receive_message', (data: IncomingMessage) => {
      setIncomingMessage(data);
      if (incomingTimeout.current) clearTimeout(incomingTimeout.current);
      incomingTimeout.current = setTimeout(() => setIncomingMessage(null), 6000);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      if (incomingTimeout.current) clearTimeout(incomingTimeout.current);
    };
  }, [user?.id]); // re-run only when the logged-in user changes

  const clearIncomingMessage = () => {
    setIncomingMessage(null);
    if (incomingTimeout.current) clearTimeout(incomingTimeout.current);
  };

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, onlineUsers, incomingMessage, clearIncomingMessage }}>
      {children}
    </SocketContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export const useSocket = () => useContext(SocketContext);
