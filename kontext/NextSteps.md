# Next Steps - For Future Claude Code Sessions

**Last Updated:** 2026-02-19
**Current Status:** Phase 1 + 1.5 + 2 + 3 + 3.5 + 4.0 + 4.2a + 4.2b (Poker) + Profile Picture + Slots COMPLETE
**Next Up:** Phase 4.1b — Blackjack + Mines

---

## What to Do Next (Priority Order)

### ✅ DONE — Phase 4.0: Games Page
- `/games` page with Single Player / Multiplayer tabs ✅
- Game cards: Slots, Blackjack, Mines, Poker, Prediction Market ✅
- Dark casino theme ✅
- Online users bubble (multiplayer tab) + instant messaging (1-min cooldown) via Socket.io ✅
- Placeholder routes for unbuilt games ✅

### ✅ DONE — Profile Picture Upload
- `POST /api/users/me/avatar` — multer + sharp 256×256 resize, saves to `uploads/avatars/`
- ProfilePage: clickable avatar with camera overlay, spinner, success update
- Navbar: shows real avatar image when set
- Hint text: "Click Profilspicture to change"

### ✅ DONE — Phase 4.2a: Prediction Market
- DB: `predictions` + `prediction_bets` tables, `PREDICTION_BET`/`PREDICTION_WIN` transaction types ✅
- Backend: full CRUD + bet + resolve with proportional payout ✅
- Frontend: `PredictionPage.tsx` — open/closed tabs, YES/NO bar, bet modal, resolve modal, rules info button ✅
- FAB (+) button bottom-left ✅
- Balance refresh after bet/resolve ✅

---

### 🔄 NEXT — Phase 4.2b: Poker (Texas Hold'em)

**Full spec:**

**Visual:**
- Full-screen dark table view (large green/dark oval poker table in the center)
- Players sit around the table in a circle matching seat positions (up to ~6-8 players)
- Each seat shows: circular avatar placeholder + player name below it
- Dealer button, small blind, big blind markers rotate each hand
- Card graphics: sourced from online SVG/PNG deck (ask user to upload if needed — easy)

**Gameplay:**
- Texas Hold'em rules
- Small blind = 1 coin, big blind = 2 coins (auto-posted)
- Dealing order matches seat positions
- Actions: Fold, Check, Call, Raise (with input for raise amount)
- Community cards dealt face-up in center of table (Flop 3, Turn 1, River 1)
- Pot displayed in center
- Player cards dealt face-down to others, face-up to self
- Showdown at end of hand

**Social features:**
- Emoji reactions: floating emote button (bottom-right area) → emoji picker → emoji floats above player's avatar for ~2s then fades
- Short messages: players can type up to 50 chars, appears as speech bubble above avatar for ~2s then fades
- Both use Socket.io (no persistence)

**Randomness:**
- Cards must be cryptographically random (use Fisher-Yates shuffle with `crypto.randomBytes`)
- Server controls all card dealing — never trust client

**Structure to build:**
1. `backend/src/routes/poker.routes.ts` — lobby: create/join/leave table
2. `backend/src/socket/poker.socket.ts` — full game logic via Socket.io events
3. `frontend/src/pages/PokerPage.tsx` — the full table UI
4. Card graphics — sourced from a free SVG card deck (e.g. `tekezo/svg-cards` or similar)

**Socket events needed:**
- `poker:join_table` / `poker:leave_table`
- `poker:start_hand` (when 2+ players seated)
- `poker:action` (fold/check/call/raise)
- `poker:state` (broadcast full game state to all players)
- `poker:emote` (emoji above avatar, 2s fade)
- `poker:message` (text bubble above avatar, 2s fade, max 50 chars)

**DB: no new schema needed** — use existing `Transaction` + `GameHistory` for hand results

---

### ✅ DONE — Slots Machine
- `/games/slots` fully implemented
- 3 reels with gradual slowdown animation (symbols cycle fast → slow → lock left-to-right)
- Two switchable themes: 🔮 Neon (dark purple/cyan, matches site) and 🎰 Vegas (warm gold/red)
- Pay table toggle panel (shows all win conditions + house stats)
- Bet chips: 10 / 25 / 50 / 100 / 250 / 500, plus ± fine-tune
- Win display: loss (grey), cherry bonus (yellow), pairs (green), 3-of-a-kind (jackpot glow + coin particles)
- Space bar shortcut to spin
- 1% house edge math: ~54% win rate, ~98% RTP
- Backend: `POST /api/games/slots/spin` — validates balance, spins reels, logs GameHistory + Transactions
- Symbol images are emoji placeholders — ready to swap for custom images later

