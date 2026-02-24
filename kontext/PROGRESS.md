# Project Progress Log

**Last Updated:** 2026-02-24
**Current Phase:** Phase 2 - Forum System (COMPLETED)
**Next Phase:** Phase 3 - Events + Links + MC

---

## Overview

This document tracks the implementation progress of the Essensgruppe school community portal. Each phase completion is documented here with details about what was built, file locations, and architectural decisions made.

---

## Phase 1: Foundation ✅ COMPLETED

**Status:** Fully implemented and tested
**Completion Date:** 2026-02-15
**Deliverable:** Can login, see all pages (empty placeholders), landing page looks impressive

### Architecture Decisions Made

1. **Project Structure:** Monorepo approach
   - Single Git repository with `frontend/` and `backend/` folders
   - Easier for single developer workflow and deployment

2. **Tech Stack Finalized:**
   - Backend: Node.js + Express + TypeScript + Prisma + PostgreSQL
   - Frontend: React + TypeScript + Vite + TailwindCSS + Framer Motion
   - Auth: JWT (7-day expiry) + bcrypt (12 rounds)
   - Package Manager: npm

3. **Development Ports:**
   - Backend API: `localhost:3000`
   - Frontend Dev Server: `localhost:3001`
   - PostgreSQL: `localhost:5432`
   - BlueMap (existing): `localhost:8100`

### What Was Built:
- Express backend with JWT auth, Zod validation, rate limiting
- React frontend with Framer Motion animations, TailwindCSS styling
- Landing page with scroll effects and parallax
- Login/Register pages
- Navbar with balance display, profile dropdown, mobile hamburger
- Profile page with stats, password change, account delete
- Admin panel shell (analytics + user management)
- All placeholder pages for future phases
- PostgreSQL database with full schema (7 tables)

### Fixes Applied During Setup:
- bcrypt → bcryptjs (no Python/C++ needed on Windows)
- Prisma Vote model: polymorphic pattern instead of direct FK relations
- CSS fix: removed invalid `border-border` Tailwind class
- Used `prisma db push` instead of `prisma migrate dev` (advisory lock issues)

---

## Admin Improvements + Email Redesign ✅ COMPLETED (2026-02-24)

### Admin Panel — Username Rename
- Added `PATCH /api/admin/users/:id/username` backend route with uniqueness check + Zod validation
- Added `renameUser()` to `ApiService`
- Added "Rename" button + modal in Admin Panel → Mitglieder tab
- Allows admin to correct dumb/inappropriate usernames without deleting accounts

### Email Templates — Visual Redesign
- **Banner:** Replaced `the-people.jpg` (remote URL) with `sacrefice.jpg` embedded as base64
  - Sharp resizes to 580×520 at startup, result cached in memory
  - Falls back to `https://essensgruppe.de/sacrefice.jpg` if file not found
  - Switched from CSS `background-image` (stripped by Gmail) to `<img>` tag with base64 `src`
  - 21% dark gray overlay (`rgba(20,20,20,0.21)`) + text-shadow for legibility
  - Banner height increased to 240px to show the full "man" figure
  - Crop position `center 70%` chosen to center the tied Ken doll figure
- **Wave background:** Redesigned from 6 faint wide blobs to 18 uniform lines, stroke-width 3.5, opacity 0.09
- **Preview tool:** `backend/src/scripts/preview-email.ts` — generates local HTML file without sending

---

## Phase 1.5: Auth Refactor ✅ COMPLETED (2026-02-16)

**Status:** Fully implemented and verified working

### Changes Made:

**Registration → Admin Approval Flow:**
- Registration creates account with `PENDING` status (no auto-login)
- Admin approves/denies in admin panel
- Login blocked for `PENDING` and `BANNED` users with clear error messages
- Register page shows "Request Sent!" success screen

**Schema Changes:**
- Added `UserStatus` enum: `PENDING | ACTIVE | BANNED`
- Added `status` field on User model (default: `PENDING`)
- Made `email` nullable (optional)

**Login Changed to Username:**
- Login uses `username` instead of `email` (frontend + backend)

**Admin Panel Upgraded (3 tabs):**
- **Join Requests** — pending users with Approve/Deny, red badge count
- **Users** — full table with status, clickable balance, Password/Ban/Delete actions
- **Analytics** — active members, pending count, posts, events

**New Admin Features:**
- Balance control: "Set to" or "Add/Remove" modes, logged as `ADMIN_ADJUSTMENT`
- Password reset: admin sets new password, shows plaintext to share with user
- Ban/Unban users

**New Backend Endpoints:**
- `GET /api/admin/users/pending`
- `PATCH /api/admin/users/:id/approve`
- `PATCH /api/admin/users/:id/deny`
- `PATCH /api/admin/users/:id/ban`
- `PATCH /api/admin/users/:id/unban`
- `PATCH /api/admin/users/:id/password`
- Balance endpoint supports `mode: 'set'` or `mode: 'adjust'`

**Seed Script:** `npm run seed` creates admin (username: `admin`, password: `Admin1234!`)

**Prisma Client Regenerated:** Fixed stale client that still expected `email` as required.

---

## Phase 2: Forum System ✅ COMPLETED (2026-02-16)

**Status:** Fully implemented and verified working
**Completion Date:** 2026-02-16
**Deliverable:** Fully functional forum with posts, nested comments, voting, search, and sorting

### Backend Implementation

**New File:** `backend/src/routes/post.routes.ts`
- All routes require authentication via `authenticateToken` middleware
- Input validation with Zod on all endpoints

