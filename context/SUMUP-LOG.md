# Session Log

<!-- Append a brief entry after each work session (2-4 bullet points). -->
<!-- When this file exceeds ~80 lines: compact old entries into 1-2 lines each, keep last 10 entries detailed. -->

---

## 2026-02-26 — Daily Login Reward (feature/daily-coins)
- Added `lastDailyClaim DateTime?` field to User model in Prisma schema + `prisma db push`
- Added `DAILY_COINS` to TransactionType enum for transaction tracking
- Backend: POST `/api/users/daily-claim` checks 24h cooldown, awards 1000 coins if claimable, records claim time
- Frontend: new `DailyCoinsClaim.tsx` component with auto-claim on load option; integrated into LandingPage (hero) and GamesPage (header); displays countdown timer when already claimed

## 2026-02-25 — Security Audit (security/audit branch)
- Added rate limiting to `forgot-password` and `reset-password` endpoints (5 req/15min per IP)
- Added JWT_SECRET production startup guard in `server.ts` — crashes if `JWT_SECRET` unset in production
- Added `requireMember` middleware to `auth.middleware.ts` (ESSENSGRUPPE_MITGLIED or ADMIN; needed by post-visibility branch)
- Explicitly disabled source maps in frontend production build (`vite.config.ts`)
- Created `context/features/securities.md` with full audit findings and middleware reference

## 2026-02-25 — Visibility Feature (feature/post-visibility)
- Added `visibility String @default("ALL")` field to Post, Event, Prediction Prisma models; ran `prisma db push`
- Backend: `post.routes.ts`, `event.routes.ts`, `prediction.routes.ts` — ABI27 users filtered to `visibility='ALL'` items only; ESSENSGRUPPE_MITGLIED/ADMIN can create `ESSENSGRUPPE_ONLY` items
- Frontend: `types/index.ts` + `api.service.ts` updated; `ForumPage`, `EventsPage`, `PredictionPage` each have a visibility select (Alle/Nur Essensgruppe) shown only to members/admins, plus a "Nur EG" badge on restricted items

## 2026-02-24 — Context Reorganization
- Restructured project documentation: new `context/` folder replacing `kontext/`
- Rewrote CLAUDE.md as lean ~5KB quick card with maintenance rules
- Created ARCHITECTURE.md (routes, models, socket events, file tree)
- Created STATUS.md, NEXT-STEPS.md, UNFINISHED.md, KNOWN-ISSUES.md
- Created feature docs: email-system, gambling, poker, forum-bubbles, frontend-theme
- No code changes — documentation only

## Pre-2026-02-24 — Summary of all prior work
- Phase 1: Foundation (Express+React+Prisma, auth, landing page, admin shell)
- Phase 1.5: Auth refactor (admin approval flow, ban/unban, balance control)
- Phase 2: Forum (posts, nested comments, votes, search, sort, images)
- Phase 3: Events (proposals, voting, status mgmt, photo galleries), Links, MC page
- Phase 3.5: Event photo upload with multer+sharp, lightbox carousel
- Phase 4: Games hub, Poker (full Hold'em), Prediction Market, Slots, Blackjack
- Phase 4.3: Content fill (real teachers, links, MC IP, About page, Abi Zeitung)
- Phase 5.0: Email verification + role refactor (ABI27/ESSENSGRUPPE_MITGLIED/ADMIN)
- Phase 5.1-5.2: Email templates (5 designs), password reset flow, Resend SMTP switch
- Multiple bugfix sessions: token consumption by scanners, StrictMode double-fire, rate limiter JSON, duplicate method names

## 2026-02-25 — Bug Fix Session (fix/known-bugs branch)

### Bug 1: Avatar EXIF rotation + crop UI
- Backend: added `.rotate()` before `.resize()` in Sharp pipeline (user.routes.ts) to auto-orient phone photos from EXIF
- Frontend: new `AvatarCropModal.tsx` — click/drag to set crop center, canvas crops client-side before upload
- `api.service.ts` uploadAvatar now accepts `Blob`; ProfilePage opens modal before uploading

### Bug 2: Poker solo mode broken
- `soloMode` was declared in the Table object but never implemented — `tryScheduleStart()` required 2+ players
- Added `soloMode: boolean` to Table interface; `tryScheduleStart()` now fires for 1 player (1.5s delay)
- `startNewHand()` routes to new `startSoloHand()` for 1 player: deals hole cards, auto-advances streets every 1.5s via `soloAdvance()`, resolves hand at showdown with no balance change
- `processAction()` ignores input during solo mode; frontend shows "Practice mode" message, hides action buttons

### Bug 3: iOS Safari layout
- Added `.h-dvh-nav`, `.pb-safe`, `.bottom-safe-4` utility classes to index.css using `100dvh` and `env(safe-area-inset-bottom)`
- ForumPage: fixed container height to use `.h-dvh-nav` class; added `WebkitBackdropFilter` to all `backdropFilter` usages; fixed zoom buttons with `.bottom-safe-4`
- PokerPage: added `WebkitBackdropFilter` to header + action bar; added `.pb-safe` to action bar

### Bug 5: Registration "string error"
- Zod validators `z.string().min(3)` / `.max(20)` / `.min(6)` on username and password had no custom messages
- Produced raw Zod output "String must contain at least N character(s)" visible to users as a confusing "string error"
- Fixed by adding custom messages to all min/max calls in `registerSchema` in `auth.routes.ts`

### Bug 4: Prediction market reserved betting
- New `backend/src/utils/balance.util.ts` with `getReservedBalance()` / `getAvailableBalance()`
- `/bet` route: no longer deducts balance — reserves amount, checks available balance (balance - sum of active prediction bets)
- `/resolve` route: losers' balance deducted NOW; winners get only the winnings (stake never taken); no-winner scenario = reservations freed, no balance changes
- `GET /api/users/me` includes `reserved` field
- Slots, Blackjack, Poker `seatPlayer()`: all check available balance (not total) before accepting bets
- Navbar shows available balance with "(N reserved)" indicator; PredictionPage modal explains reserved betting