### ⏳ Phase 4.1b — Single Player Games (Blackjack + Mines)

**Balance System:**
- Balance stored on User model (default 1000 coins) ✅
- Balance displayed in navbar ✅
- Transaction history tab on Profile page — NOT YET DONE

**Games remaining:**
- `/games/blackjack` — beat the dealer (1% house edge)
- `/games/mines` — Stake-style minesweeper grid (1% house edge)

**Infrastructure:**
- `backend/src/routes/game.routes.ts` — single-player bet validation middleware
- House edge utility function
- `GameHistory` + `Transaction` models already in schema ✅

---

### 2. Content to Fill In (User provides the data)

| Page | What's needed |
|------|--------------|
| `/links` | Real school URL, Moodle URL, Vertretungsplan URL |
| `/links` | Real teacher list (name, subject, email) |
| `/links` | Stundenplan iframe links per person |
| `/mc` | Real server IP → update `SERVER_IP` in `MinecraftPage.tsx` |
| `/mc` | Real BlueMap URL → update `BLUEMAP_URL` in `MinecraftPage.tsx` |
| `/events` | Real GoFundMe, TikTok, Instagram URLs in `EventsPage.tsx` |

---

### 3. Content Updates to Fill In (Admin tasks, low priority)

- Avatar upload on Profile page (multer middleware already exists)
- Forum image upload (currently imageUrl is passed as string, no upload UI)
- About Us page — add class photo and real text

---

## Completed Work Summary

| Phase | Status |
|-------|--------|
| 1 — Foundation (auth, routing, landing, navbar, profile, admin shell) | ✅ Done |
| 1.5 — Auth refactor (PENDING approval, admin panel upgrade) | ✅ Done |
| 2 — Forum (posts, nested comments, voting, search, sort) | ✅ Done |
| 3 — Events, MC, Links pages | ✅ Done |
| 3.5 — Event photo galleries + nginx/proxy fixes | ✅ Done |
| 4.0 — Games page (tabs, cards, online bubble, Socket.io messaging) | ✅ Done |
| 4.2a — Prediction Market (full backend + frontend) | ✅ Done |
| 4.2b — Poker (Texas Hold'em) | 🔄 Next |
| 4.1 — Single player games (Slots, Blackjack, Mines) | ⏳ After Poker |
| 5 — Polish + production build | ⏳ Later |

---

## Server Management (Production — OCI)

```bash
pm2 list              # check status
pm2 logs backend      # backend logs
pm2 logs frontend     # frontend logs
pm2 restart all       # restart both
```

### Admin Login
```
Username: admin
Password: Admin1234!
```

---

## Known Issues

1. **ThreadPage.tsx unused vars** — Two pre-existing TS6133 warnings (`newComment`, `commentId`). Not breaking.
2. **jwt.util.ts type error** — Pre-existing TS2769 on `expiresIn`. Not breaking (runtime works fine).
3. **OneDrive file locking** (Windows only) — `prisma generate` sometimes fails with EPERM. Fix: kill all node processes first.
4. **Bash `!` escaping** (Windows Git Bash) — `!` in passwords gets escaped in curl. Test via browser instead.

---

## Tips for Next Session

1. **Read PROGRESS.md** for full architecture details
2. **Start with `pm2 list`** to verify servers are running on OCI
3. **Socket.io is already wired** in `server.ts` (HTTP server + io instance). Games online-presence events already work. Poker needs its own namespace or event group.
4. **Vite proxies `/socket.io`** to `localhost:3000` with `ws: true` — WebSocket works in dev.
5. **Card graphics** — ask user to upload a card SVG deck, or use a CDN-hosted free deck. Confirm before fetching any URLs.
6. **Poker card randomness** — use `crypto.randomBytes` on the backend for Fisher-Yates shuffle. Never let client pick cards.
7. **`prisma db push`** is used instead of `prisma migrate dev` (non-interactive environment).
