# PWA (Progressive Web App)

**Status:** DONE (2026-03-01)

## Overview
Installable as standalone app (Android, iOS, Desktop). Service worker pre-caches static assets; per-route caching for offline reading. Game pages blocked offline.

## Key Files
| File | Role |
|------|------|
| `frontend/vite.config.ts` | VitePWA plugin (manifest + Workbox rules) |
| `frontend/public/icons/icon-192.png` + `icon-512.png` | PWA icons (solid #0284c7 placeholders — replace with real logo) |
| `frontend/src/hooks/useOnlineStatus.ts` | Online/offline detection hook |
| `frontend/src/components/OfflineBanner.tsx` | Yellow strip below Navbar when offline |
| `frontend/src/components/OfflineOverlay.tsx` | Full-screen block for game pages offline |

## Manifest
`name: 'Essensgruppe – Abitur 2027'`, `short_name: 'Essensgruppe'`, `display: 'standalone'`, `theme_color: '#0d1420'`

## Caching Strategy
| Pattern | Strategy | TTL |
|---|---|---|
| Fonts (googleapis/gstatic) | StaleWhileRevalidate / CacheFirst | 30d / 1yr |
| `/uploads/*` | CacheFirst | 7d, max 100 |
| `GET /api/posts*` | NetworkFirst (5s timeout) | 24h |
| `GET /api/events*` | NetworkFirst (5s) | 4h |
| `GET /api/predictions*` | NetworkFirst (5s) | 30min |
| `GET /api/users/me` | StaleWhileRevalidate | 2h |
| `GET /api/announcements*` | CacheFirst | 6h |
| `/socket.io/*`, other `/api/*` | NetworkOnly | — |

## Notes
- `registerType: 'autoUpdate'` — new SW activates on next page load
- SW generated at build time (`dist/sw.js`); not active in dev mode
- Test offline: `npm run build && npm run preview` → DevTools Network → Offline