**API Endpoints Implemented:**

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/posts` | List posts with sort (new/hot/top) and search query |
| `POST` | `/api/posts` | Create new post (title + content, optional imageUrl) |
| `GET` | `/api/posts/:id` | Get single post with nested comment tree + vote data |
| `PATCH` | `/api/posts/:id` | Edit own post (or admin can edit any) |
| `DELETE` | `/api/posts/:id` | Delete own post (or admin). Cascades: deletes all comments + votes |
| `POST` | `/api/posts/:id/comments` | Add comment (supports `parentCommentId` for nested replies) |
| `DELETE` | `/api/posts/comments/:id` | Delete own comment (or admin) |
| `POST` | `/api/posts/:id/vote` | Vote on post (+1/-1). Toggle: same vote removes it, different vote switches |
| `POST` | `/api/posts/comments/:id/vote` | Vote on comment (same toggle behavior) |

**Sorting Algorithm:**
- **New:** Ordered by `createdAt` descending
- **Top:** Ordered by net vote score descending
- **Hot:** Score / (age_in_hours + 2)^1.5 — balances recency with popularity

**Comment Tree Building:**
- Comments fetched flat from DB, then assembled into nested tree in-memory
- Each comment includes `replies[]` array
- Supports unlimited nesting depth

**Vote System:**
- Polymorphic: same Vote table for posts and comments (targetType: POST/COMMENT)
- One vote per user per target (unique constraint on userId + targetId)
- Toggle behavior: clicking same vote removes it, clicking opposite switches it
- Returns `userVote` so frontend can update optimistically

### Frontend Implementation

**Updated File:** `frontend/src/pages/ForumPage.tsx` (replaced placeholder)
- Post list with Reddit-style layout
- Vote column (up/down arrows) with color-coded score
- Search bar with clear button
- Sort tabs: New / Hot / Top
- "New Post" button opens create modal
- Post cards show: title, content preview, author avatar, time ago, comment count
- Image thumbnails on posts (if present)
- Empty state with CTA to create first post
- Framer Motion animations on cards

**New File:** `frontend/src/pages/ThreadPage.tsx`
- Full post detail view at `/forum/:id`
- Vote column for the post
- Edit mode (inline title + content editing for own posts)
- Delete button with confirmation modal
- "Back to Forum" navigation
- Comment form at top
- Recursive `CommentNode` component for nested replies
  - Each comment: vote buttons, reply button, delete button
  - Reply form expands inline
  - Nesting indented with max depth of 6 levels
  - Author avatar, username, time ago

**New File:** `frontend/src/pages/ForumPage.tsx` — includes `CreatePostModal`
- Title field (max 200 chars) with counter
- Content textarea (max 10000 chars) with counter
- Animated modal with backdrop
- Loading state on submit
- Error display

**Updated File:** `frontend/src/App.tsx`
- Added `/forum/:id` route pointing to `ThreadPage`
- Imported `ThreadPage` component

**Updated File:** `frontend/src/services/api.service.ts`
- Added 9 forum API methods: getPosts, getPost, createPost, updatePost, deletePost, createComment, deleteComment, votePost, voteComment

**Updated File:** `frontend/src/types/index.ts`
- Added types: `PostUser`, `Post`, `Comment`, `PostDetail`

### File Storage Setup

**Directory Structure Created:**
```
backend/uploads/
├── .gitkeep
├── avatars/     ← user profile pictures (future)
│   └── .gitkeep
├── posts/       ← forum post images (future)
│   └── .gitkeep
└── events/      ← event photos (future)
    └── .gitkeep
```

**Updated File:** `backend/src/server.ts`
- Added `import path`
- Added `postRoutes` import and `/api/posts` route registration
- Added static file serving: `app.use('/uploads', express.static(...))`

**Updated File:** `.gitignore`
- Upload directories ignored but `.gitkeep` files preserved

---

## Phase 3: Events + Links + MC ✅ COMPLETED (2026-02-18)

**Status:** Fully implemented
**Planned Features:**

### Events (ABI 27):
- Three sections: Upcoming Events, In Planning, Completed
- Event submission form
- Voting system (thumbs up/down)
- Status management (admin moves events between sections)
- Task assignment to members
- Photo galleries for completed events
- External links: GoFundMe, TikTok, Instagram embeds

### Links Page:
- Teachers list with contact info (admin managed)
- Stundenplan dropdown selector
- Important links cards (School website, Moodle, etc.)
- Search functionality

### Minecraft Page:
- Server IP with copy button
- BlueMap iframe embed (http://[OCI-IP]:8100)
- Admin announcements section
- Server rules
- Leaderboards (data source TBD)
- How to join instructions
- Server status indicator (online/offline, player count)

---

### What Was Built (Phase 3):

**Schema additions:**
- `EventVote` model — per-user vote tracking on events (userId, eventId, value, unique constraint)
- `Announcement` model — MC page admin announcements (title, content, userId)
- Relations added to User and Event models

**New Backend Endpoints:**

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/events` | List all events with userVote per current user |
| `POST` | `/api/events` | Create event proposal (auth) |
| `POST` | `/api/events/:id/vote` | Vote +1/-1 on proposed events (toggle/switch) |
| `PATCH` | `/api/events/:id/status` | Admin: move event between PROPOSED/IN_PLANNING/COMPLETED |
| `DELETE` | `/api/events/:id` | Creator or admin: delete event |
| `GET` | `/api/announcements` | List MC announcements newest-first |
| `POST` | `/api/announcements` | Admin: create announcement |
| `DELETE` | `/api/announcements/:id` | Admin: delete announcement |

**New Files:**
- `backend/src/routes/event.routes.ts`
- `backend/src/routes/announcement.routes.ts`

**Updated Files:**
- `backend/src/server.ts` — registered event + announcement routes
- `backend/prisma/schema.prisma` — EventVote + Announcement models
- `frontend/src/types/index.ts` — Event, EventUser, Announcement types
- `frontend/src/services/api.service.ts` — event + announcement API methods

**Frontend Pages Built:**

`EventsPage.tsx` (`/events` — ABI 27):
- 3 tabs: Proposed (with vote count badges), In Planning, Completed
- Tab-animated content switching (Framer Motion)
- Thumbs up/down voting on proposed events (toggle behavior, green/red states)
- Create proposal modal: title, description, date, location, budget
- Admin: "Move Status" button per card → modal to pick new status
- Creator or admin can delete events
- Social links strip (GoFundMe, TikTok, Instagram — update URLs)
- Events sorted by votes descending within Proposed tab

`MinecraftPage.tsx` (`/mc`):
- Hero section with gradient background, server IP + one-click copy button
- Static "online" indicator (update to dynamic when data source available)
- BlueMap iframe (update `BLUEMAP_URL` constant for production)
- Announcements section: admin can post/delete, all members see newest-first
- How to Join — numbered steps
- Server Rules — bullet list
- Leaderboard — placeholder (data source TBD)

