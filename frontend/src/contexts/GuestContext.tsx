import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// Generates a UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface GuestContextType {
  guestId: string;
  balance: number;
  setBalance: (b: number) => void;
  refreshBalance: () => Promise<void>;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

export const useGuest = () => {
  const ctx = useContext(GuestContext);
  if (!ctx) throw new Error('useGuest must be used within GuestProvider');
  return ctx;
};

export const GuestProvider = ({ children }: { children: ReactNode }) => {
  const [guestId] = useState<string>(() => {
    const existing = sessionStorage.getItem('guestId');
    if (existing) return existing;
    const id = generateUUID();
    sessionStorage.setItem('guestId', id);
    return id;
  });

  const [balance, setBalanceState] = useState<number>(1000);

  // Initialize session on mount
  useEffect(() => {
    const init = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || '/api';
        const res = await fetch(`${API_URL}/guest/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guestId }),
        });
        if (res.ok) {
          const data = await res.json();
          setBalanceState(data.balance);
        }
      } catch {
        // If network fails, keep default 1000
      }
    };
    init();
  }, [guestId]);

  const setBalance = useCallback((b: number) => {
    setBalanceState(b);
  }, []);

  const refreshBalance = useCallback(async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(`${API_URL}/guest/balance`, {
        headers: { 'x-guest-id': guestId },
      });
      if (res.ok) {
        const data = await res.json();
        setBalanceState(data.balance);
      }
    } catch {
      // ignore
    }
  }, [guestId]);

  return (
    <GuestContext.Provider value={{ guestId, balance, setBalance, refreshBalance }}>
      {children}
    </GuestContext.Provider>
  );
};
