# Session Log

<!-- Append a brief entry after each work session (2-4 bullet points). -->
<!-- When this file exceeds ~80 lines: compact old entries into 1-2 lines each, keep last 10 entries detailed. -->

---

## 2026-02-28 — Forum Photo Upload + EventsPage Auth Guard
- Added `uploadPostPhoto` multer handler (`upload.middleware.ts`), saves to `uploads/posts/`
- Added `POST /api/posts/photo-upload` route in `post.routes.ts` returning `{ imageUrl }`
- Added `ApiService.uploadPostPhoto(file)` in `api.service.ts`; updated `CreatePostModal` with photo picker + preview
- Protected `/events` route in `App.tsx` with `ProtectedRoute` (any authenticated user)

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

## 2026-02-25 — Round 2 Fixes (fix/round2 branch)

### Fix 1: Visibility toggle UI
- Replaced <select> dropdown with two-button toggle (Alle / Nur Essensgruppe) in ForumPage, EventsPage, PredictionPage
- Used inline dark styles — no white-on-white issue, readable on dark backgrounds

### Fix 2: MC page access control
- Extended ProtectedRoute with requireRole?: string[] prop
- App.tsx: MC route now requireRole={['ESSENSGRUPPE_MITGLIED', 'ADMIN']}
- LandingPage: SECTIONS array has roleRequired field; filters MC from unauthorized users
- Navbar: MC link only shown to isMember (ESSENSGRUPPE_MITGLIED or ADMIN)

### Fix 3: Poker solo mode manual advance
- Backend: removed all setTimeout(soloAdvance, ...) auto-timers from startSoloHand and soloAdvance
- Added poker:solo_continue socket event handler — player drives each street advance
- Frontend: replaced "board auto-runs" text with "Weiter" / "Showdown" button

### Fix 4: Poker result inline banner
- Backend: added investedThisHand tracking to Seat; included allInvestments in all poker:hand_result emits
- Frontend: deleted WinnerBanner overlay; added inline top banner + per-seat win/loss badges on seats

### Fix 5: Dark theme consistency
- index.css: body bg #0a0e1a, .card/.input/.btn-outline use dark base classes globally
- AboutPage, ProfilePage, EventsPage, AdminPage: all rewritten to dark equivalents