`LinksPage.tsx` (`/links`):
- Important Links — 4 colorful cards (school, Moodle, Vertretungsplan, email)
- Stundenplan — dropdown selector with iframe embed (update URLs in constants)
- Teachers list — searchable by name/subject, email links
- All content hardcoded as constants at top of file (easy for admin to update)

**Content to update (placeholders):**
- `SERVER_IP` in MinecraftPage.tsx
- `BLUEMAP_URL` in MinecraftPage.tsx (use OCI IP for production)
- Social links in EventsPage.tsx (GoFundMe, TikTok, Instagram)
- `IMPORTANT_LINKS` in LinksPage.tsx (school URLs)
- `TEACHERS` in LinksPage.tsx (real teacher data)
- `STUNDENPLAN_PEOPLE` in LinksPage.tsx (real schedule links)

---

## Phase 3.5: Event Photo Galleries ✅ COMPLETED (2026-02-18)

**Status:** Fully implemented and deployed

### What Was Built:

**Schema:**
- Added `EventPhoto` model — `id, eventId, userId, imageUrl, createdAt`
- Added `photos EventPhoto[]` relation to `Event` model
- Added `eventPhotos EventPhoto[]` relation to `User` model
- Applied with `prisma db push` + `prisma generate`

**New File:** `backend/src/middleware/upload.middleware.ts`
- multer diskStorage → `uploads/events/`
- Filename: `{timestamp}-{randomUUID()}.jpg` (Node built-in `crypto.randomUUID`)
- File filter: jpeg, png, webp, gif only
- Size limit: 5 MB (multer)
- Exports `uploadEventPhoto` (single field `photo`)

**Updated File:** `backend/src/routes/event.routes.ts`
- `POST /api/events/:id/photos` — multer upload + sharp resize (max 1200px wide, quality 85), saves DB record, returns photo object
- `DELETE /api/events/:id/photos/:photoId` — uploader or admin can delete; removes from DB and disk
- `GET /api/events` — now includes `photos: [...]` on each event (ordered `createdAt asc`)
- `POST /api/events` — now returns `photos: []` on newly created events

**Updated File:** `frontend/src/types/index.ts`
- Added `EventPhoto` interface
- Added `photos: EventPhoto[]` to `Event` interface

**Updated File:** `frontend/src/services/api.service.ts`
- `uploadEventPhoto(eventId, file)` — FormData POST, handles non-JSON responses (413 etc.)
- `deleteEventPhoto(eventId, photoId)` — DELETE request

**Updated File:** `frontend/src/pages/EventsPage.tsx`
- New `PhotoCarousel` component per event card:
  - 0 photos → "📷 Add Photo" button
  - 1+ photos → 220px carousel with Framer Motion slide animation
  - Left/right arrows (hidden at boundaries), dot indicators
  - Bottom-right overlay: × delete (with confirm), + add button
  - Click photo → fullscreen lightbox with prev/next navigation
  - Any member can upload to any event
  - Upload/delete update local state optimistically

### Infrastructure Fixes:

**nginx `client_max_body_size 10m`** (`/etc/nginx/sites-available/web`)
- Default was 1MB — images >1MB returned a 413 HTML page instead of JSON
- Set to 10m to allow large photo uploads
- Config tested and reloaded

**Vite proxy `/uploads`** (`frontend/vite.config.ts`)
- `/uploads` was not proxied — Vite served the SPA HTML fallback instead of the image file
- Added `'/uploads' → http://localhost:3000` proxy entry
- Frontend restarted via PM2

---

## Phase 4.0: Games Page ✅ COMPLETED (2026-02-18)

**Files changed:**
- `frontend/src/pages/GamesPage.tsx` — complete rewrite
- `frontend/src/pages/GamePlaceholderPage.tsx` — new, shared "coming soon" for unbuilt games
- `frontend/src/App.tsx` — added `/games/:game` route + `/games/prediction` specific route
- `frontend/vite.config.ts` — added `/socket.io` proxy with `ws: true`
- `backend/src/server.ts` — Socket.io wired up on HTTP server

**What was built:**
- Single Player tab: Slots, Blackjack, Mines cards (dark themed, purple/green/red)
- Multiplayer tab: Poker, Prediction Market cards (sky/amber)
- Online users bubble (fixed bottom-right, multiplayer tab only) — shows who's on the games page
- Instant messaging: click ✉ next to a user → compose modal → message appears as toast on recipient → 1-minute cooldown
- Socket.io backend: `games:join`, `games:leave`, `games:message`, `games:receive_message`, `games:online_users`
- FAB balance display inline with header
- No tags, no "Play Now" button — click card to navigate

---

## Phase 4.2a: Prediction Market ✅ COMPLETED (2026-02-18)

**Schema additions** (`prisma db push` applied):
- `Prediction` model: id, creatorId, title, closeDate, status (OPEN/CLOSED), outcome (bool|null), timestamps
- `PredictionBet` model: id, predictionId, userId, side (bool), amount, createdAt. Unique: one bet per user per prediction.
- `PredictionStatus` enum: OPEN | CLOSED
- `TransactionType` extended: + PREDICTION_BET, PREDICTION_WIN
- User model: + `predictions[]`, `predictionBets[]` relations

