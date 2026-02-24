# Setup Guide — Essensgruppe Portal

## Prerequisites

1. **Node.js** v18+ — [nodejs.org](https://nodejs.org/)
2. **PostgreSQL** on localhost:5432 — [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)
3. **Git Bash** (for Windows shell)
4. **VS Code**

---

## Installation

```bash
# Backend dependencies
cd backend && npm install

# Frontend dependencies
cd ../frontend && npm install
```

---

## Environment Variables

### Backend (`backend/.env`)

Copy from example and fill in:
```bash
cd backend && cp .env.example .env
```

Required variables:
```env
# Database — replace YOUR_PASSWORD
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/essensgruppe?schema=public"

# Auth
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# Server
PORT=3000
NODE_ENV="development"
FRONTEND_URL="http://localhost:3001"
BACKEND_URL="http://localhost:3000"

# Email (Resend SMTP — free tier, 3000 emails/month)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
EMAIL_FROM="Essensgruppe Supreme Leader <Emperor@essensgruppe.de>"
ADMIN_EMAIL=chef@essensgruppe.de
```

### Frontend (`frontend/.env`)

```bash
cd frontend && cp .env.example .env
```

```env
VITE_API_URL=http://localhost:3000/api
```

---

## Database Setup

```bash
cd backend

# Generate Prisma Client
npx prisma generate

# Create tables (push schema to DB)
npx prisma db push

# Seed admin account
npm run seed
```

**Admin credentials after seed:** username `admin`, password `Admin1234!`

**Note:** Use `prisma db push` (not `prisma migrate dev`) — advisory lock issues on this machine prevent migrate from working.

Optional: view DB with `npx prisma studio`

---

## Running Dev Servers

**IMPORTANT:** Kill stale processes on ports 3000/3001 first!

```bash
# Find stale processes
netstat -ano | grep -E "LISTENING" | grep -E "300[01]"
# Kill them (replace PID)
taskkill //PID <pid> //F
```

### Terminal 1 — Backend
```bash
cd backend && npm run dev
```
Expected output: `Server running on http://localhost:3000`

### Terminal 2 — Frontend
```bash
cd frontend && npm run dev
```
Expected output: `VITE ready — Local: http://localhost:3001/`

**If frontend fails with "port 3001 already in use":** A stale process is on the port. Kill it with the commands above. Frontend uses `strictPort: true` — it errors instead of silently switching ports.

---

## Testing the Setup

1. Open **http://localhost:3001** — landing page should load
2. Click "Ich bin Teil der Essensgruppe" — go to login
3. Login with admin: `admin` / `Admin1234!`
4. You should see the navbar with balance (1000 coins) and admin dropdown

### Registration Flow (for new users)
1. Click "Register" — fill username + email + password
2. Verification email sent to the email address (via Resend SMTP)
3. User clicks link in email → account activates (status: ACTIVE, role: ABI27)
4. Login with username or email

### Checklist
- [ ] Landing page loads with animations
- [ ] Admin can login with seeded credentials
- [ ] Admin can see Admin Panel in profile dropdown
- [ ] Protected routes redirect to login when not authenticated
- [ ] Can navigate all pages (Forum, Events, Links, MC, Games, About)
- [ ] Profile page shows stats and avatar upload
- [ ] New user registration sends verification email
- [ ] Verification link activates the account

---

## Ports Reference

| Service | Port | Notes |
|---------|------|-------|
| Backend API | 3000 | Express + Socket.io |
| Frontend Dev | 3001 | Vite (strictPort — errors if taken) |
| PostgreSQL | 5432 | Default PG port |
| BlueMap | 8100 | MC map (already running on OCI) |

---

## Useful Commands

```bash
# Backend
npm run dev              # Start dev server (tsx watch)
npm run build            # TypeScript compile
npm run start            # Run compiled JS
npm run seed             # Seed admin account
npx prisma studio        # DB GUI
npx prisma db push       # Sync schema to DB
npx prisma generate      # Regenerate Prisma client

# Frontend
npm run dev              # Start Vite dev server
npm run build            # Production build
npm run preview          # Preview production build

# Email testing
cd backend && npx tsx src/scripts/send-test-emails.ts your@email.com
cd backend && npx tsx src/scripts/preview-email.ts  # generates HTML file
```

---

## Troubleshooting

### Database Connection Error
`Can't reach database server at localhost:5432`
- Make sure PostgreSQL is running
- Check DATABASE_URL password in `backend/.env`
- Test: `psql -U postgres` in terminal

### Port Already in Use
`Port 3000/3001 is already in use`
```bash
netstat -ano | grep -E "LISTENING" | grep -E "300[01]"
taskkill //PID <pid> //F
```

### Prisma Client Not Found
`@prisma/client did not initialize yet`
```bash
cd backend && npx prisma generate
```

### EPERM on Prisma Generate (OneDrive)
OneDrive locks the DLL file. Kill all node processes first, then retry:
```bash
taskkill //IM node.exe //F
cd backend && npx prisma generate
```

### CORS Errors
`Access to fetch blocked by CORS policy`
- Both servers must be running
- Check `FRONTEND_URL` in backend/.env matches frontend port
- Restart both servers
