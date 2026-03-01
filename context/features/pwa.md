# PWA (Progressive Web App) — Essensgruppe.de

**Status:** DONE (2026-03-01)
**Branch implemented on:** `feature/german-translation`

---

## Overview

The site is installable as a standalone app (Android, iOS, Desktop Chrome/Edge). Service worker pre-caches all static assets and applies per-route caching strategies so previously-viewed content (forum, events, profile) is readable offline. All game pages are blocked with a full-screen overlay when offline since they require live server state.

---

## Key Files

| File | Role |
|------|------|
| `frontend/vite.config.ts` | VitePWA plugin config (manifest + Workbox rules) |
| `frontend/index.html` | PWA meta tags + manifest link |
| `frontend/public/icons/icon-192.png` | PWA icon 192×192 (solid #0284c7) |
| `frontend/public/icons/icon-512.png` | PWA icon 512×512 (solid #0284c7) |
| `frontend/src/hooks/useOnlineStatus.ts` | `navigator.onLine` + event listener hook |
| `frontend/src/components/OfflineBanner.tsx` | Yellow strip below Navbar when offline |
| `frontend/src/components/OfflineOverlay.tsx` | Full-screen block for game pages when offline |
| `frontend/src/App.tsx` | Renders OfflineBanner + wraps game routes with OfflineOverlay |

---

## Manifest Config

```ts
name: 'Essensgruppe – Abitur 2027'
short_name: 'Essensgruppe'
theme_color: '#0d1420'
background_color: '#0a0e1a'
display: 'standalone'
start_url: '/'
```

Icons are at `frontend/public/icons/`. To replace with a real logo, swap out the files at the same paths (192×192 and 512×512 PNG).

---

## Workbox Caching Strategy

| URL Pattern | Strategy | Cache TTL | Notes |
|---|---|---|---|
| `fonts.googleapis.com/*` | StaleWhileRevalidate | 30 days | Font CSS |
| `fonts.gstatic.com/*` | CacheFirst | 1 year | Font binaries |
| `/uploads/*` | CacheFirst | 7 days, max 100 | Avatars/photos |
| `GET /api/posts*` | NetworkFirst (5s) | 24h, max 30 | Forum offline support |
| `GET /api/events*` | NetworkFirst (5s) | 4h, max 5 | Events |
| `GET /api/predictions*` | NetworkFirst (5s) | 30min, max 5 | Live odds, short TTL |
| `GET /api/users/me` | StaleWhileRevalidate | 2h, max 3 | Profile |
| `GET /api/announcements*` | CacheFirst | 6h, max 5 | MC announcements |
| `/socket.io/*` | NetworkOnly | — | WebSocket, must not cache |
| All other `/api/*` | NetworkOnly | — | Mutations, games, auth, admin, chat |

> Rules evaluated top-to-bottom. NetworkOnly `/api/*` catch-all is intentionally last.
> Only GET methods are cached (mutations are inherently NetworkOnly).

---

## Offline UI Behavior

- **`OfflineBanner`** — rendered after `<Navbar />` when `showLayout` is true; slides in with framer-motion; auto-hides when connection restores. Text: *"Kein Internet — du siehst zwischengespeicherte Inhalte. Einige Funktionen sind nicht verfügbar."*

- **`OfflineOverlay`** — wraps all game pages (auth + guest: Poker, Slots, Blackjack, Mines). Shows a dark glass-morphism card with reload button. Text: *"Kein Internet"* / *"Dieses Spiel erfordert eine aktive Internetverbindung."*

- Game pages are in `FULLSCREEN_PATHS` so `OfflineBanner` never appears there — `OfflineOverlay` is the sole offline signal on those pages.

---

## Icons

Created with `sharp` (backend dependency) as solid `#0284c7` (Tailwind `sky-600`) placeholders.
To replace with the real logo:
1. Prepare a square image at 512×512 (PNG, transparent background is fine)
2. Run: `node -e "require('sharp')('logo.png').resize(192).toFile('icon-192.png')"`
3. Copy both files to `frontend/public/icons/`

---

## Service Worker Notes

- `registerType: 'autoUpdate'` — new SW activates on next page load (no "Update available?" prompt)
- SW is generated into `dist/sw.js` at build time via Workbox's `generateSW` mode
- In dev mode the SW is not active (Vite dev server doesn't inject it by default)
- To test offline: `npm run build && npm run preview`, then Chrome DevTools → Network → Offline

---

## Future Work / Considerations

- **Replace placeholder icons** with the actual Essensgruppe logo when available
- **Push notifications** — could use the Web Push API + a backend subscription endpoint to notify users of new forum posts, event proposals, or chat messages. Would require storing push subscriptions in the DB.
- **Background sync** — could queue likes/votes made offline and replay them on reconnect (Workbox `BackgroundSyncPlugin`). Low priority.
- **Periodic sync** — could wake the SW periodically to refresh the posts/events cache. Requires user permission grant.