**New backend file:** `backend/src/routes/prediction.routes.ts`
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/predictions` | List all with bet summaries + userBet for caller |
| POST | `/api/predictions` | Create (title + closeDate) |
| POST | `/api/predictions/:id/bet` | Place bet (side: bool, amount) — validates: not creator, not already bet, balance check |
| POST | `/api/predictions/:id/resolve` | Creator closes + sets outcome → distributes payouts |
| DELETE | `/api/predictions/:id` | Creator delete (only if 0 bets) or admin |

**Payout logic:**
- Winners get stake back + `floor(stake / totalWinPool * totalLosePool)`
- Edge case: nobody bet on winning side → full refund to all bettors
- Transactions logged as PREDICTION_WIN

**New frontend file:** `frontend/src/pages/PredictionPage.tsx`
- Dark theme matching GamesPage
- Open/Closed tabs with counts
- YES/NO percentage bar per card
- Bet totals + counts per side
- User's bet badge (shows won/lost when resolved)
- ⓘ info button — tooltip explaining creator can't bet + payout formula
- FAB (+) bottom-left to create new prediction
- Create modal: question + datetime-local picker
- Bet modal: YES/NO toggle, amount input, live payout estimate
- Resolve modal: outcome YES/NO, payout preview before confirming
- Balance auto-refreshes via `ApiService.getProfile()` + `updateUser()` after bet/resolve

**Updated:** `frontend/src/services/api.service.ts` — 5 new prediction methods
**Updated:** `frontend/src/App.tsx` — `/games/prediction` route before `:game` wildcard

---

## Profile Picture Upload ✅ COMPLETED (2026-02-18)

**New backend middleware export:** `upload.middleware.ts`
- Refactored to shared `makeStorage(folder)` helper
- Added `uploadAvatar` (multer → `uploads/avatars/`, 5 MB limit)

**New backend route:** `POST /api/users/me/avatar`
- Multer file upload → sharp resize to 256×256 square JPEG
- Deletes old avatar file from disk before saving new one
- Updates `avatarUrl` on user in DB, returns updated user object

**New frontend method:** `ApiService.uploadAvatar(file)` in `api.service.ts`

**Updated:** `frontend/src/pages/ProfilePage.tsx`
- Avatar area is a clickable button (hidden `<input type="file">`)
- Shows real image if `avatarUrl` set, otherwise initials fallback
- Hover overlay shows camera icon; spinner during upload
- Calls `updateUser()` on AuthContext immediately after success
- Hint text: "Click Profilspicture to change"

**Updated:** `frontend/src/components/Navbar.tsx`
- Profile avatar bubble shows real image if `avatarUrl` set, otherwise initial letter

---

## Phase 4.2b: Poker (Texas Hold'em) ✅ COMPLETED (2026-02-18)

**npm dep added:** `pokersolver` (backend) — hand evaluation (all edge cases, tie-breaking)

**New file:** `backend/src/socket/poker.socket.ts`
- Single-table singleton (6 seats max, expandable)
- Game state machine: `WAITING → PREFLOP → FLOP → TURN → RIVER → SHOWDOWN → WAITING`
- Cryptographic Fisher-Yates shuffle via `crypto.randomInt`
- Blinds: SB = 1 chip, BB = 2 chips, auto-posted at hand start
- Dealer button rotates each hand
- Hole cards sent privately per socket (`poker:my_cards`); public state has `hasCards` only
- Betting: fold / check / call / raise with proper acted-flag reset on raise
- All-in handling: board auto-runs out when all remaining players are all-in
- Showdown: `pokersolver` evaluates best 5-card hand, handles split pots + remainder
- Balance written to DB after every chip movement; `GAME_WIN` / `GAME_BET` transactions logged
- Disconnect / stand-up auto-folds mid-hand and saves balance
- Emote system: 4 emoji choices (`😂 😤 🔥 💀`), broadcast to all at table
- Chat: ≤50 chars, broadcast as `poker:message_broadcast`
- Socket events handled: `poker:sit`, `poker:stand`, `poker:action`, `poker:emote`, `poker:message`, `disconnect`

**New file:** `backend/src/routes/poker.routes.ts`
- `GET /api/poker/state` — returns current public table state for page load

**Updated:** `backend/src/server.ts`
- Imports + calls `registerPokerSocket(io)` after io setup
- Registers `/api/poker` route

**New file:** `frontend/src/pages/PokerPage.tsx`
- Full-screen (navbar hidden via App.tsx exception for `/games/poker`)
- CSS 3D table: `perspective(900px) rotateX(22deg)` + mouse-drag `rotateY` to spin
- Green felt with radial gradient, dark wood rim, EG watermark, ambient glow
- 6 seats positioned absolutely around the oval; each shows avatar/PFP, username, chip count, badges (D/SB/BB/ALL IN)
- Playing cards rendered as pure CSS (white card, rank + suit symbol, red/black coloring)
- Your hole cards shown face-up; others shown face-down (CardBack); revealed at showdown
- Community card slots (5) + pot display centered on felt
- Action bar: Fold / Check / Call (amount) / Raise (range slider) — only shown on your turn
- Hand result overlay: winner name + hand name (e.g. "Full House") + cards, auto-dismisses
- Emote FAB (bottom-right): 4 emoji + chat input, bubbles float above seat 2 s
- New hand auto-starts 2.5 s after 2+ players are seated in WAITING phase

**Updated:** `frontend/src/App.tsx`
- `/games/poker` route added before `:game` wildcard
- Navbar/footer hidden for `/games/poker` (full-screen experience)

**Updated:** `frontend/src/services/api.service.ts`
- `getPokerTables()` method (calls `/api/poker/state`)

**New file:** `kontext/POKER_PLAN.md` — full pre-implementation plan (kept for reference)

---

## Phase 5: Polish + Deployment 🔄 NOT STARTED

**Status:** Waiting for Phase 4 completion
**Planned Tasks:**
- Mobile optimization testing
- Loading states for all async operations
- Comprehensive error handling
- Admin analytics improvements
- Production build scripts
- nginx configuration for OCI
- PM2 ecosystem file
- Environment variable management for production
- Deployment documentation
- GitHub Actions CI/CD (optional)
- SSL certificate setup verification
- Domain configuration (Squarespace → OCI)

---

## Architecture Notes for Future Reference

### Why These Choices Were Made:

1. **Monorepo:** Easier for single developer, single deployment target
2. **Prisma:** Type-safe ORM, great DX, automatic migrations
3. **JWT in localStorage:** Simple, works for this use case (7-day expiry is reasonable)
4. **Vite over CRA:** Faster dev server, better build times
5. **TailwindCSS:** Rapid prototyping, consistent design, small bundle
6. **Framer Motion:** Best React animation library, smooth performance
7. **Context API:** Sufficient for auth state, no need for Redux/Zustand yet

### Database Optimization Notes:

- All foreign keys use `onDelete: Cascade` for data integrity
- Indexes added on frequently queried fields (userId, createdAt)
- Unique constraints on user email/username
- Vote system uses composite unique constraint to prevent duplicate votes
- Comment tree built in-memory from flat query (efficient for moderate thread sizes)

---

## Quick Reference: Important Files

### Documentation:
- `/CLAUDE.md` - Original project specification
- `/PROGRESS.md` - This file (progress tracking)
- `/NextSteps.md` - What to do next session
- `/SETUP.md` - Installation and setup guide

### Backend:
- `/backend/src/server.ts` - Main Express server + Socket.io + poker registration
- `/backend/src/routes/auth.routes.ts` - Auth (register/login)
- `/backend/src/routes/post.routes.ts` - Forum (posts/comments/votes)
- `/backend/src/routes/admin.routes.ts` - Admin panel APIs
- `/backend/src/routes/user.routes.ts` - User profile APIs (incl. avatar upload)
- `/backend/src/routes/poker.routes.ts` - Poker REST (GET /api/poker/state)
- `/backend/src/socket/poker.socket.ts` - Full Texas Hold'em game logic
- `/backend/src/middleware/upload.middleware.ts` - multer for avatars + event photos
- `/backend/prisma/schema.prisma` - Database schema
- `/backend/src/seed.ts` - Admin seed script

### Frontend:
- `/frontend/src/App.tsx` - Router and auth setup
- `/frontend/src/pages/ForumPage.tsx` - Forum post list + create modal
- `/frontend/src/pages/ThreadPage.tsx` - Post detail + nested comments
- `/frontend/src/services/api.service.ts` - All API calls
- `/frontend/src/types/index.ts` - TypeScript interfaces
- `/frontend/src/contexts/AuthContext.tsx` - Global auth state

---

## Known Issues

1. **OneDrive file locking** — `prisma generate` sometimes fails with EPERM. Workaround: kill all node processes first, or use `--skip-generate` flag.
2. **tsx watch not reloading** — Sometimes `tsx watch` doesn't pick up changes. Fix: kill all node processes and restart fresh.
3. **Bash `!` escaping** — On Windows Git Bash, `!` in passwords gets escaped. Use file-based JSON for curl tests, or test via the browser.

---

---

## Phase 4.2b Hotfix: Poker Table Rotation ✅ COMPLETED (2026-02-19)

**File changed:** `frontend/src/pages/PokerPage.tsx`

### Bugs Fixed:

**1. Wrong rotation axis (`rotateY` → `rotateZ`)**
- Drag-to-spin was using `rotateY`, which tilts the table side-to-side like a steering wheel
- Changed state from `rotateY` to `rotateZ` and updated the drag handler accordingly
- `rotateZ` spins the table flat like a lazy susan (correct behavior)

**2. Transform order fixed**
- Old: `rotateX(22deg) rotateY(${rotateY}deg)` — spin around already-tilted axis (wobble)
- New: `rotateZ(${rotateZ}deg) rotateX(22deg)` — spin in global horizontal plane first, then tilt toward viewer

**3. Seats now follow the table**
- Seats were in a sibling div to the 3D table, so spinning the table left them floating at fixed positions
- Wrapped all seats in a new `rotateZ` div with `transformOrigin: '50% 52.8%'` (the oval's center in container coordinates)
- Seats now orbit with the table during drag

**4. Seat content stays upright**
- Each seat's inner content wrapped in `rotateZ(${-rotateZ}deg)` to counter-rotate
- Avatars, usernames, chip counts, and cards remain readable at any rotation angle

---

---

## Phase 4.2c: Poker — Seat Joining, Solo Play, Watchers, Queue, Visual Polish ✅ COMPLETED (2026-02-20)

**Files changed:** `backend/src/socket/poker.socket.ts`, `frontend/src/pages/PokerPage.tsx`

### Backend Changes:
- **Mid-hand seating:** `poker:sit` / `poker:join` no longer require `WAITING` phase. Players seated mid-hand start with `folded: true` until next hand.
- **Solo practice mode:** `tryScheduleStart()` triggers at ≥1 player. Solo branch in `startNewHand()` — interactive: player acts each street (check advances, fold returns pot). `soloAdvancePhase()` / `soloShowdown()` added. Hand name revealed at end. Pot always returned, no net chip change.
- **Queue system:** `tableQueue[]` FIFO. Full table → added to queue instead of error. `dequeueNextPlayer()` auto-seats first queued player when any seat opens (stand/disconnect). Events: `poker:queue_update` (position), `poker:queue_seated`, `poker:leave_queue`. `queueCount` in public state.
- **Deduplicated watchers:** `tableWatchers` changed from `Map<socketId, ...>` to `Map<userId, { socketIds: Set, username, avatarUrl }>`. Multiple tabs = 1 avatar. Entry removed only when all socket connections close.
- **Username in watcher broadcast:** `publicState()` watchers include `username` for tooltips.
- **`soloMode` flag** added to table state and public state broadcast.
- **Shared `seatPlayer()` helper** — deduplicates seat logic between `poker:sit` and `poker:join`.
- **Error logging** improved; `poker:error` now shows chip count.

### Frontend Changes:
- **Seat-based joining:** `canSit = !mySeat && queuePosition === null`. Removed "Join Game" button. Empty seats pulse with green glow animation.
- **Solo play UI:** "Solo Practice" badge in header. Action bar shows phase-appropriate messaging. Hand result shows hand name + hole cards.
- **Watcher display:** Strip above table, always visible. Shows avatar (or initial letter) + username tooltip. `PublicWatcher` type updated with `username`.
- **Queue UI:** `#N in queue` badge + "Leave" button. Header shows queue count badge.
- **Decorative idle cards:** 5 face-down `CardBack` with floating animation when nobody seated.
- **Visual polish:** `AmbientParticles` (18 floating gold dots), `DeckStack` (layered card stack with count), `AnimatedCommunityCard` (flip-reveal on deal), card deal animation on hole cards. Error toast replaces `alert()`. Touch support for table drag. `rotateY` (±45° clamped) for natural 3D feel. 8 emojis in emote panel. Emote FAB only shown when seated.

