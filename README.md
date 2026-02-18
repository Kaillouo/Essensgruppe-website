# Essensgruppe - School Community Portal

Multi-purpose website for Abitur 2027 class combining forum, event planning, resources, Minecraft server info, and gambling games.

## Tech Stack

**Frontend:**
- React + TypeScript
- Vite
- TailwindCSS
- Framer Motion
- React Router v6

**Backend:**
- Node.js + Express + TypeScript
- PostgreSQL
- Prisma ORM
- JWT Authentication
- bcrypt

## Local Development Setup

### Prerequisites
- Node.js (v18+)
- PostgreSQL (running on localhost:5432)
- Git Bash (Windows)

### Installation

1. **Install dependencies:**
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

2. **Set up environment variables:**
```bash
# Backend: Create .env file
cp backend/.env.example backend/.env
# Edit backend/.env with your DATABASE_URL and JWT_SECRET
```

3. **Set up database:**
```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

4. **Run development servers:**
```bash
# Terminal 1 - Backend (localhost:3000)
cd backend
npm run dev

# Terminal 2 - Frontend (localhost:3001)
cd frontend
npm run dev
```

## Project Structure

```
Essensgruppe.de/
├── frontend/          # React app (Vite)
├── backend/           # Express API + Prisma
├── claude.md          # Project specification
└── README.md
```

## Deployment

Production deployment to OCI Ubuntu instance via:
```bash
git push origin main
# SSH to OCI and pull changes
```

## Development Phases

- [x] Phase 1: Foundation (Auth, routing, landing page)
- [ ] Phase 2: Forum System
- [ ] Phase 3: Events + Links
- [ ] Phase 4: Gambling Framework
- [ ] Phase 5: Polish + Deployment
