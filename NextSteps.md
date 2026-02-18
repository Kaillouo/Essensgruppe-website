# Next Steps - For Future Claude Code Sessions

**Last Updated:** 2026-02-16
**Current Status:** Phase 1 + 1.5 + 2 COMPLETE
**Next Phase:** Phase 3 - Events + Links + MC

---

## What to Do Next (Priority Order)

### 1. Start Phase 3 — Events + Links + MC

Three pages to build:

**Events Page (`/events`) — ABI 27:**
- Three sections: Upcoming (proposed), In Planning, Completed
- Event submission form: title, description, date, location, budget
- Voting system (thumbs up/down on proposals)
- Admin can move events between statuses
- Photo galleries for completed events
- Social links section: GoFundMe, TikTok, Instagram

**Links Page (`/links`):**
- Teachers list with name, subjects, email
- Stundenplan: dropdown to select person, shows their schedule
- Important links cards (school website, Moodle, etc.)
- Card-based layout, searchable

**Minecraft Page (`/mc`):**
- Server IP with copy button
- BlueMap iframe embed
- Admin announcements section
- Server rules, leaderboard, how to join
- Server status indicator

**Database:** Event schema already exists in Prisma (Event model with status enum). Links/MC pages are mostly static content — may need new models for teachers and announcements.

### 2. Design/Polish (Can Do Anytime)
- Landing page text/content changes
- Color scheme customization
- YouTube video as background
- Mobile optimization

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

---

## Tips for Next Session

1. **Read this file first** — then check PROGRESS.md for architecture details
2. **Admin credentials:** `admin` / `Admin1234!`
3. **Don't modify database schema** unless necessary — use `prisma db push --skip-generate` to avoid OneDrive DLL lock issues
4. **Use start.bat** to manage servers easily
5. **File uploads** go in `backend/uploads/` (avatars/, posts/, events/) — served at `/uploads/...`

---

**Next: Phase 3 — Events + Links + MC pages.**
