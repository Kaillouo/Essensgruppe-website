# OCI Server Setup Changes
**Date:** 2026-02-18

## What Was Done

### 1. PostgreSQL Installed
- Installed `postgresql-16` via apt
- Set `postgres` user password (same as `.env.example`)
- Created `essensgruppe` database

### 2. Project Dependencies
- Copied `.env.example` → `.env` for both backend and frontend
- Ran `npm install` in both `backend/` and `frontend/`
- Ran `prisma db push` to create all DB tables
- Ran `npm run seed` → admin account created (`admin` / `Admin1234!`)

### 3. Nginx Replaced Apache2
- **Apache2** was the previous web server (was serving WordPress + SSL on 443)
- Apache2 stopped and disabled permanently
- **Nginx** configured with HTTPS reverse proxy pointing to Vite dev server on port 3001
- HTTP → HTTPS redirect added
- WebSocket support added for Vite HMR
- BlueMap and restart proxy endpoints preserved
- SSL cert: `/etc/letsencrypt/live/www.essensgruppe.de/`

### 4. Firewall (firewalld)
- Opened ports `3000/tcp` and `3001/tcp` in firewalld

### 5. Vite Config Updates (`frontend/vite.config.ts`)
- Added `host: true` so Vite binds to all interfaces (not just localhost)
- Added `allowedHosts: ['essensgruppe.de', 'www.essensgruppe.de']` to fix blocked host error

### 6. PM2 Process Manager
- Installed PM2 globally (`npm install -g pm2`)
- Both servers now managed by PM2 (survives shell exit unlike background `&` jobs)
- `backend` → `npm run dev` in `/backend`
- `frontend` → `npm run dev` in `/frontend`

## Current State
- **https://essensgruppe.de** → nginx → Vite dev server (port 3001)
- API calls proxied internally: Vite → Express (port 3000)
- PostgreSQL running on port 5432

## 2026-02-18 — Photo Upload Fix

### nginx `client_max_body_size`
- Added `client_max_body_size 10m;` to the HTTPS server block
- Default was 1MB which caused nginx to return a 413 HTML page for any image over 1MB
- Config: `/etc/nginx/sites-available/web`
- Reloaded nginx after change

## Useful Commands
```bash
pm2 list              # check server status
pm2 logs backend      # backend logs
pm2 logs frontend     # frontend logs
pm2 restart all       # restart both servers
pm2 startup           # enable auto-start on reboot
```
