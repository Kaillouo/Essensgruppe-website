# Security Audit

**Date:** 2026-02-25 | **Status:** DONE

## What Was Fixed

1. **Rate limiting on password reset** (HIGH) — Added `forgotPasswordLimiter` + `resetPasswordLimiter` (5 req/15min) to auth routes
2. **JWT_SECRET production guard** (HIGH) — Server crashes on startup if `JWT_SECRET` unset in production. Dev fallback kept for convenience.
3. **Source maps disabled** (MEDIUM) — Explicit `build: { sourcemap: false }` in vite.config.ts
4. **`requireMember` middleware** — New export in auth.middleware.ts; accepts ESSENSGRUPPE_MITGLIED or ADMIN

## What Was Clean (No Changes Needed)
- All routes correctly protected server-side with `authenticateToken` / `requireAdmin`
- No raw SQL — all Prisma type-safe queries; Zod validation on all inputs
- File uploads: MIME allowlist, 5MB limit, UUID filenames, Sharp reprocessing
- Only `VITE_API_URL` exposed to frontend; `.env` in `.gitignore`

## Middleware Reference

| Export | Purpose |
|--------|---------|
| `authenticateToken` | Requires valid JWT; 401/403 |
| `optionalAuth` | Attaches user if token present; never rejects |
| `requireAdmin` | After authenticateToken; requires ADMIN |
| `requireMember` | After authenticateToken; requires ESSENSGRUPPE_MITGLIED or ADMIN |

## Rate Limiters

| Export | Limit | Route |
|--------|-------|-------|
| `loginLimiter` | 5/min | POST /api/auth/login |
| `registerLimiter` | 3/hr | POST /api/auth/register |
| `forgotPasswordLimiter` | 5/15min | POST /api/auth/forgot-password |
| `resetPasswordLimiter` | 5/15min | POST /api/auth/reset-password |

## Intentional Decisions (Do Not "Fix")
- MC status endpoint is intentionally public (TCP ping, no sensitive data)
- Event listing uses `optionalAuth` (public browsing by design)
- No right-click/console blocking (security theater)
