# Progress Log — Session 2

**Date:** 2026-02-18
**Phase:** Phase 2 Refinement — Forum Bubble Interface + Bug Fixes

---

## 1. Forum Bubble Interface (ForumPage.tsx) ✅

Replaced the Reddit-style list view with a **floating bubble / mindmap interface** as per the original spec.

### What Was Built

**File changed:** `frontend/src/pages/ForumPage.tsx` (complete rewrite)

**Visual Design:**
- Dark cosmic background (`#060b18`) with radial gradient nebulae and a subtle dot grid overlay
- Each post renders as a glowing circular bubble positioned absolutely on a canvas
- 6 color themes (indigo, cyan, emerald, rose, amber, purple) — assigned deterministically per post ID via seeded hash
- Bubble size scales with post activity: `voteScore + commentCount * 1.5` → radius 58–95px

**Animation:**
- Each bubble **floats vertically** with a sine-wave Framer Motion animation (independent amplitude, duration, delay per bubble — all seeded so they're stable)
- **Spring entrance animation** on load — bubbles pop in with staggered delay (`i * 0.045s`)
- Hover: scale 1.12 + intensified glow box-shadow
- Tap: scale 0.93
- AnimatePresence handles exit (scale to 0.15) when posts change via search/sort

**Bubble Content:**
- Author avatar (colored circle with username initial)
- Post title (line-clamp-2 or line-clamp-3 depending on size)
- Vote score + comment count (shown for radius > 58px)

**Placement Algorithm:**
- Seeded RNG (`mulberry32` + `hashStr`) so each post always gets the same position regardless of render order
- Rejection sampling (up to 140 attempts per bubble, min gap 16px) to avoid overlaps
- Falls back gracefully to overlapping positions when canvas is crowded

**Header Controls:**
- Glassmorphic header bar with backdrop-blur
- Search input + clear button
- Sort tabs: Hot / New / Top (defaults to Hot)
- "Neuer Post" button with indigo gradient + glow

**States:**
- Loading: 5 animated pulsing placeholder circles
- Empty: single breathing bubble with pulsing glow, click to create first post
- Error: floating error toast

**Modal:**
- Dark-themed create post modal (rgba dark glass, indigo border glow)
- Title + content fields with character counters
- German labels throughout

**Navigation:** Clicking a bubble navigates to `/forum/:id` (ThreadPage — unchanged)

**No backend changes required** — reuses existing `ApiService.getPosts` / `ApiService.createPost`.

---

## 2. Admin Login Fix ✅

**Problem:** Login returned `"Your account is awaiting admin approval."` — admin user had `PENDING` status in the database.

**Root Cause:** The admin account was created via the registration form (which sets status to `PENDING` by design) rather than via the seed script.

**Fix:** Ran `npm run seed` — the seed script detected the existing admin user and updated it:
```
data: { role: Role.ADMIN, status: 'ACTIVE' }
```

**Verified:** `POST /api/auth/login` with admin credentials now returns a valid JWT token.

**Prevention:** Always use `npm run seed` to initialize the admin account on a fresh DB or after wiping users.

---

## Server State (Production OCI)

Both PM2 processes running:

| Process | PID | Port | Status |
|---------|-----|------|--------|
| backend | 3505378 (child) | 3000 | online |
| frontend (Vite) | 3507124 | 3001 | online |

nginx proxies `https://essensgruppe.de` → port 3001 (Vite dev server) → Vite proxies `/api/*` → port 3000 (Express backend).

---

## Files Changed This Session

| File | Change |
|------|--------|
| `frontend/src/pages/ForumPage.tsx` | Complete rewrite — bubble mindmap interface |

---

## 3. Forum Physics Engine ✅

Replaced Framer Motion drag with a full real-time physics simulation (single `requestAnimationFrame` loop, all DOM updates imperative — zero React re-renders per frame).

**File changed:** `frontend/src/pages/ForumPage.tsx` (major additions)

### Bubble Physics
- **Repulsion**: bubbles push each other away when within `r1 + r2 + MIN_GAP` — force scales inversely with distance
- **Anti-gravity behaviour**: bubbles stay where dropped (high damping `0.78`), no spring-back to origin
- **Center gravity**: weak `CENTER_K = 0.0018` spring toward canvas center — bubbles dragged off-screen slowly drift back and settle at equilibrium
- **Overlap glitch fix**: `dist` clamped to minimum 1px + per-frame force cap `MAX_FORCE = 8` prevents division-by-zero blow-up when two bubbles fully overlap
- **Drag**: manual pointer events with `setPointerCapture` — click vs drag distinguished by move count threshold (>4 moves = drag, else navigate)

### Satellite Node Physics
- Each satellite is an independent physics body with its own position/velocity
- Spring force toward bubble's visual center (physics Y + float offset) at rest length `r + 30px`
- When bubble moves, spring tension drags satellites along with lag and wobble (SAT_K = 0.032, SAT_DAMP = 0.88)
- Dashed SVG lines from bubble center to each satellite, updated via `setAttribute` every frame

### Viewport System (Infinite Canvas)
- All bubbles/satellites/lines live inside a `viewport` div with `transform: translate(tx,ty) scale(s)` applied imperatively
- **Pan**: drag on background (behind bubbles) translates the viewport; bubbles call `e.stopPropagation()` so pan and drag don't conflict
- **Wheel zoom**: non-passive listener, zooms centered on cursor position using standard map-zoom math `(newTx = mx - ((mx-tx)/scale)*newScale)`
- **Zoom buttons**: `+` / `−` / `⊡` (fit all) in bottom-right corner, zoom centered on canvas center
- **Auto-fit**: on post load, computes bounding box of all bubbles and sets scale/translate to fit with 64px padding — more bubbles = auto zoomed out
- **Drag coordinate fix**: bubble drag converts screen→world via `(screenX - tx) / scale` so dragging feels correct at any zoom level

### Physics Constants
| Constant | Value | Purpose |
|----------|-------|---------|
| `REPULSION` | 200 | Soft bubble-bubble push |
| `MIN_GAP` | 36 | Repulsion threshold extra gap |
| `B_DAMP` | 0.78 | Bubble velocity decay |
| `CENTER_K` | 0.0018 | Center gravity strength |
| `MAX_FORCE` | 8 | Per-frame force cap |
| `SAT_K` | 0.032 | Satellite spring stiffness |
| `SAT_DAMP` | 0.88 | Satellite velocity decay |

---

## 4. Bug Fixes ✅

- **`VITE_API_URL` misconfiguration**: `frontend/.env` had `VITE_API_URL=http://localhost:3000/api` — browsers tried to connect to the server's localhost, causing "failed to fetch". Fixed to `/api` so Vite's proxy handles it. Frontend restarted via PM2.
- **Navbar login button**: Hidden "Ich bin Teil der Essensgruppe" button when already on `/login` page (used existing `useLocation` hook).

---

**Next:** Continue Phase 2 refinement or move to Phase 3 (Events + Links + MC).
