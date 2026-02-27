# Known Issues & Environment Quirks

## Development Environment

- **OneDrive EPERM** — `prisma generate` sometimes fails with EPERM because OneDrive locks the DLL. Fix: kill all node processes first, then retry.
- **tsx watch stale** — `tsx watch` sometimes stops picking up changes. Fix: kill all node processes and restart fresh.
- **Bash `!` escaping** — On Git Bash (Windows), `!` in passwords/strings gets history-expanded. Use file-based JSON for curl tests, or test via browser.
- **prisma db push not migrate** — Use `prisma db push` instead of `prisma migrate dev`. Advisory lock issues on this machine prevent migrate from working.
- **Frontend strictPort** — Vite is configured with `strictPort: true` on port 3001. It will ERROR (not silently switch ports) if 3001 is taken. Kill stale processes first.

## Email

- **Silent email failures** — `sendVerificationEmail()`, `sendWelcomeEmail()`, `sendAdminNewUserAlert()` use `.catch(() => {})`. Intentional (won't crash registration if Resend is down), but failures are not logged. Consider adding logging.

## Production (OCI)

- **nginx client_max_body_size** — Set to 10m. Default 1MB caused 413 errors for photo uploads.
- **PM2 dev mode** — Currently running `npm run dev` via PM2 on OCI, not production builds. Should switch to `npm run build` + `npm start` for production.
- **PM2 dual daemon** — OCI has had PM2 running under both `root` and `ubuntu` users. The `ubuntu` PM2 had old processes from `/home/ubuntu/web/EssensgruppeWeb/` that kept respawning. Always check `sudo -u ubuntu pm2 list` if ports are unexpectedly occupied. Current setup: PM2 runs under root from `/home/ubuntu/web/Essensgruppe.de/`.
- **trust proxy** — Backend needs `app.set('trust proxy', 1)` because it's behind nginx. Without it, express-rate-limit throws `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`.
- **Frontend VITE_API_URL** — Must be `/api` (relative), NOT `http://localhost:3000/api`. The browser can't reach localhost on the server; requests go through Vite's proxy.
