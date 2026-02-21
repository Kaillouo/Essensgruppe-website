# Poker (Texas Hold'em) — Implementation Plan

**Last Updated:** 2026-02-19
**Branch:** forumnEvents
**Phase:** 4.2b — Enhancement Pass

---

## Current Status

### What Is Already Built and Working

| Feature | Status | Notes |
|---------|--------|-------|
| 10-seat table | ✅ Done | Backend `Array(10)`, frontend 10 SEAT_POS positions |
| CSS 3D table + rotateZ drag | ✅ Done | `perspective(900px) rotateX(22deg) rotateZ(${z}deg)`, drag to spin |
| Seats follow rotation | ✅ Done | Counter-rotate inner content so avatars stay upright |
| Full Hold'em game logic | ✅ Done | PREFLOP→FLOP→TURN→RIVER→SHOWDOWN state machine |
| Cryptographic shuffle | ✅ Done | `crypto.randomInt` Fisher-Yates |
| Watcher tracking (backend) | ✅ Done | `tableWatchers` Map, included in public state |
| Watcher data in frontend state | ✅ Done | `tableState.watchers[]` is populated |
| 4-emoji emote system | ✅ Done | 😂 😤 🔥 💀 — floats above seat, 2 s fade |
| 50-char chat bubble | ✅ Done | Speech bubble above seat, 2 s fade |
| Hand result overlay | ✅ Done | Winner name + hand name, auto-dismiss |
| Hole cards private | ✅ Done | `poker:my_cards` sent only to owner |
| DB balance integration | ✅ Done | GAME_BET / GAME_WIN transactions |
| Disconnect auto-fold | ✅ Done | Saves balance on disconnect |
| `resolveNoShowdown()` | ✅ Done | Last player after folds wins pot |

### What Is Missing (New Features to Build)

1. **Watcher Avatar Display** — watchers are tracked but never shown visually on the page
2. **Queue System** — table full sends an error; should put player in a queue instead
3. **1-Player Mode** — currently requires 2+ to start a hand; solo player should be able to play
4. **Spline 3D Table** — CSS 3D works, but the plan called for an actual Spline scene
5. **Expanded Emote Picker** — currently 4 emojis; expand to 8 with more expressions

---

## Feature 1 — Watcher Avatar Display

### Visual Design

