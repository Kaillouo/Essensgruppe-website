# Next Steps — Essensgruppe Portal

**Last Updated:** 2026-02-24
**Current Status:** Email system COMPLETE — ready for Phase 5 (Polish + Deployment)

---

## What Was Just Done (2026-02-24)

1. **Email template redesign** — All 5 templates rebuilt with light theme: white wave-animated background, photo header (the-people.jpg, 115% zoom + purple overlay), no emoji subjects, sender = "Essensgruppe Supreme Leader".
2. **Password reset flow** — Full end-to-end: `POST /forgot-password` + `POST /reset-password` backend routes, `PasswordReset` DB model, `ForgotPasswordPage.tsx` + `ResetPasswordPage.tsx` frontend pages, "Passwort vergessen?" link on login page.
3. **DB schema** — `PasswordReset` model added and pushed.

Full details in `kontext/PROGRESS.md` → Phase 5.1 + Phase 5.2.

---

## Up Next: Phase 5 — Polish + Deployment

### Overview
Registration no longer waits for admin approval. Instead:
1. User registers with username + email + password
2. Verification email sent from `Emperor@essensgruppe.de` (Zoho SMTP)
3. User clicks link → account activates automatically
4. Admin can still open/close registration, delete accounts, manage roles

### New Role System
| Role | Description | Default? |
|------|-------------|---------|
| `ABI27` | Any Abi 2027 student with verified account | ✅ Yes (after email verify) |
| `ESSENSGRUPPE_MITGLIED` | Inner circle — admin upgrades from ABI27 | No |
| `ADMIN` | Full rights | No |

Same rights for ABI27 and ESSENSGRUPPE_MITGLIED for now. Admin can upgrade users.

---

## Email Config (Resend SMTP)

**Bot email:** `Emperor@essensgruppe.de`
**SMTP Host:** `smtp.resend.com`
**Port:** 587 (STARTTLS)
**Auth:** `user: 'resend'`, `pass: RESEND_API_KEY`

**Required `.env` additions:**
```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
EMAIL_FROM="Essensgruppe Portal <Emperor@essensgruppe.de>"
ADMIN_EMAIL=chef@essensgruppe.de
```

