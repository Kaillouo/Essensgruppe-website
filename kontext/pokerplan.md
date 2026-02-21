# Poker Page: Fix Join Flow + Design Polish

## Bug Fix: "Doesn't join anything"

### Root Cause
The `poker:sit` handler (line 686) is missing **stuck-state recovery** that `poker:join` has (lines 661-670). When the table is stuck in a non-WAITING phase with no players (e.g. after server restart, all players disconnecting mid-hand):

1. User clicks "Sit" → `poker:sit` fires → `seatPlayer()` called
2. `seatPlayer()` sees `table.phase !== 'WAITING'` → sets `folded: true`
3. `tryScheduleStart()` checks `table.phase === 'WAITING'` → fails → no hand starts
4. User is seated but folded, stuck forever

### Fix
Move stuck-state recovery into `seatPlayer()` function (before seating logic), so both `poker:sit` and `poker:join` benefit:

```typescript
// In seatPlayer(), before creating the seat:
if (table.phase !== 'WAITING' && table.seats.every((s) => s === null)) {
  if (startHandTimer) { clearTimeout(startHandTimer); startHandTimer = null; }
  table.phase = 'WAITING';
  table.communityCards = [];
  table.pot = 0;
  table.currentBet = 0;
  table.actionSeatIndex = -1;
  table.sbIndex = -1;
  table.bbIndex = -1;
}
```

Remove the duplicate recovery logic from `poker:join` handler since it's now in `seatPlayer()`.

**File:** `backend/src/socket/poker.socket.ts`

---

## Design Improvements (frontend-design skill)

### Aesthetic Direction
**Casino noir** — dark, atmospheric, high-end gambling lounge feel. The table already has good bones (3D perspective, green felt, wood rim). Polish the surrounding UI to match.

### Changes to `frontend/src/pages/PokerPage.tsx`:

1. **Header bar** — Add subtle glassmorphism background, refine typography with more contrast
2. **Empty seats** — Instead of dashed circles with "Empty" text, show subtle chair/seat silhouettes with a soft pulse for "Sit" state
3. **Action bar** — Richer button styles with more prominent glow effects on hover, cleaner spacing
4. **Decorative idle cards** — Already present; verify they show when table is empty
5. **Hand result overlay** — Add confetti-like particles or gold shimmer for win
6. **Emote panel** — Expand to 8 emojis (add 👏 😎 🤔 💰), refine grid layout
7. **Watcher strip** — Clean up spacing, add count label
8. **Community card slots** — Make empty slots more visible with subtle glow border instead of dashed
9. **Overall** — Add subtle ambient particle effect or floating light spots in the background for atmosphere

### Backend Emote Update
Expand allowed emotes in `poker.socket.ts` from 4 to 8: `😂 😤 🔥 💀 👏 😎 🤔 💰`

---

## File Changes Summary

| File | Changes |
|------|---------|
| `backend/src/socket/poker.socket.ts` | Move stuck-state recovery to `seatPlayer()`, expand emotes to 8 |
| `frontend/src/pages/PokerPage.tsx` | Design polish, expand emote grid, improve empty state |
