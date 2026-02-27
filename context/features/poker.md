# Poker (Texas Hold'em)

## Current State — What's Built

**Backend:** `backend/src/socket/poker.socket.ts`
**Frontend:** `frontend/src/pages/PokerPage.tsx`
**REST:** `backend/src/routes/poker.routes.ts` (GET /api/poker/state)

### Core Features (all working)
- 6-seat table (expandable to 10 in backend)
- Full Hold'em state machine: WAITING → PREFLOP → FLOP → TURN → RIVER → SHOWDOWN
- Cryptographic Fisher-Yates shuffle (`crypto.randomInt`)
- Blinds: SB=1, BB=2, dealer button rotates
- Betting: fold / check / call / raise with acted-flag reset on raise
- All-in handling with auto-runout
- `pokersolver` hand evaluation (handles all edge cases + ties)
- Split pot with remainder distribution
- Hole cards private via `poker:my_cards`; revealed at showdown
- DB balance writes on every chip movement
- GAME_BET / GAME_WIN transactions logged
- Disconnect auto-fold + balance save

### Additional Features (all working)
- **Solo practice mode** — 1 player can play alone, board auto-runs, no net chip change
- **Queue system** — FIFO queue when table full, auto-seat when slot opens
- **Watcher display** — avatar strip above table, deduplicated across tabs
- **8-emoji emote system** — floats above seat for 2s
- **50-char chat** — speech bubble above seat for 2s
- **CSS 3D table** — perspective(900px) rotateX(22deg), drag-to-spin rotateZ
- **Seats follow rotation** — counter-rotate content to stay upright
- **Hand result overlay** — winner name + hand name, auto-dismiss
- **Mid-hand seating** — join mid-hand with folded=true until next hand
- **Stuck-state recovery** — if table stuck in non-WAITING with no players, auto-resets

### Frontend (PokerPage.tsx)
- Full-screen (navbar/footer hidden)
- Green felt with radial gradient, wood rim, EG watermark, ambient particles
- Playing cards as pure CSS (white card, rank + suit, red/black)
- Action bar: Fold / Check / Call / Raise with range slider
- Animated community card flip-reveal
- Decorative idle cards when nobody seated

---

## Known Bug Fix (Applied)

**"Doesn't join" stuck state** — `seatPlayer()` was missing stuck-state recovery that `poker:join` had. When all players disconnect mid-hand, table stays in non-WAITING phase. New player sits but gets `folded=true` and `tryScheduleStart()` never fires. **Fix:** moved recovery logic into shared `seatPlayer()` function.

---

## Enhancement Roadmap (Not Yet Built)

1. **Spline 3D Table** — Replace CSS 3D with actual Spline scene. Only when a scene URL is available. CSS table is the fallback. Requires `@splinetool/react-spline`.

2. **Expanded table to 10 seats** — Backend supports 10, frontend currently positions 6. Need to add 4 more `SEAT_POS` entries.

3. **Right-click context menu** — "View profile", "Copy link" on nodes (low priority)

## Architecture Notes (Do Not Change)
- `pokersolver` for hand evaluation — battle-tested
- CSS card rendering (PlayingCard + CardBack components)
- Cryptographic shuffle with `crypto.randomInt`
- JWT auth via `socket.data.userId`
- DB balance writes on every chip movement