### One-time setup (do this once):
1. Sign up at [resend.com](https://resend.com) (free — 3,000 emails/month)
2. Resend dashboard → Domains → Add `essensgruppe.de`
3. Add DNS records in **Squarespace DNS**:
   - **SPF**: Edit (don't add new!) your existing SPF TXT record to merge both:
     `v=spf1 include:zoho.eu include:resend.net ~all`
   - **DKIM**: Add the new TXT record Resend gives you (different subdomain — no conflict with Zoho)
   - **DMARC**: Add if shown (optional)
4. Wait for Resend to show domain as Verified (usually minutes)
5. Resend dashboard → API Keys → Create → copy the key
6. Add `RESEND_API_KEY=re_...` to `backend/.env`, remove old `EMAIL_USER`/`EMAIL_PASSWORD`

> **Note:** Your Zoho inbox stays untouched. Resend is sending-only.

---

## Implementation Plan (Phases)

### Phase 1: Prisma Schema ✅ (run these commands)
Changes to `backend/prisma/schema.prisma`:
- `Role` enum: added `ABI27`, `ESSENSGRUPPE_MITGLIED` (kept `USER` temporarily)
- `User.email` made required (was nullable)
- Added `User.emailVerified Boolean @default(false)`
- New `EmailVerification` model (token, userId, expiresAt)
- New `AppSetting` model (key, value) — for registration open/close

**Two-step migration needed (enum rename):**
```bash
# Step 1: push with USER still present
cd backend && npx prisma db push

# Step 2: migrate existing USER rows to ABI27
npx prisma db execute --stdin <<'SQL'
UPDATE users SET role = 'ABI27' WHERE role = 'USER';
SQL

# Step 3: remove USER from schema, push again
npx prisma db push
npx prisma generate
```

### Phase 2: Email Service
- New `backend/src/utils/mailer.ts` — Zoho SMTP transporter
- New `backend/src/services/email.service.ts` — `sendVerificationEmail(user, token)`
- Verification email: German, link to `${FRONTEND_URL}/verify-email?token=xxx`, 24h expiry

### Phase 3: Auth Routes (`backend/src/routes/auth.routes.ts`)
- `/register`: Now requires `email`, checks registration door (`AppSetting.REGISTRATION_OPEN`), creates `EmailVerification` record, sends email
- New `GET /api/auth/verify-email?token=xxx`: activates account
- `/login`: Now accepts `identifier` (username OR email)

### Phase 4: Admin Routes (`backend/src/routes/admin.routes.ts`)
- Admin-created users skip email verification (`emailVerified: true`, `status: ACTIVE`)
- New `PATCH /api/admin/users/:id/role` — upgrade ABI27 → ESSENSGRUPPE_MITGLIED
- New `GET /api/admin/settings` — returns `{ registrationOpen: boolean }`
- New `PATCH /api/admin/settings` — toggles registration open/closed

### Phase 5: Backend Types + Middleware
- `backend/src/types/index.ts`: role updated to `'ABI27' | 'ESSENSGRUPPE_MITGLIED' | 'ADMIN'`
- `backend/src/middleware/auth.middleware.ts`: no changes needed (requireAdmin still checks `=== 'ADMIN'`)

### Phase 6: Seed Script (`backend/src/seed.ts`)
- Admin email → `chef@essensgruppe.de`
- Admin gets `emailVerified: true`
- Seeds `AppSetting { key: 'REGISTRATION_OPEN', value: 'true' }`

### Phase 7: Frontend Types + API Service
- `frontend/src/types/index.ts`: `User.role` updated to new roles; `LoginCredentials.identifier`; `RegisterCredentials.email`
- `frontend/src/services/api.service.ts`: updated `register()`, `login()`, + new `verifyEmail()`, `getAdminSettings()`, `updateAdminSettings()`, `updateUserRole()`

### Phase 8: Frontend Pages
- `RegisterPage.tsx`: add email field, update success message, show "closed" if registration off
- `LoginPage.tsx`: `username` field → `identifier` ("Benutzername oder E-Mail")
- New `VerifyEmailPage.tsx` at `/verify-email`: reads token from URL, calls verify API
- `App.tsx`: add `/verify-email` route
- `AdminPage.tsx`: email column in Join Requests, role column + upgrade button in Users, new Einstellungen tab with registration toggle

---

## Verification Steps (After Implementation)
1. Kill node processes → run 2-step prisma migration above
2. Add email env vars to `backend/.env`
3. `npm run seed` → admin gets `chef@essensgruppe.de`
4. Restart backend → see "✅ Email service ready" in console
5. Register new test user with real email → check inbox for verification email
6. Click link → `/verify-email?token=...` → "Verifiziert!"
7. Login with email OR username → works
8. Admin panel → Join Requests: shows pending unverified users
9. Admin panel → Einstellungen: toggle registration closed → register attempt shows "Registrierung geschlossen"
10. Admin panel → Users: upgrade ABI27 → Essensgruppe Mitglied

---

## After Email Verification is Done: Phase 5 (Polish + Deployment)

- Mobile optimization testing
- Loading states for all async operations
- Admin analytics improvements
- Production build scripts
- nginx configuration + PM2 ecosystem file
- Stundenplan component (needs schedule data from user)
- MC Leaderboard (needs data source)
- BlueMap nginx reverse proxy on OCI (`/bluemap` → localhost:8100)

---

## Known Issues / Notes

1. **OneDrive file locking** — `prisma generate` sometimes fails with EPERM. Fix: kill all node processes first.
2. **tsx watch not reloading** — sometimes needs fresh restart.
3. **Bash `!` escaping** — On Git Bash, `!` in passwords causes issues. Use file-based JSON for curl tests.
4. **prisma db push vs migrate** — We use `db push` (advisory lock issues with migrate on this machine).

---

## Quick Start (Dev Servers)
```bash
# Kill stale processes on 3000/3001 first
netstat -ano | grep -E "LISTENING" | grep -E "300[01]"
taskkill //PID <pid> //F

# Start backend
cd backend && npm run dev

# Start frontend (separate terminal)
cd frontend && npm run dev
```

Ports: Backend 3000, Frontend 3001, PostgreSQL 5432