### Fix 6: Navbar dark accent
- Navbar bg-white shadow-md => bg-[#0d1420] border-b border-white/[0.06]
- All link/text/dropdown/mobile-menu colors updated to dark theme variants

## 2026-02-26 — Daily Coins Claim Bug Fix (main)
- **Root cause 1:** `POST /api/users/daily-claim` did not return `lastDailyClaim` in its response → `updateUser` set it to `undefined` → countdown timer never appeared, button re-enabled immediately after claiming
- **Root cause 2:** `POST /api/auth/login` response omitted `lastDailyClaim` → on fresh login (no page refresh) component had no claim history, always treated user as claimable
- **Root cause 3:** Prisma client was outdated (schema had `lastDailyClaim` + `DAILY_COINS` but client not regenerated) → TS errors masked by missing types
- Fixed `user.routes.ts` line 100: response now includes `lastDailyClaim: now.toISOString()`; fixed `auth.routes.ts` login: response includes `lastDailyClaim`; added field to `AuthResponse` type; ran `prisma generate`

## 2026-02-26 — i18n: Alle Auth/Landing/Profile-Seiten auf Deutsch übersetzt (main)
- LoginPage, RegisterPage: Fallback-Fehlermeldungen + Beschriftungen auf Deutsch; fehlende Strings ergänzt
- LandingPage: SECTIONS-Beschreibungen, CTA-Headline und Button auf Deutsch; "Abitur 2027 Community Portal" → "Gemeinschaftsportal"
- AboutPage: "Our Mission", Missionstext, "Contact"-Sektion übersetzt
- ProfilePage: alle UI-Labels, Buttons, Fehlermeldungen, Abschnittstittel (Statistiken, Transaktionen, Passwort ändern, Gefahrenzone) vollständig auf Deutsch
- LinksPage: letzter englischer String "coming soon" → "demnächst" behoben; war ansonsten schon vollständig auf Deutsch
- ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage, PrivacyPage: bereits vollständig auf Deutsch — keine Änderungen nötig

## 2026-02-27 — German Translation final pass (feature/german-translation branch)
- Footer.tsx: "Community portal..." → German description; "Quick Links" → "Schnellzugriff"; "About Us" → "Über uns"; "Follow Us" → "Folge uns"
- ProfilePage, LinksPage, MinecraftPage, AboutPage: already fully in German — no changes needed
- AdminPage: left unchanged per user request

## 2026-02-27 — German Translation (feature/german-translation branch, EssensgruppeWeb)
- ProfilePage: alle Labels, Buttons, Fehlermeldungen und Abschnittstittel auf Deutsch (Mein Profile, Statistiken, Gefahrenzone, Passwort ändern, Konto löschen, etc.)
- MinecraftPage: timeAgo-Funktion, RULES-Array, HOW_TO_JOIN-Schritte, Ankündigungen-Modal, alle Headings und Statusmeldungen übersetzt
- AboutPage: "Our Mission" → "Unsere Mission", Missionstext, "Contact" → "Kontakt" übersetzt
- LinksPage: letzter englischer String "coming soon" → "demnächst verfügbar" behoben
- Footer: "Quick Links" → "Schnellzugriff", "Follow Us" → "Folgt uns", "About Us" → "Über uns", "Games" → "Spiele", Beschreibungstext übersetzt
- AdminPage: nicht übersetzt (auf Wunsch unverändert gelassen)

## 2026-02-28 — Bug Fix Session (feature/german-translation branch)

### Fix 1: Daily coin countdown stale after background tab
- `DailyCoinsClaim.tsx`: replaced relative-ms countdown with absolute deadline (`nextClaimAt = lastClaim + 24h`)
- Tick effect now computes `remaining = nextClaimAt - Date.now()` — accurate regardless of browser timer throttling in background tabs
- Interval no longer restarts every second (removed `nextClaimMs` from effect deps; only `canClaim`/`nextClaimAt` in deps)

### Fix 2: Prediction market payout type bug
- `prediction.routes.ts`: changed `payoutOps` type from broken `Parameters<typeof prisma.$transaction>[0]` (resolved to function type) to `any[]`
- Payout logic itself was correct; type annotation was the issue

### Fix 3: Prediction market — reserved coins / debt system redesign
- Games (slots, blackjack, poker) now check raw `user.balance` instead of `balance - reserved` — players can spend full balance freely
- Prediction bet placement still checks `balance - reserved` — can't stack more prediction bets than actual balance
- On prediction resolve, losers' full bet amount is deducted (balance can go negative = debt); debt blocks gameplay naturally
- Removed `getReservedBalance` import from slots, blackjack, poker; kept only in prediction.routes.ts for bet placement check

### Fix 4: Event status change broken for admins
- `event.routes.ts`: `PATCH /:id/status` used `requireAdmin` alone — `req.user` was never set because `authenticateToken` was missing; always returned 401
- Added `authenticateToken` before `requireAdmin` in the middleware chain
- `EventsPage.tsx`: `StatusModal` was white (`bg-white`) on a dark app — rethemed to dark glassmorphism; added error display (previously swallowed errors silently)

## 2026-02-28 — Admin Panel: E-Mail-Spalte in Mitglieder-Tabelle (feature/german-translation)
- `AdminPage.tsx`: neue `E-Mail`-Spalte zwischen "Nutzername" und "Rolle" im Mitglieder-Tab hinzugefügt
- Kein Backend-Change nötig — `email` war bereits im `/api/admin/users`-Response enthalten

## 2026-02-27 — Fresh OCI Deploy from New Folder
- Uploaded new project folder `/home/ubuntu/web/Essensgruppe.de/` via SFTP, replacing old `EssensgruppeWeb`
- Database wiped and re-seeded (admin/chef@essensgruppe.de/Admin1234!, new role system: ABI27/ESSENSGRUPPE_MITGLIED/ADMIN)
- Fixed: `trust proxy` for express-rate-limit behind nginx, frontend `VITE_API_URL=/api` (was localhost), backend env URLs → `https://essensgruppe.de`
- Fixed: RegisterPage white-on-white text → dark theme; killed old ubuntu PM2 daemon that kept respawning
- PM2 running under root from new folder, both servers live at essensgruppe.de

## 2026-02-26 — i18n: Alle Spiele- und Admin-Seiten auf Deutsch übersetzt (main)
- ForumPage, ThreadPage, EventsPage, PredictionPage, GamesPage: in vorheriger Session übersetzt (commits 90e61a4–8d524c9)
- BlackjackPage: Hit/Stand/Double/Deal/Bust-Terminologie übersetzt; Fehler- und Statusmeldungen auf Deutsch
- SlotsPage: Zurück-Link, Gewinntabelle, Einsatz-Label, SPIN-Statusmeldungen, Fußnotentext übersetzt
- PokerPage: Sitzen/Verlassen/Zurück/Warteschlange, Chat-Placeholder, Trainingsmodus, Turn-Anzeige übersetzt
- MinecraftPage: timeAgo, HOW_TO_JOIN-Schritte, RULES-Array, Ankündigungen-Modal, alle Heading/Status-Texte übersetzt
- AdminPage: Tabellenkopfzeilen, Modale (Guthaben, Passwort), Bestätigungsdialoge, Aktions-Buttons auf Deutsch
- GamePlaceholderPage: Spielbeschreibungen, "Coming Soon"-Banner, Zurück-Button übersetzt
