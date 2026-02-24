# Essensgruppe.de — School Community Portal

Multi-purpose website for a school class (Abitur 2027). Combines forum, event planning, resource links, Minecraft server info, and gambling games.

**Spelling:** The correct name is **Essensgruppe** (with **s** after the **n**). Domain: `essensgruppe.de`. Check this everywhere.

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

**OCI server path:** `/home/ubuntu/web/EssensgruppeWeb`

---

## Role System

| Role | Description | Default? |
|------|-------------|----------|
| `ABI27` | Verified Abi 2027 student | Yes (after email verification) |
| `ESSENSGRUPPE_MITGLIED` | Inner circle (admin upgrades) | No |
| `ADMIN` | Full access | Seed only (admin/Admin1234!) |

**Registration:** username + email + password → verification email (Resend SMTP) → click link → account active with ABI27 role

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
