// In-memory guest session store.
// Sessions are ephemeral — reset on server restart, expire after 30 minutes of inactivity.

interface GuestSession {
  balance: number;
  lastSeen: number;
}

const INITIAL_BALANCE = 1000;
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

export const guestSessions = new Map<string, GuestSession>();

export function getOrCreateGuest(guestId: string): GuestSession {
  let session = guestSessions.get(guestId);
  if (!session) {
    session = { balance: INITIAL_BALANCE, lastSeen: Date.now() };
    guestSessions.set(guestId, session);
  }
  session.lastSeen = Date.now();
  return session;
}

export function getGuestBalance(guestId: string): number | null {
  const session = guestSessions.get(guestId);
  if (!session) return null;
  session.lastSeen = Date.now();
  return session.balance;
}

// Returns new balance. Throws if session not found or insufficient balance.
export function adjustGuestBalance(guestId: string, delta: number): number {
  const session = guestSessions.get(guestId);
  if (!session) throw new Error('Gast-Sitzung nicht gefunden.');
  const next = session.balance + delta;
  if (next < 0) throw new Error('Nicht genug Sitzungsguthaben.');
  session.balance = next;
  session.lastSeen = Date.now();
  return session.balance;
}

// Cleanup idle sessions every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of guestSessions.entries()) {
    if (now - session.lastSeen > SESSION_TTL_MS) {
      guestSessions.delete(id);
    }
  }
}, 10 * 60 * 1000);