---

---

## Phase 4.3: Content Fill & Frontend Polish ✅ COMPLETED (2026-02-22)

**Files changed:** `frontend/src/pages/AboutPage.tsx`, `frontend/src/pages/LandingPage.tsx`, `frontend/src/pages/LinksPage.tsx`, `frontend/src/pages/MinecraftPage.tsx`, `frontend/src/pages/EventsPage.tsx`, `frontend/src/pages/AdminPage.tsx`, `frontend/src/components/Footer.tsx`, `frontend/src/App.tsx`, `backend/src/server.ts`, `backend/src/routes/mc.routes.ts`, `backend/src/routes/abi.routes.ts`, `backend/prisma/schema.prisma`

### Phase 4.3a – About Us + Footer + Privacy Policy
- **About page:** Added `the people.jpg` as full-bleed hero background (copied to `frontend/public/`). Removed "What We Offer" section. Added real email `chef@essensgruppe.de`. Updated social links to real Instagram + GoFundMe URLs, removed TikTok.
- **Footer:** Replaced Facebook icon with Email icon. Removed TikTok. Added "Datenschutz" link to footer Quick Links.
- **Privacy page:** New `frontend/src/pages/PrivacyPage.tsx` at route `/privacy`. Shows German privacy policy text.

### Phase 4.3b – Links Page Overhaul
- **Links gallery:** Replaced 4 big cards with compact icon tile gallery (7 links). Real URLs from `content/LinkandMCcontent.md`: Schulwebsite, Moodle, Webuntis, Nextcloud, GoFundMe, Discord, ChatGPT.
- **Teacher list:** All 83 THG Freiburg teachers baked in from `content/teachers.md`. Searchable by name or subject. "E-Mail kopieren" button with clipboard API + green feedback.
- **Stundenplan:** Replaced dropdown with placeholder card (data upload pending).
- **Coming soon:** Essensgruppe AI and PANIK Modus placeholder cards.

