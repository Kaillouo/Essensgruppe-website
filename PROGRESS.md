# Project Progress Log

**Last Updated:** 2026-02-16
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

## Phase 3: Events + Links + MC 🔄 NOT STARTED

**Status:** Next up
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

## Phase 4: Gambling Framework 🔄 NOT STARTED

**Status:** Waiting for Phase 3 completion
**Planned Features:**
- Games list page with cards
- WebSocket setup for real-time gameplay
- Individual game pages (e.g., /games/coinflip)
- Bet validation (server-side)
- Balance updates via transactions
- Animations for game results
- 5% house edge implementation
- Game history tracking
- Transaction logging for all bets/wins

**Games to Design Later** (user will provide specs)

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
- `/backend/src/server.ts` - Main Express server
- `/backend/src/routes/auth.routes.ts` - Auth (register/login)
- `/backend/src/routes/post.routes.ts` - Forum (posts/comments/votes)
- `/backend/src/routes/admin.routes.ts` - Admin panel APIs
- `/backend/src/routes/user.routes.ts` - User profile APIs
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

**Last Updated By:** Claude Code
**Next Update:** After Phase 3 completion
