# Session Log

<!-- Append a brief entry after each work session (2-4 bullet points). -->
<!-- When this file exceeds ~80 lines: compact old entries into 1-2 lines each, keep last 10 entries detailed. -->

---

## Compacted History (pre-2026-02-26)

- **Pre-2026-02-24:** Foundation (auth, landing, admin), forum, events, links, MC page, games hub (poker, prediction market, slots, blackjack), email verification, role refactor, content fill, multiple bugfix sessions
- **2026-02-24 — Context Reorganization:** Restructured docs into `context/` folder; created ARCHITECTURE.md, STATUS.md, NEXT-STEPS.md, feature docs
- **2026-02-25 — Security Audit:** Rate limiting on auth endpoints, JWT_SECRET guard, `requireMember` middleware, source maps disabled, `context/features/securities.md`
- **2026-02-25 — Visibility Feature:** Added `visibility` field to Post/Event/Prediction models; backend filtering for ESSENSGRUPPE_ONLY items; frontend toggle for members/admins
- **2026-02-25 — Bug Fixes (fix/known-bugs):** Avatar EXIF rotation + crop modal, poker solo mode, iOS Safari layout fixes, registration Zod error messages, prediction market reserved betting redesign
- **2026-02-25 — Round 2 Fixes:** Visibility toggle UI (buttons instead of select), MC page access control, poker solo manual advance, poker result inline banner, dark theme consistency, navbar dark accent

---

## 2026-02-26 — Daily Login Reward
- Added `lastDailyClaim` field to User model, `DAILY_COINS` transaction type
- Backend: POST `/api/users/daily-claim` with 24h cooldown, 1000 coins
- Frontend: `DailyCoinsClaim.tsx` with auto-claim and countdown timer

## 2026-02-26 — Daily Coins Claim Bug Fix
- Fixed missing `lastDailyClaim` in daily-claim and login responses
- Regenerated Prisma client to pick up new field

## 2026-02-26 — German Translation (i18n)
- Translated all pages to German: auth pages, landing, profile, forum, events, prediction, games, slots, blackjack, poker, minecraft, about, links, admin, footer
- AdminPage left unchanged per user request

## 2026-02-27 — Fresh OCI Deploy
- Uploaded new folder `/home/ubuntu/web/Essensgruppe.de/` via SFTP, replacing old `EssensgruppeWeb`
- DB wiped and re-seeded; fixed `trust proxy`, `VITE_API_URL`, dark theme on RegisterPage
- PM2 running under root, both servers live at essensgruppe.de

## 2026-02-28 — Forum Photo Upload + EventsPage Auth Guard
- Added `uploadPostPhoto` multer handler, `POST /api/posts/photo-upload` route
- Protected `/events` route with `ProtectedRoute` in `App.tsx`

## 2026-02-28 — Chat System
- Built 1-on-1 chat: `DirectMessage` + `Contact` Prisma models, hourly cleanup (24h TTL)
- Backend: `chat.routes.ts` (6 REST endpoints), socket events for real-time DMs, AI route with Claude Haiku
- Frontend: `ChatBubble`, `ChatPanel`, `ChatContactList`, `ChatConversation`, `ChatAIConversation` components
- AI character TBD in `context/features/ai-chatbot-character.md`; needs `ANTHROPIC_API_KEY` in `.env`

## 2026-02-28 — Bug Fixes (feature/german-translation)
- Daily coin countdown: switched to absolute deadline (background-tab safe)
- Prediction market: fixed `payoutOps` type annotation
- Prediction market: debt system redesign — games check raw balance, predictions check available; losers can go negative
- Event status change: added missing `authenticateToken` middleware; dark-themed StatusModal

## 2026-02-28 — Admin Panel: E-Mail Column
- Added E-Mail column to user table in AdminPage (no backend change needed)

## 2026-02-28 — Guest Mode + Games Landing Redesign
- Backend: `guestState.ts` (in-memory Map with 30min TTL), `guestAuth.middleware.ts` (UUID header validation), `guestGames.routes.ts` (POST /session, GET /balance; full blackjack + slots + mines for guests without DB)
- Frontend: `GuestContext.tsx` (sessionStorage guestId, balance state), `GamesLandingPage.tsx` (3-card chooser: Einzelspieler/Mehrspieler/Gastmodus), `GamesCollectionPage.tsx` (reusable for /games/singleplayer + /games/multiplayer)
- Guest hub + game pages: `GuestHubPage.tsx`, `GuestBlackjackPage.tsx`, `GuestSlotsPage.tsx`, `GuestMinesPage.tsx`, `GuestPokerPage.tsx` (coming soon placeholder)
- App.tsx: `/games` now routes auth users → GamesLandingPage, guests → /games/guest; guest game routes public; GuestProvider wraps app

## 2026-03-01 — Guest Poker (Separate Tables)
- Backend: `guestPoker.socket.ts` with standalone 6-seat table using guestState balance (no DB); AFK kick at 60s; `guest_poker:*` event prefix
- Backend: `/guest-poker` Socket.IO namespace in `server.ts` with guestId UUID auth middleware (separate from JWT auth)
- Frontend: `GuestPokerPage.tsx` — full Texas Hold'em UI (seat placement, community cards, action buttons, emotes, AFK toast, out-of-chips CTA); connects to `/guest-poker` namespace
- `GuestHubPage.tsx`: removed "Demnächst" badge from poker card — poker now fully playable for guests

## 2026-03-01 — PWA (Progressive Web App)
- Added `vite-plugin-pwa`; configured `VitePWA` with manifest (`Essensgruppe – Abitur 2027`, dark theme colors, standalone display), Workbox pre-cache for all static assets, and per-route runtime caching (NetworkFirst for forum/events/predictions, CacheFirst for fonts/uploads/MC announcements, NetworkOnly for games/auth/sockets/mutations)
- Created `frontend/public/icons/icon-192.png` + `icon-512.png` (solid #0284c7 placeholders); updated `index.html` with theme-color, apple-mobile-web-app-*, manifest link, apple-touch-icon
- New hook `useOnlineStatus.ts`, new components `OfflineBanner.tsx` (yellow strip below Navbar when offline) and `OfflineOverlay.tsx` (full-screen block for all game pages offline)
- `App.tsx` wired: OfflineBanner after Navbar (showLayout guard), all game routes (auth + guest: Poker/Slots/Blackjack/Mines) wrapped with OfflineOverlay; added `context/features/pwa.md`

## 2026-02-28 — Mines Game
- Backend: `mines.routes.ts` with 3 endpoints (`/start`, `/reveal`, `/cashout`); in-memory `activeGames` Map per user; Fisher-Yates mine placement; 5% house edge multiplier formula; mine positions never sent to client until game over; settlement via `prisma.$transaction`
- Frontend: `MinesPage.tsx` full-screen page; custom `MineCountPicker` fold-down accordion (6-col grid of 1–24 buttons); responsive layout — desktop: controls left + big grid right; mobile: small grid top + compact controls bottom
- Wired: `server.ts` route registration, `App.tsx` route + `showLayout` exclusion, `api.service.ts` 3 new methods, `types/index.ts` 3 new interfaces; no Prisma schema changes needed
