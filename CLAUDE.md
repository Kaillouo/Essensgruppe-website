# Essensgruppe.de — School Community Portal

Multi-purpose website for a school class (Abitur 2027). Combines forum, event planning, resource links, Minecraft server info, and gambling games.

**Spelling:** The correct name is **Essensgruppe** (with **s** after the **n**). Domain: `essensgruppe.de`. Check this everywhere.

**Language:** The entire UI and all user-facing text must be in **German**. Exceptions: technical terms that are universally understood in English (e.g. "Login", "Logout", "Forum", "Games", "Poker", "Blackjack", "Slots", "Admin", "Links", "Profile", "E-Mail"). When in doubt, use German. Backend error messages shown to users should also be German. Code comments and variable names stay in English.

**Stack:** React/TypeScript (Vite) + Express/TypeScript + Prisma + PostgreSQL + Socket.io

---

## Dev Server Startup

**Ports:** Backend `3000`, Frontend `3001` (strictPort — errors if taken), PostgreSQL `5432`

**Always kill stale processes first:**
```bash
netstat -ano | grep -E "LISTENING" | grep -E "300[01]"
taskkill //PID <pid> //F
```

**Start:**
```bash
cd backend && npm run dev     # Terminal 1
cd frontend && npm run dev    # Terminal 2
```

---

## Git Workflow

**Repo:** `github.com/Kaillouo/Essensgruppe-website` (owner: kaillouo, HTTPS + PAT)

**Flow:** feature branch → main → deploy to OCI
```
1. git checkout -b feature-name
2. Work + commit
3. git checkout main && git merge feature-name
4. git push origin main
5. On OCI: git pull origin main && npm run build && pm2 restart all
```

**OCI server path:** `/home/ubuntu/web/Essensgruppe.de`

---

## Role System

| Role | Description | Default? |
|------|-------------|----------|
| `ABI27` | Verified Abi 2027 student | Yes (after email verification) |
| `ESSENSGRUPPE_MITGLIED` | Inner circle (admin upgrades) | No |
| `ADMIN` | Full access | Seed only (admin/Admin1234!) |

**Registration:** username + email + password → verification email (Resend SMTP) → click link → account active with ABI27 role

---

## Active Agent Branches

You are a specialized agent assigned to ONE specific branch. Check which branch you are on with `git branch --show-current` and follow ONLY your assignment below. Do NOT touch files outside your scope.

**Merge order:** bugs → security → visibility (merge in this order to avoid conflicts)

### `fix/known-bugs` — Bug Fix Agent
- **Job:** Fix known bugs from the user's bug list. One bug at a time, test each fix.
- **Scope:** Any file, but ONLY to fix the specific bug. No refactoring, no new features.
- **Avoid:** Don't restructure code, don't change Prisma schema, don't add features.

### `security/audit` — Security Audit Agent
- **Job:** Audit and harden the application security.
- **Tasks:**
  1. Ensure all role checks (ADMIN, ESSENSGRUPPE_MITGLIED, ABI27) are enforced server-side in Express middleware, not just hidden in frontend
  2. Check for missing auth middleware on API routes
  3. Check for XSS, SQL injection, OWASP vulnerabilities
  4. Add rate limiting where missing (login, registration, password reset)
  5. Ensure JWT secrets and API keys are not exposed to frontend
  6. Disable source maps in production Vite build
- **Scope:** Middleware, route guards, server.ts, vite config, backend security.
- **Avoid:** Don't change Prisma schema, don't modify frontend page layouts, don't add right-click/console blocking (that's security theater).

### `feature/post-visibility` — Visibility Feature Agent
- **Job:** Add visibility toggle so Essensgruppe members can make posts/events visible to all OR Essensgruppe-only.
- **Tasks:**
  1. Add `visibility` field to `Post` and `Event` Prisma models (values: `ALL` default, `ESSENSGRUPPE_ONLY`)
  2. Users with `ESSENSGRUPPE_MITGLIED` or `ADMIN` role see a toggle when creating posts/events. `ABI27`-only users always create as `ALL`.
  3. Backend: filter queries so `ESSENSGRUPPE_ONLY` items only return for users with `ESSENSGRUPPE_MITGLIED` or `ADMIN` role
  4. Use `prisma db push` after schema changes (not migrate dev)
- **Scope:** Prisma schema, post/event routes, frontend create/list pages for posts and events.
- **Avoid:** Don't touch auth middleware, don't modify gambling/poker code.

**If you are not on any of these branches**, you are the overseer — do not implement, just plan.

---

## Context Files

Read these **only when relevant to your task**. Start every session by reading CLAUDE.md + STATUS.md + NEXT-STEPS.md.

| File | When to Read |
|------|-------------|
| `context/STATUS.md` | **Always** — current state of every feature |
| `context/NEXT-STEPS.md` | **Always** — what to work on next |
| `context/ARCHITECTURE.md` | When you need route/model/file info |
| `context/UNFINISHED.md` | **Always** — check for in-progress work from other sessions |
| `context/SUMUP-LOG.md` | When you need history of recent changes |
| `context/KNOWN-ISSUES.md` | When hitting env/tooling problems |
| `context/SETUP.md` | For fresh setup or env troubleshooting |
| `context/oci-deploy.md` | For deployment tasks |
| `context/features/email-system.md` | When working on email |
| `context/features/gambling.md` | When working on games/balance |
| `context/features/poker.md` | When working on poker |
| `context/features/forum-bubbles.md` | When building graph view |
| `context/features/frontend-theme.md` | When working on design/theme |
| `context/abandoned/` | Check before trying a new approach — might already be tried and failed |

---

## Environment Quirks

- **OneDrive EPERM** — `prisma generate` fails if node is running. Kill all node processes first.
- **Use `prisma db push`** not `prisma migrate dev` — advisory lock issues on this machine.
- **Bash `!` escaping** — Git Bash history-expands `!`. Use file-based JSON for curl tests.
- **Frontend strictPort** — Vite on 3001 will error (not switch) if port is taken. Kill stale processes.

---

## Context Maintenance Rules

**After completing work:**
- Append a brief entry (2-4 bullet points) to `context/SUMUP-LOG.md`

**After changing routes, models, or file structure:**
- Update `context/ARCHITECTURE.md` to match

**After finishing or starting a feature:**
- Update `context/STATUS.md`

**When `SUMUP-LOG.md` exceeds ~80 lines:**
- Compact old entries: summarize batches of old entries into 1-2 lines each, keep the last 10 entries detailed

**When starting a session:**
- Read: CLAUDE.md + STATUS.md + NEXT-STEPS.md + UNFINISHED.md
- Only read other context files if the task requires them

**When ending mid-task:**
- Log state in `context/UNFINISHED.md` (what's done, what's left, files touched)

**When abandoning an approach:**
- Add a short note to `context/abandoned/` explaining what was tried and why it failed