### Phase 4.3c – MC Page Updates
- **Server IP:** Updated to `Mc.essensgruppe.com`.
- **BlueMap:** URL updated to `https://essensgruppe.de/bluemap` (nginx reverse proxy on OCI).
- **Real server status:** New backend endpoint `GET /api/mc/status` — TCP connect to port 25565, 3s timeout. Frontend polls every 30s, shows green/red indicator.
- **Server rules:** Updated to exact list from NextSteps.md (6 rules, numbered).
- **Discord:** Added "Join Discord" button → `https://discord.gg/X5nzxXZU` with Discord SVG icon.

### Phase 4.3d – Events Page (ABI 27)
- **Background:** `camping.jpg` added as hero banner behind "ABI 27 Events" title.
- **Social links:** Updated to real URLs (GoFundMe `gofund.me/6c2bc4e83`, Instagram `instagram.com/thg_abi27`). Removed TikTok.
- **Abi Zeitung anonymous submissions:**
  - New DB model `AbiSubmission` (id, title, content, createdAt — no userId). Applied with `prisma db push`.
  - New backend routes: `POST /api/abi/submit` (auth, strips user identity), `GET /api/abi/submissions` (admin), `DELETE /api/abi/submissions/:id` (admin).
  - Frontend: collapsible `AbiZeitungForm` component at bottom of EventsPage. 4000 char counter. Anonymous submit → success toast.
  - Admin panel: New "Abi Zeitung" tab in AdminPage listing all submissions with delete button.

### Phase 4.3e – Landing Page YouTube Background
- Replaced animated gradient blobs with YouTube Shorts iframe background.
- Video ID: `Y2gmQFjpcsU`. Embed params: `autoplay=1&mute=1&loop=1&playlist=...&controls=0`.
- Iframe absolutely positioned + scaled to fill viewport (handles portrait Shorts aspect ratio).
- Dark overlay (`bg-black/55`) keeps text readable.