Spectators (anyone with the poker tab open who hasn't sat down) should appear in a
translucent strip at the **top of the screen**, behind the header bar:

```
┌────────────────────────────────────────────────────────────┐
│  👁 Watching (3)  [Avatar] [Avatar] [Avatar]                │  ← watcher strip
├────────────────────────────────────────────────────────────┤
│  [← Back]                    Poker  [WAITING]  ⚖ 1234 EG  │  ← header
│                                                            │
│              ... table ...                                 │
```

Alternative option (if top is too crowded): a collapsible sidebar on the right edge.
Recommended: **top strip**, always visible.

### Backend Changes

`publicState()` in `poker.socket.ts` currently sends watchers as `{ userId, avatarUrl }`.
**Add `username`** so the frontend can show a tooltip on hover:

```typescript
// In publicState():
watchers: Array.from(tableWatchers.values()).map((w) => ({
  userId: w.userId,
  username: w.username,   // ← add this
  avatarUrl: w.avatarUrl,
})),
```

Also update the `PublicWatcher` type in `PokerPage.tsx` to include `username`.

### Frontend Changes — `PokerPage.tsx`

```tsx
// Add watcher strip component above header (or inside header row):
{tableState && tableState.watchers.length > 0 && (
  <div className="flex items-center gap-2 px-5 py-1.5 bg-black/30 backdrop-blur-sm border-b border-white/5">
    <span className="text-white/30 text-[11px] font-semibold tracking-wider">
      👁 {tableState.watchers.length} watching
    </span>
    <div className="flex -space-x-2">
      {tableState.watchers.map((w) => (
        <div
          key={w.userId}
          title={w.username}
          className="w-7 h-7 rounded-full border-2 border-black/40 overflow-hidden bg-gray-700 flex-shrink-0"
        >
          {w.avatarUrl
            ? <img src={w.avatarUrl} alt={w.username} className="w-full h-full object-cover" />
            : <span className="text-[10px] text-white/60 font-bold flex items-center justify-center h-full">
                {w.username[0]?.toUpperCase()}
              </span>
          }
        </div>
      ))}
    </div>
  </div>
)}
```

Watchers who sit down are automatically removed from the watcher strip (already handled in backend).

---

## Feature 2 — Queue System

### Behavior

- Table has 10 seats max.
- If **all 10 seats are occupied** and a player tries to join → put them in queue instead of showing an error.
- A queue badge is displayed to the queued player: "You're #2 in queue — Leave Queue".
- When **any seat opens** (player stands or disconnects), the **first person in queue** is automatically seated.
- Queue is maintained in insertion order (FIFO).
- Queued players can still watch the game.

### Backend Changes — `poker.socket.ts`

**New queue data structure** (add near the singleton table):

```typescript
interface QueueEntry {
  socketId: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
}

const tableQueue: QueueEntry[] = [];
```

**New helpers:**

```typescript
function dequeueNextPlayer() {
  if (tableQueue.length === 0) return;
  if (table.seats.every((s) => s !== null)) return; // still full

  const entry = tableQueue.shift()!;
  const socket = ioRef.sockets.sockets.get(entry.socketId);
  if (!socket) { dequeueNextPlayer(); return; } // they disconnected

  const seatIndex = table.seats.findIndex((s) => s === null);
  tableWatchers.delete(entry.socketId);
  table.seats[seatIndex] = {
    seatIndex,
    userId: entry.userId,
    username: entry.username,
    avatarUrl: entry.avatarUrl,
    socketId: entry.socketId,
    chips: 0, // will be loaded from DB below
    holeCards: null,
    folded: false,
    allIn: false,
    currentBet: 0,
    acted: false,
  };

  // Load balance from DB async
  prisma.user.findUnique({ where: { id: entry.userId }, select: { balance: true } })
    .then((u) => {
      if (table.seats[seatIndex]?.userId === entry.userId) {
        table.seats[seatIndex]!.chips = u?.balance ?? 0;
      }
    });

  socket.emit('poker:queue_seated', { seatIndex });
  broadcastQueueState();
  broadcastState();
  tryScheduleStart();
}

function broadcastQueueState() {
  // Tell each queued socket their position
  tableQueue.forEach((entry, i) => {
    const socket = ioRef.sockets.sockets.get(entry.socketId);
    socket?.emit('poker:queue_update', { position: i + 1, total: tableQueue.length });
  });
  // Players not in queue get total count only
  ioRef.emit('poker:queue_count', tableQueue.length);
}
```

**Modify `poker:join` handler:**

```typescript
socket.on('poker:join', async () => {
  // ... existing seated + mid-hand checks ...

  const seatIndex = table.seats.findIndex((s) => s === null);
  if (seatIndex === -1) {
    // Table full → add to queue
    if (tableQueue.find((q) => q.userId === userId)) {
      socket.emit('poker:error', 'You are already in queue');
      return;
    }
    const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } });
    tableQueue.push({ socketId: socket.id, userId, username, avatarUrl: dbUser?.avatarUrl ?? null });
    const pos = tableQueue.length;
    socket.emit('poker:queue_update', { position: pos, total: tableQueue.length });
    broadcastQueueState();
    return;
  }
  // ... rest of existing sit logic ...
});
```

**On player leaving** — call `dequeueNextPlayer()` after clearing their seat in both `poker:stand` and `disconnect`:

```typescript
// At the end of the stand handler and disconnect handler:
table.seats[seatIndex] = null;
dequeueNextPlayer();   // ← add this line
broadcastState();
```

**New event: `poker:leave_queue`:**

```typescript
socket.on('poker:leave_queue', () => {
  const idx = tableQueue.findIndex((q) => q.socketId === socket.id);
  if (idx !== -1) {
    tableQueue.splice(idx, 1);
    broadcastQueueState();
  }
});
```

**Also: remove from queue on disconnect:**

```typescript
// In disconnect handler, before existing logic:
const qIdx = tableQueue.findIndex((q) => q.socketId === socket.id);
if (qIdx !== -1) {
  tableQueue.splice(qIdx, 1);
  broadcastQueueState();
}
```

**Include queue count in public state:**

```typescript
// In publicState():
queueCount: tableQueue.length,
```

### Frontend Changes — `PokerPage.tsx`

**New state:**

```typescript
const [queuePosition, setQueuePosition] = useState<number | null>(null);
const [queueCount, setQueueCount] = useState(0);
```

**New socket listeners:**

```typescript
socket.on('poker:queue_update', ({ position }: { position: number }) => {
  setQueuePosition(position);
});
socket.on('poker:queue_seated', () => {
  setQueuePosition(null);
});
socket.on('poker:queue_count', (count: number) => {
  setQueueCount(count);
});
```

**Queue UI (shown instead of Join button when queued):**

```tsx
{queuePosition !== null ? (
  <div className="flex items-center gap-3 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl">
    <span className="text-amber-300 text-sm font-semibold">
      #{queuePosition} in queue
    </span>
    <button
      onClick={() => socketRef.current?.emit('poker:leave_queue')}
      className="text-xs text-red-400/70 hover:text-red-400"
    >
      Leave
    </button>
  </div>
) : !mySeat && (
  <button onClick={join} className="...existing join button...">
    {queueCount > 0 ? `Join Queue (${queueCount} waiting)` : 'Join Table'}
  </button>
)}
```

**Also show queue count as a small badge near the seat count** in the header.

---

## Feature 3 — 1-Player Mode

### Behavior

When only **1 player** is seated and in `WAITING` phase:
- After the normal 2.5 s delay, hand starts automatically.
- **Blind posting:** SB = 1 chip posted (no BB since only 1 player).
- **Hole cards:** 2 cards dealt to the player.
- **Community cards:** All 5 community cards are auto-dealt with 800 ms delays (no betting rounds — nobody to bet against).
- **Resolution:** After river is dealt, brief showdown display, then `resolveNoShowdown()` — player wins the pot (gets their 1 chip back + any chips saved).
- A "Solo Practice" label shows while playing alone.

### Backend Changes — `poker.socket.ts`

**`tryScheduleStart`** — allow 1 player:

```typescript
function tryScheduleStart() {
  const occupied = table.seats.filter(Boolean).length;
  if (occupied >= 1 && table.phase === 'WAITING') {   // ← was >= 2
    if (startHandTimer) return;
    startHandTimer = setTimeout(startNewHand, 2500);
  }
}
```

**`startNewHand`** — handle 1-player case:

```typescript
function startNewHand() {
  startHandTimer = null;
  const occupied = table.seats.filter((s): s is Seat => s !== null);

  if (occupied.length === 0) {
    table.phase = 'WAITING';
    broadcastState();
    return;
  }

  // Reset per-hand state
  for (const seat of table.seats) {
    if (seat) {
      seat.holeCards = null;
      seat.folded = false;
      seat.allIn = false;
      seat.currentBet = 0;
      seat.acted = false;
    }
  }

  table.deck = shuffle(makeDeck());
  table.communityCards = [];
  table.pot = 0;
  table.minRaise = 4;

  if (occupied.length === 1) {
    // ── Solo practice hand ────────────────────────────────────────────────
    table.phase = 'PREFLOP';
    table.currentBet = 0;
    table.actionSeatIndex = -1; // no action needed
    table.dealerIndex = occupied[0].seatIndex;
    table.sbIndex = occupied[0].seatIndex;
    table.bbIndex = -1;

    const solo = occupied[0];
    const sbPost = Math.min(1, solo.chips);
    solo.chips -= sbPost;
    solo.currentBet = sbPost;
    table.pot += sbPost;
    solo.holeCards = [table.deck.pop()!, table.deck.pop()!];

    prisma.user.update({ where: { id: solo.userId }, data: { balance: solo.chips } }).catch(console.error);

    broadcastState();
    ioRef.to(solo.socketId).emit('poker:my_cards', solo.holeCards);

    // Auto-run through all streets
    setTimeout(() => {
      table.phase = 'FLOP';
      table.communityCards = [table.deck.pop()!, table.deck.pop()!, table.deck.pop()!];
      broadcastState();
      setTimeout(() => {
        table.phase = 'TURN';
        table.communityCards.push(table.deck.pop()!);
        broadcastState();
        setTimeout(() => {
          table.phase = 'RIVER';
          table.communityCards.push(table.deck.pop()!);
          broadcastState();
          setTimeout(resolveNoShowdown, 1500);
        }, 1200);
      }, 1200);
    }, 1200);

    return;
  }

  // ── Multi-player hand (existing logic, unchanged) ─────────────────────
  // ... rest of existing startNewHand code ...
}
```

### Frontend Changes — `PokerPage.tsx`

Show a "Solo Practice" label when there is exactly 1 seated player and phase is not WAITING:

```tsx
{tableState && tableState.seats.filter(Boolean).length === 1 && tableState.phase !== 'WAITING' && (
  <span className="text-xs px-2 py-0.5 bg-purple-900/40 text-purple-300 border border-purple-500/20 rounded-full">
    Solo Practice
  </span>
)}
```

Also: hide the action buttons for solo play (no `poker:action` events needed since board auto-runs).

---

## Feature 4 — Spline 3D Table (Optional Enhancement)

The CSS 3D table (already built) is the **default and fallback**. Spline is an optional visual upgrade.

### How to Activate Spline

1. Install packages:
   ```bash
   cd frontend && npm install @splinetool/react-spline @splinetool/runtime
   ```

2. Create a Spline scene at spline.design:
   - Dark oval green felt poker table
   - Top-down perspective (camera tilted ~22°)
   - Export → **"Viewer" URL** (public, no login)
   - Store in `frontend/.env`:
     ```
     VITE_SPLINE_POKER_URL=https://prod.spline.design/XXXX/scene.splinecode
     ```

3. In `PokerPage.tsx`, replace the CSS table with:

```tsx
import Spline from '@splinetool/react-spline';

// In the table div (inside the rotateZ transform wrapper):
{import.meta.env.VITE_SPLINE_POKER_URL ? (
  <Spline
    scene={import.meta.env.VITE_SPLINE_POKER_URL}
    className="absolute inset-0 w-full h-full"
    onLoad={(spline) => { splineRef.current = spline; }}
  />
) : (
  /* existing CSS oval fallback */
)}
```

4. Pass the drag `rotateZ` value to the Spline camera via `splineRef.current.setVariable('tableRotation', rotateZ)` (requires a named variable in the Spline scene).

> **Note:** Do NOT add Spline until a scene URL is available. The CSS 3D table is fully functional and production-ready on its own.

---

## Feature 5 — Expanded Emote Picker

Expand from 4 to 8 emojis for more expressiveness:

**Current:** `😂 😤 🔥 💀`

**Expanded set (8):**
```
😂  😤  🔥  💀  👏  😎  🤔  💰
```

### Changes

**Backend `poker.socket.ts`** — update the allowed set validation:

```typescript
const ALLOWED_EMOTES = new Set(['😂','😤','🔥','💀','👏','😎','🤔','💰']);

socket.on('poker:emote', ({ emoji }: { emoji: string }) => {
  if (!ALLOWED_EMOTES.has(emoji)) return;
  // ... rest unchanged ...
});
```

**Frontend `PokerPage.tsx`** — update the emote panel array:

```typescript
const EMOTES = ['😂','😤','🔥','💀','👏','😎','🤔','💰'];
```

The panel layout uses a 2-row grid — with 8 emotes it becomes a 4×2 grid naturally.

---

## Pre-Existing Architecture (Do Not Change)

These parts are final and should not be modified:

- `pokersolver` hand evaluation — battle-tested, handles all edge cases
- CSS card rendering (`PlayingCard` + `CardBack` components)
- Cryptographic shuffle with `crypto.randomInt`
- JWT auth via `socket.data.userId` (set by middleware in `server.ts`)
- DB balance writes on every chip movement
- GAME_BET / GAME_WIN transaction logging
- Disconnect auto-fold + balance save

---

## Build Order for Enhancement Pass

1. **Watcher display** (easiest — pure frontend + minor backend tweak)
   - Add `username` to watcher broadcast in `publicState()`
   - Add watcher strip component in `PokerPage.tsx`

2. **Expanded emote set** (trivial)
   - Backend: update `ALLOWED_EMOTES` set
   - Frontend: update `EMOTES` array

3. **1-Player mode** (backend only)
   - Change `tryScheduleStart` threshold from `>= 2` to `>= 1`
   - Add solo-mode branch in `startNewHand`
   - Add "Solo Practice" label in frontend

4. **Queue system** (largest change, both backend + frontend)
   - Add `tableQueue` array + helpers to `poker.socket.ts`
   - Modify `poker:join` to enqueue when full
   - Hook `dequeueNextPlayer()` into stand + disconnect
   - Add queue UI state + components in `PokerPage.tsx`

5. **Spline 3D** (only when scene URL is ready — skip until then)

---

## Testing Checklist

### Existing (verify not broken)
- [ ] 2+ players sit → hand auto-starts after 2.5 s
- [ ] Hole cards shown to owner only; others see card backs
- [ ] Community cards reveal at correct phases
- [ ] Fold / Check / Call / Raise all work correctly
- [ ] Winner receives pot + transaction logged
- [ ] Emote bubble (4 emojis) floats above seat 2 s
- [ ] Chat bubble shows above seat 2 s, max 50 chars

### New Features
- [ ] Watcher strip appears when someone has tab open but hasn't sat
- [ ] Watcher disappears from strip when they sit down
- [ ] 1 player sits alone → hand starts after 2.5 s
- [ ] Solo hand: cards dealt, all 5 community auto-revealed, player wins pot
- [ ] "Solo Practice" badge visible during solo hand
- [ ] Table full (10 players) → 11th player gets queue banner instead of error
- [ ] Queue position updates correctly when earlier player leaves
- [ ] First in queue auto-seated when seat opens
- [ ] Leave Queue button removes player from queue immediately
- [ ] 8 emojis all appear in picker and broadcast correctly
- [ ] Expanded emote panel renders in 4×2 grid layout

---

## File Summary

| Action | File |
|--------|------|
| Modify | `backend/src/socket/poker.socket.ts` |
| Modify | `frontend/src/pages/PokerPage.tsx` |
| Optional later | Install `@splinetool/react-spline` + create scene |
| Optional later | `frontend/.env` → `VITE_SPLINE_POKER_URL` |

No new files needed. No DB schema changes.
