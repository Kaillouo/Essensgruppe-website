# OCI Deployment & Server Log

## Repository
- **GitHub:** github.com/Kaillouo/Essensgruppe-website
- **Auth:** HTTPS with Personal Access Token (PAT), username: kaillouo
- **Main branch:** `main` (production)
- **Workflow:** feature branch → main → git pull on OCI → PM2 restart

## OCI Server
- **Path:** `/home/ubuntu/web/Essensgruppe.de`
- **SSH:** `ssh ubuntu@<OCI-IP>`
- **Domain:** essensgruppe.de (Squarespace DNS → OCI)
- **SSL:** Let's Encrypt at `/etc/letsencrypt/live/www.essensgruppe.de/`

## Deploy Steps
```bash
ssh ubuntu@<OCI-IP>
cd /home/ubuntu/web/Essensgruppe.de
git pull origin main
cd backend && npm install && npx prisma db push && npx prisma generate
cd ../frontend && npm install
pm2 restart all
```

## PM2 Commands
```bash
pm2 list              # check status
pm2 logs backend      # backend logs
pm2 logs frontend     # frontend logs
pm2 restart all       # restart both
pm2 startup           # auto-start on reboot
```

## nginx Config
- Location: `/etc/nginx/sites-available/web`
- HTTPS reverse proxy → Vite dev server (port 3001)
- HTTP → HTTPS redirect
- WebSocket support for Vite HMR
- `client_max_body_size 10m` (for photo uploads)
- BlueMap proxy endpoint preserved

## Server Change Log

### 2026-02-18 — Initial Setup
- PostgreSQL 16 installed, `essensgruppe` database created
- npm install + prisma db push + seed (admin/Admin1234!)
- Apache2 replaced with nginx (HTTPS reverse proxy)
- Firewall: opened ports 3000/tcp, 3001/tcp
- Vite config: `host: true`, allowedHosts for essensgruppe.de
- PM2 installed, managing backend + frontend

### 2026-02-18 — Photo Upload Fix
- nginx `client_max_body_size 10m` added (was default 1MB → 413 errors)

### 2026-02-27 — Fresh Deploy from New Folder
- Uploaded new project to `/home/ubuntu/web/Essensgruppe.de/` (old: `/home/ubuntu/web/EssensgruppeWeb/`)
- Database wiped (`prisma db push --force-reset`) and re-seeded (admin/chef@essensgruppe.de/Admin1234!)
- Removed Windows node_modules, reinstalled for Linux
- Added `app.set('trust proxy', 1)` to server.ts (fixes express-rate-limit ERR_ERL_UNEXPECTED_X_FORWARDED_FOR behind nginx)
- Fixed frontend `.env`: `VITE_API_URL=/api` (was `http://localhost:3000/api` — browser can't reach localhost)
- Fixed backend `.env`: `FRONTEND_URL` and `BACKEND_URL` → `https://essensgruppe.de`
- Fixed RegisterPage: white-on-white text → dark theme to match rest of site
- Killed old PM2 processes under `ubuntu` user that kept respawning (`sudo -u ubuntu pm2 kill`)
- PM2 now runs under root from new folder, `pm2 save` applied
- `/home/ubuntu/web/` ownership set to `ubuntu:ubuntu` for SFTP access