### Infrastructure Notes:
- `prisma db push` succeeded (DB in sync). `prisma generate` failed with EPERM (DLL locked by running backend) — **restart backend to regenerate client** for `AbiSubmission` model to work.
- `frontend/public/` folder created (didn't exist). Images `the-people.jpg` and `camping.jpg` copied there.

---

## Next Steps for User to Add Details

The following items need real content/data from you before they're complete:

### 1. Stundenplan Data
- Create 2 markdown files (one for student schedule, one for teacher schedule) with time blocks, subjects, teachers, rooms.
- Drop them in `content/` and tag Claude to build the full Stundenplan component.

### 2. Abi Zeitung in Admin
- After restarting the backend, test: submit an anonymous entry from EventsPage → check Admin → Abi Zeitung tab shows it.

### 3. BlueMap nginx Reverse Proxy (OCI)
- On OCI server, add nginx location block to proxy `/bluemap` → `localhost:8100`.
- Log this in `kontext/ocichanges.md` when done.

### 4. About Us / Contact Details
- Current email is `chef@essensgruppe.de`. Update if needed.
- Add class photo to About page if desired (replace/supplement `the-people.jpg`).

### 5. Landing Page Video
- YouTube video `Y2gmQFjpcsU` is set. If you want to swap to a different video, update the embed src in `LandingPage.tsx`.

### 6. MC Leaderboard
- Still a placeholder. Provide the data source (API, file, manual list) when ready.

---

**Last Updated By:** Claude Code (Bugfix — Password Reset)
**Date:** 2026-02-24

---

## Email Provider Switch: Zoho → Resend ✅ (2026-02-23)

**Reason:** Zoho SMTP requires a paid plan for programmatic sending on custom domains.

**Changes:**
- `backend/src/utils/mailer.ts` — SMTP host changed to `smtp.resend.com:587`, auth user is literal string `'resend'`, password is `RESEND_API_KEY`
- `backend/.env` / `.env.example` — replaced `EMAIL_USER` + `EMAIL_PASSWORD` with `RESEND_API_KEY`
- Sender changed from `SupremeLeader@` to `Emperor@essensgruppe.de`
- Domain `essensgruppe.de` verified in Resend dashboard (free tier: 3,000 emails/month)
- Zoho Mail inbox unchanged — Resend is send-only, receiving still via Zoho

**Domain spelling fix:** Corrected `essengruppe.de` → `essensgruppe.de` (with s after n) across all files: CLAUDE.md, .env, .env.example, Footer.tsx, AboutPage.tsx, PROGRESS.md, NextSteps.md

---

## Phase 5.1: Email Template Polish ✅ COMPLETED (2026-02-23)

### Overview
Replaced the single basic verification email with 4 fully designed, dark-themed HTML email templates. All emails fire automatically at the right moment in the user lifecycle.

### New / Updated Files
- `backend/src/services/email.service.ts` — complete rewrite with 4 exported functions
- `backend/src/routes/auth.routes.ts` — welcome + admin alert wired in
- `backend/src/routes/admin.routes.ts` — credentials email wired into admin user creation
- `backend/src/scripts/send-test-emails.ts` — dev test script (send all 4 to any address)

### 4 Templates

| Function | Trigger | Recipient |
|----------|---------|-----------|
| `sendVerificationEmail(user, token)` | User registers | New user |
| `sendWelcomeEmail(user)` | User clicks verification link → account activated | New user |
| `sendAdminNewUserAlert(user)` | User registers (fires same time as verification email) | Admin (ADMIN_EMAIL) |
| `sendAdminCreatedAccountEmail(user, tempPassword)` | Admin creates a user manually in admin panel | New user |

### Design System
All templates share:
- Dark background: `#080812` / card `#0f0f1e`
- Purple gradient header: `#6d28d9 → #4338ca → #3730a3` with decorative circles
- EG badge in header, "Essensgruppe Portal" title, "Abi 2027 — Freiburg" tagline
- Primary CTA button: `#7c3aed → #4f46e5` gradient, 12px border-radius
- Footer: essensgruppe.de + Datenschutz links
- Responsive (`@media max-width:600px` padding adjustments)
- Google Fonts Inter loaded via `@import`
- Hidden preheader text for inbox preview

### Template-specific highlights
- **Verification**: Shows raw verify URL in a code block for fallback; security note (24h expiry)
- **Welcome**: Feature list with icon tiles (Forum, Events, Games, MC); gold coin banner "1.000 Startmünzen"
- **Admin alert**: Orange "Neue Registrierung" badge; username + email in info card; link to admin panel
- **Credentials**: Green "Account erstellt" badge; username + temp password in monospace code box; red warning to change password

### Test Script
```bash
cd backend && npx tsx src/scripts/send-test-emails.ts your@email.com
```
Sends all 4 templates with dummy data. All go to the specified address (admin alert is redirected too).

---

## Phase 5.2: Email Redesign + Password Reset ✅ COMPLETED (2026-02-24)

### Email Design Overhaul
All templates (verification, welcome, password reset, admin alert, admin-created account) rebuilt with a new light theme:

**Design system changes:**
- Background: `#faf8ff` (light purple-tinted white) with SVG wave lines applied as inline `background-image` on outer `<td>` (not `<style>` block — Gmail strips those)
- Header: pure purple gradient `#6d28d9 → #4338ca → #3730a3` — no photo (removed, caused layout issues in Gmail)
- Card: white `#ffffff`, `border: 1px solid #ede9fe`, `box-shadow: 0 8px 48px rgba(109,40,217,0.13)`, `border-radius: 20px`
- Body text: dark `#1e1b4b` / `#374151`; accent `#7c3aed`; muted `#6b7280`
- Primary CTA button: `#7c3aed → #4f46e5` gradient with purple drop shadow
- Footer: `#faf8ff` background, purple muted links
- Subject lines: no emojis — clean impactful German text
- Sender display name: **Essensgruppe Supreme Leader** (updated in `.env` + `.env.example`)

**Updated file:** `backend/src/services/email.service.ts`
- Shared `waveBg()` helper — generates SVG data URL with `encodeURIComponent` at module load
- Shared `header()`, `primaryBtn()`, `infoBox()`, `alertBox()`, `footer()` components
- All 5 send functions updated to use new design

### New: Self-Service Password Reset

**Schema addition** (`backend/prisma/schema.prisma`):
- New `PasswordReset` model: id, userId (unique), token (unique), expiresAt, createdAt
- Relation `passwordReset PasswordReset?` added to User model
- Applied with `prisma db push` + `prisma generate`

**New backend routes** (`backend/src/routes/auth.routes.ts`):
| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/auth/forgot-password` | Body: `{ email }`. Creates 1-hour reset token, sends email. Always returns generic OK (no email enumeration). |
| `POST` | `/api/auth/reset-password` | Body: `{ token, newPassword }`. Validates token, updates password hash, deletes token. |

**New email template:** `sendPasswordResetEmail(user, token)`
- Subject: "Passwort zurücksetzen — Essensgruppe Portal"
- Red alert box: link expires in 1 hour
- Fallback URL shown in code block

**New frontend pages:**
- `frontend/src/pages/ForgotPasswordPage.tsx` at `/forgot-password` — email input, shows generic success screen after submit
- `frontend/src/pages/ResetPasswordPage.tsx` at `/reset-password?token=...` — new password + confirm, redirects to login on success

**Updated files:**
- `frontend/src/App.tsx` — `/forgot-password` and `/reset-password` routes added
- `frontend/src/services/api.service.ts` — `forgotPassword(email)` and `resetPassword(token, newPassword)` added
- `frontend/src/pages/LoginPage.tsx` — "Passwort vergessen?" link added next to password label
- `backend/src/scripts/send-test-emails.ts` — updated to send 3 main templates (verification, welcome, password reset)

---

## Phase 5.0: Email Verification + Role Refactor ✅ COMPLETED (2026-02-23)

### Overview
Replaced admin-approval registration flow with email verification. New role system.

### Key Changes:

**Prisma Schema:**
- `Role` enum: replaced `USER` with `ABI27` + `ESSENSGRUPPE_MITGLIED` (kept `ADMIN`)
- `User.email` made required (was nullable)
- `User.emailVerified Boolean @default(false)` added
- New `EmailVerification` model (token, userId, expiresAt)
- New `AppSetting` model (key/value store)

**New Backend Files:**
- `backend/src/utils/mailer.ts` — Zoho SMTP transporter (smtp.zoho.eu:587)
- `backend/src/services/email.service.ts` — `sendVerificationEmail(user, token)`

**Updated Backend Files:**
- `backend/src/routes/auth.routes.ts`: `/register` requires email, creates verification token, sends email; new `GET /verify-email?token=`; `/login` accepts username OR email via `identifier` field
- `backend/src/routes/admin.routes.ts`: pending tab now shows email column; admin-created users skip verification; new `PATCH /users/:id/role`; new `GET /settings` + `PATCH /settings`
- `backend/src/types/index.ts`: `UserRole` type, `RegisterDto.email`, `LoginDto.identifier`
- `backend/src/middleware/auth.middleware.ts`: role type updated
- `backend/src/seed.ts`: admin email → `chef@essensgruppe.de`, emailVerified=true, seeds AppSetting

**New Frontend File:**
- `frontend/src/pages/VerifyEmailPage.tsx` — reads token from URL, calls verify API, shows success/error

**Updated Frontend Files:**
- `frontend/src/types/index.ts`: `UserRole` type, updated `LoginCredentials` + `RegisterCredentials`
- `frontend/src/services/api.service.ts`: updated auth methods + new `verifyEmail`, `getAdminSettings`, `updateAdminSettings`, `updateUserRole`
- `frontend/src/contexts/AuthContext.tsx`: login credential type updated to `identifier`
- `frontend/src/pages/RegisterPage.tsx`: email field added, new success screen
- `frontend/src/pages/LoginPage.tsx`: username field → identifier, German labels
- `frontend/src/pages/AdminPage.tsx`: pending tab shows email + German labels; users table role badge clickable with role modal; new Einstellungen tab with registration toggle
- `frontend/src/App.tsx`: `/verify-email` route added

**Email SMTP Config (Zoho):**
- Host: smtp.zoho.eu:587
- User: Emperor@essensgruppe.de
- Auth: App Password (2FA enabled)
- Vars in `backend/.env`: EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM, ADMIN_EMAIL

**New Role System:**
| Role | Description | Default? |
|------|-------------|---------|
| `ABI27` | Any verified Abi 2027 student | ✅ After email verify |
| `ESSENSGRUPPE_MITGLIED` | Inner circle | Admin upgrade |
| `ADMIN` | Full rights | Seed only |

---

## Email Verification Bugfixes + Email Image Removal ✅ COMPLETED (2026-02-24)

### Problems Fixed

**1. Email scanner consuming the verify token (GET → POST)**
- Email scanners (e.g. Gmail's safety scanner) pre-fetch links in emails via GET requests
- This consumed the single-use token before the user ever clicked it, making verification always fail
- **Fix:** Changed `GET /api/auth/verify-email?token=...` → `POST /api/auth/verify-email` with token in request body
- Frontend: `VerifyEmailPage.tsx` now sends a POST; `api.service.ts` `verifyEmail()` updated accordingly

**2. React StrictMode double-invocation consuming token**
- React StrictMode runs effects twice in dev, firing the verify POST twice in quick succession
- Second call failed ("token already used") and overwrote the success state with an error
- **Fix:** Added `useRef(false)` guard in `VerifyEmailPage.tsx` — effect runs only once even with StrictMode

**3. Stale PENDING accounts blocking re-registration**
- If a user registered but never verified, their email/username slot was permanently occupied
- Re-registering with same email or username returned "already taken" with no way to recover
- **Fix:** `auth.routes.ts` registration now detects PENDING conflicts and deletes the stale record before creating a new one

**4. Verify endpoint not idempotent (double-click error)**
- Clicking the email link a second time (within 24h) returned "already used" error
- **Fix:** Endpoint checks if `user.status === 'ACTIVE'` and returns success immediately — safe to click multiple times
- Token is kept in DB for 24h (not deleted on first use), so repeated clicks always succeed within the window

**5. `forgot-password` silent failure for unverified emails**
- PENDING users who hadn't verified would get the generic "if this email exists..." message
- This gave no useful feedback — user was stuck, couldn't reset password either
- **Fix:** PENDING users now get a specific German error telling them to check their inbox for the verification link

**6. Rate limiter messages not parseable as JSON**
- `express-rate-limit` was returning plain strings as the response body
- Frontend JSON parsing failed silently, showing no error message to user
- **Fix:** All 3 limiters (`loginLimiter`, `apiLimiter`, `registerLimiter`) now return `{ error: '...' }` objects

### Email Template: Banner Image Removed

The previous email header used a banner photo (`sacrefice.jpg`) embedded as base64 via sharp:
- `sharp` resized + encoded the image on startup
- Caused slow startup; embedding a ~200 KB base64 blob in every email
- The image caused layout issues in some email clients

**New header:** Pure CSS purple gradient (`#6d28d9 → #4338ca → #3730a3`) — no image dependency, renders identically everywhere.

**Files changed:**
- `backend/src/services/email.service.ts` — removed `sharp` import, removed `getBannerSrc()` / `_cachedBanner`, `header()` no longer takes a `bannerSrc` param, replaced `<img>` banner with gradient `<td>`
- `backend/src/scripts/preview-email.ts` — same removals applied to local preview script
- Wave SVG background moved from CSS `body` rule (stripped by Gmail) to inline `background-image` on outer `<td>` (survives Gmail)

**Other:**
- `backend/src/server.ts` — added `app.use('/content', express.static(...))` to serve the `content/` folder publicly (was needed for a previous image approach, kept for potential future use)

---

## Bugfix: Password Reset "Requires Admin Access" ✅ FIXED (2026-02-24)

### Problem
Clicking the reset-password link from email resulted in "requires admin access" error.

### Root Cause
`ApiService` had **two static methods with the same name** `resetPassword`:
1. Line 75: public reset — called `/auth/reset-password` (no auth)
2. Line 173: admin reset — called `/admin/users/${userId}/password` (requires ADMIN role)

JavaScript class method resolution: the second definition silently overwrites the first. So `ResetPasswordPage` was actually hitting the admin endpoint with the reset token as a userId — which correctly rejected it as unauthorized.

### Fix
- Renamed the admin method from `resetPassword` → `adminResetPassword` in `frontend/src/services/api.service.ts`
- Updated the call in `frontend/src/pages/AdminPage.tsx` line 184 to use `adminResetPassword`
- Public `resetPassword(token, newPassword)` is now the only method by that name and works for any user with the link
