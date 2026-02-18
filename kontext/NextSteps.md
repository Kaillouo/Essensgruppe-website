# Next Steps - For Future Claude Code Sessions

**Last Updated:** 2026-02-18
**Current Status:** Phase 1 + 1.5 + 2 + 3 COMPLETE
**Next Phase:** Phase 4 - Gambling Framework

---

## What to Do Next (Priority Order)

### 1. Start Phase 4 — Gambling Framework

**Balance System:**
- Balance already stored on User model (default 1000 coins)
- Already displayed in navbar
- Need: Transaction history page/tab on profile

**Game Infrastructure:**
- Games list page (`/games`) with cards for each game
- Game template component (reusable layout with bet input, result display, animations)
- WebSocket server setup (Socket.io) for real-time game results
- Bet validation middleware (server-side): check balance ≥ bet, deduct, resolve, payout
- 5% house edge on all games
- `GameHistory` and `Transaction` models already in schema

**Games to implement (specs TBD by user):**
- `/games/coinflip` — classic coin flip
- `/games/dice` — dice roll
- (others as user defines)

**Backend needed:**
- `game.routes.ts` with bet/resolve endpoints
- Socket.io server integration
- House edge calculation utility

### 2. Content Updates Needed (User to provide)

**Links Page (`/links`):**
- Real school website URL
- Real Moodle URL
- Real Vertretungsplan URL
- Real teacher list (names, subjects, emails)
- Stundenplan links per class/person

**Minecraft Page (`/mc`):**
- Real server IP/domain (currently: `play.essensgruppe.de` — update `SERVER_IP` in MinecraftPage.tsx)
- Real BlueMap URL for production (currently localhost:8100 — update `BLUEMAP_URL` in MinecraftPage.tsx)

**Events Page (`/events`):**
- Real social links: GoFundMe, TikTok, Instagram URLs (currently placeholders in EventsPage.tsx)

---

## Server Management

### Start Servers
```bash
# Option 1: Double-click start.bat in project root
# Option 2: Manual
cd backend && npm run dev    # Terminal 1
cd frontend && npm run dev   # Terminal 2
```

### Server Ports
| Service | Port |
|---------|------|
| Frontend (Vite) | localhost:3001 |
| Backend (Express) | localhost:3000 |
| PostgreSQL | localhost:5432 |
| Prisma Studio | localhost:5555 |

### Admin Login
```
Username: admin
Password: Admin1234!
```

---

## Known Issues

1. **OneDrive file locking** — `prisma generate` sometimes fails with EPERM. Workaround: kill all node processes first, or use `--skip-generate` flag.
2. **tsx watch not reloading** — Sometimes `tsx watch` doesn't pick up changes. Fix: `taskkill /F /IM node.exe` then restart.
3. **Bash `!` escaping** — On Windows Git Bash, `!` in passwords gets escaped in curl. Test login via the browser instead.
4. **ThreadPage.tsx unused vars** — Two pre-existing TS6133 warnings (unused `newComment` and `commentId`). Not breaking, just cosmetic.

---

## Tips for Next Session

1. **Read this file first** — then check PROGRESS.md for architecture details
2. **Admin credentials:** `admin` / `Admin1234!`
3. **Don't modify database schema** unless necessary — use `prisma db push --skip-generate` to avoid OneDrive DLL lock issues
4. **Use start.bat** to manage servers easily
5. **File uploads** go in `backend/uploads/` (avatars/, posts/, events/) — served at `/uploads/...`

---

**Next: Phase 4 — Gambling Framework.**
