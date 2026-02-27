# Security Audit — Findings & Hardening

**Branch:** `security/audit`
**Date:** 2026-02-25
**Auditor:** Claude (security/audit agent, WebsiteDev2 clone)

---

## Scope

Full backend audit covering:
- Server-side role enforcement on all Express routes
- Missing auth middleware on protected endpoints
- XSS, SQL injection, OWASP vulnerabilities
- File upload handling
- Rate limiting on sensitive auth endpoints
- JWT secret exposure
- Frontend secret leakage
- Source map exposure in production builds

---

## What Was Found Clean (No Changes Made)

### Role Enforcement
All routes are correctly protected server-side:
- `admin.routes.ts` — double-guarded: `authenticateToken` + `requireAdmin` on router level
- `user.routes.ts` — `authenticateToken` on router level (all routes)
- `post.routes.ts` — `authenticateToken` on router level (all routes)
- Game routes (slots, blackjack, poker, predictions) — all require `authenticateToken`
- `abi.routes.ts` — submit requires auth, admin routes require admin
- `announcement.routes.ts` — read requires auth, create/delete require admin
- `mc.routes.ts` GET `/status` — **intentionally public** (TCP ping, read-only, no sensitive data)
- `event.routes.ts` GET `/` — **intentionally uses `optionalAuth`** (public event browsing was a design decision; write/delete routes require auth)

### XSS & Injection
- No `$queryRaw` or `$executeRaw` anywhere — all Prisma queries use the type-safe builder
- All user inputs flow through Zod validation schemas before reaching the DB
- No raw HTML templating in API responses

### File Uploads (`upload.middleware.ts`)
- MIME type allowlist: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- 5 MB size limit enforced
- Filenames generated as `{timestamp}-{uuid}.jpg` — no user-controlled filenames
- Sharp reprocessing rejects non-image binaries at decode stage (defense in depth)
- Old avatars deleted when new ones are uploaded

### Frontend Secrets
- Only `VITE_API_URL` exposed via `import.meta.env` — no backend secrets in frontend code
- `.env` is in `.gitignore` (line 14) — not committed to the repository

---

## What Was Fixed

### 1. Rate Limiting on Password Reset Endpoints (HIGH)

**Problem:** `POST /api/auth/forgot-password` and `POST /api/auth/reset-password` had no rate limiting. An attacker could spam password-reset emails (causing email abuse) or attempt token enumeration without throttling.

**Fix:**
- Added `forgotPasswordLimiter` to `backend/src/middleware/rateLimiter.middleware.ts` (5 req / 15 min per IP)
- Added `resetPasswordLimiter` to `backend/src/middleware/rateLimiter.middleware.ts` (5 req / 15 min per IP)
- Applied both in `backend/src/routes/auth.routes.ts` at the route level

### 2. JWT_SECRET Production Safety Guard (HIGH)

**Problem:** Three files used `|| 'fallback-secret-change-this'` as the JWT_SECRET fallback:
- `backend/src/middleware/auth.middleware.ts`
- `backend/src/utils/jwt.util.ts`
- `backend/src/server.ts`

If `JWT_SECRET` is accidentally unset in production, all tokens are signed with a publicly known string — complete authentication bypass.

**Fix:** Added a startup check in `backend/src/server.ts` (after `dotenv.config()`):
```typescript
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable is required in production');
  }
  console.warn('⚠️  JWT_SECRET not set — using insecure fallback (development only)');
}
```
The fallback strings remain for dev convenience. The guard crashes the server in production before it can serve any requests.

### 3. Source Maps Explicitly Disabled (MEDIUM)

**Problem:** `frontend/vite.config.ts` had no `build` section. While Vite defaults to no source maps in production, leaving it implicit is risky.

**Fix:** Added to `frontend/vite.config.ts`:
```typescript
build: {
  sourcemap: false,
},
```

### 4. `requireMember` Middleware Added (Forward-Looking)

**Problem:** No middleware existed to enforce the `ESSENSGRUPPE_MITGLIED` role. The `post-visibility` feature branch needs it for filtering content.

**Fix:** Added `requireMember` export to `backend/src/middleware/auth.middleware.ts`:
- Accepts `ESSENSGRUPPE_MITGLIED` or `ADMIN` roles
- Returns 401 if unauthenticated, 403 if wrong role
- Usage: `router.get('/some-route', authenticateToken, requireMember, handler)`

---

## Middleware Reference (auth.middleware.ts exports)

| Export | Purpose |
|--------|---------|
| `authenticateToken` | Requires valid JWT; 401 if missing, 403 if invalid/expired |
| `optionalAuth` | Attaches user if valid token present; never rejects (for public routes) |
| `requireAdmin` | Must come after `authenticateToken`; requires `ADMIN` role |
| `requireMember` | Must come after `authenticateToken`; requires `ESSENSGRUPPE_MITGLIED` or `ADMIN` |

## Rate Limiter Reference (rateLimiter.middleware.ts exports)

| Export | Limit | Applied To |
|--------|-------|-----------|
| `loginLimiter` | 5 req/min | POST /api/auth/login |
| `registerLimiter` | 3 req/hr | POST /api/auth/register |
| `forgotPasswordLimiter` | 5 req/15min | POST /api/auth/forgot-password |
| `resetPasswordLimiter` | 5 req/15min | POST /api/auth/reset-password |
| `apiLimiter` | 20 req/min | (exported but not currently applied globally) |

---

## Intentional Design Decisions (Do Not "Fix" These)

- **MC status endpoint public** — TCP ping only, no sensitive data, intentional
- **Event listing uses `optionalAuth`** — public browsing was a design choice; content visibility filtering is handled by the `post-visibility` feature branch
- **Admin can create ADMIN users** — intentional (seed account creation); only one admin exists in practice
- **No right-click/console blocking** — security theater, deliberately excluded
