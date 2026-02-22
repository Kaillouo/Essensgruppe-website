# Next Steps — START HERE

**Last Updated:** 2026-02-22
**Current Phase:** Phase 4.3 DONE → Now: Landing Page + Guest Access fixes

---

## 🔜 Immediate Tasks (Ready to Implement)

### 1. Landing Page Cleanup
- [ ] **Remove subtitle text** — delete the line "Connect with classmates, plan events, share resources, and have fun together." from the hero section
- [ ] **Change CTA text** — "Ready to join?" → "Are you really ready to join."
- [ ] **Show all sections** — below the video hero, list Forum, ABI 27, Games, About Us, and MC as a plain list (no card boxes around them)

### 2. Guest Access (Non-Members Can Browse)
Currently all non-login routes redirect to login. Change so that:
- [ ] **Links** — publicly accessible (no login required)
- [ ] **Games** — publicly accessible (guests can view games lobby, but can't play without coins/account)
- [ ] **About Us** — publicly accessible
- [ ] **ABI 27 (Events)** — publicly accessible in read-only mode (guests can view proposed/in-planning/completed events, but cannot propose, vote, or upload photos)
- **Forum** — remains login-only (no change)
- **MC** — remains login-only (no change) — or discuss this later

These pages should be visible from the landing page section list so guests understand what's inside.

---

## 🗒️ More Complicated Stuff (Plan Together Later)
- TBD — user wants to discuss these in a planning session

---

## 📋 Content Still Needed From You

1. **Stundenplan data** — provide markdown files with time blocks, subjects, teachers, rooms → Claude builds the component
2. **MC Leaderboard** — provide data source (API, file, manual list)
3. **BlueMap nginx proxy** — on OCI: add location block `/bluemap → localhost:8100`, log in `ocichanges.md`
4. **Abi Zeitung test** — restart backend, submit test entry from EventsPage, verify Admin → Abi Zeitung tab shows it

---

## ✅ Recently Completed (Phase 4.3)

See [PROGRESS.md](PROGRESS.md) for full details.

- About page hero photo (`the-people.jpg`)
- Footer: email icon, Datenschutz link, real social URLs
- Privacy policy page (`/privacy`)
- Links page: 83 THG teachers, 7 icon tiles, coming-soon cards
- MC: real server IP, BlueMap URL, real status endpoint (polls port 25565), Discord button, updated rules
- Events: real GoFundMe + Instagram, camping.jpg hero, Abi Zeitung anonymous submissions
- Landing page: YouTube video background
- Admin panel: Abi Zeitung tab

---

## 🐛 Known Issues

1. **OneDrive file locking** — `prisma generate` sometimes fails with EPERM → kill all node processes first
2. **tsx watch not reloading** — sometimes doesn't pick up changes → kill node + restart
3. **Bash `!` escaping** — on Git Bash, `!` in passwords gets escaped → use browser for testing or file-based JSON for curl

---

## 🚀 Starting Dev Servers

```bash
# Kill stale processes on ports 3000/3001 first:
netstat -ano | grep -E "LISTENING" | grep -E "300[01]"
taskkill //PID <pid> //F

# Backend:
cd backend && npm run dev

# Frontend (separate terminal):
cd frontend && npm run dev
```
