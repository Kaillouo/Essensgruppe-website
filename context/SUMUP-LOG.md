# Session Log

<!-- Append a brief entry after each work session (2-4 bullet points). -->
<!-- When this file exceeds ~80 lines: compact old entries into 1-2 lines each, keep last 10 entries detailed. -->

---

## Compacted History (pre-2026-02-28)

- **Pre-2026-02-24:** Foundation (auth, landing, admin), forum, events, links, MC page, games hub (poker, prediction market, slots, blackjack), email verification, role refactor, content fill, multiple bugfix sessions
- **2026-02-24:** Context reorganization — restructured docs into `context/` folder
- **2026-02-25:** Security audit (rate limits, JWT guard, source maps, `requireMember`), visibility feature (ESSENSGRUPPE_ONLY toggle on posts/events/predictions), bug fixes (avatar EXIF, poker solo, iOS Safari, Zod errors, prediction betting)
- **2026-02-25 Round 2:** Visibility toggle UI buttons, MC access control, poker solo advance, dark theme consistency
- **2026-02-26:** Daily login reward (1000 coins/day, 24h cooldown, auto-claim); daily coins claim bug fix; German translation (all pages)
- **2026-02-27:** Fresh OCI deploy — new folder, DB wipe+reseed, trust proxy fix, VITE_API_URL fix, dark theme RegisterPage
- **2026-02-28 early:** Forum photo upload + EventsPage auth guard; Mines game (5x5, in-memory, 5% house edge, responsive layout)

---

## 2026-02-28 — Chat System
- Built 1-on-1 chat: `DirectMessage` + `Contact` models, hourly cleanup (24h TTL)
- Backend: `chat.routes.ts` (6 REST), socket events for real-time DMs, AI route (Claude Haiku)
- Frontend: ChatBubble, ChatPanel, ChatContactList, ChatConversation, ChatAIConversation
- AI character TBD in `context/features/ai-chatbot-character.md`; needs `ANTHROPIC_API_KEY`

## 2026-02-28 — Bug Fixes + Admin
- Daily coin countdown: absolute deadline (background-tab safe)
- Prediction debt system — games check raw balance, predictions check available; losers can go negative
- Event status: added missing `authenticateToken`; dark StatusModal
- Admin panel: added E-Mail column to user table

## 2026-02-28 — Guest Mode + Games Landing Redesign
- Backend: `guestState.ts` (in-memory, 30min TTL), `guestAuth.middleware.ts`, `guestGames.routes.ts`
- Frontend: GuestContext, GamesLandingPage (3-card chooser), GamesCollectionPage, guest hub + game pages
- App.tsx: `/games` routes auth users → GamesLandingPage, guests → /games/guest

## 2026-03-01 — Guest Poker
- Backend: `guestPoker.socket.ts` (standalone 6-seat, guestState balance, AFK kick 60s); `/guest-poker` namespace
- Frontend: `GuestPokerPage.tsx` full Hold'em UI

## 2026-03-01 — PWA
- `vite-plugin-pwa` + Workbox: pre-cache static, per-route runtime caching
- Icons (192+512 placeholders), PWA meta tags, `useOnlineStatus` hook
- `OfflineBanner` (yellow strip) + `OfflineOverlay` (blocks game pages offline)

## 2026-03-01 — Mobile Bottom Navigation
- Fixed bottom nav on mobile (<768px): Forum, Links, Abi 27, Games, MC
- Footer hidden on mobile; prediction FAB cleared from nav bar

## 2026-03-02 — Notification System + User Blocking
- Prisma: `Notification`, `UserBlock`, `NotificationPreference` models + enum
- Backend: notification service + 6 routes, block 3 routes; triggers in post/event/prediction
- Schedulers: 12h daily coins reminder, 10min prediction close reminder; block check in chat:send
- Frontend: browser Notification API (native OS); prefs + blocked users in ProfilePage
- Restricted email editing to admin-only

## 2026-03-06 — Landing Page V2 (Room Scenes + Tunnel Grid)
- Replaced all 5 room placeholders with real photo-based scenes using images from `/public/images/`
- ForumRoom: parliament temple bg, philosopher statues (floating), CSS marble columns, dust particles
- LinksRoom: simplified to portal image + "Alle wichtigen Online-Links für die Schule"
- EventsRoom: dark school bg, mastermind puppet figure, SVG blueprint with planning grid
- CasinoRoom: casino interior bg, BIG poker chips on sides, neon CASINO sign, card suits
- MinecraftRoom: MC screenshot bg, parallax drifting clouds, pixel players, terrain silhouette
- Built canvas-based TunnelGrid: 45 concentric squares fly outward from bright center on scroll
- RoomContainer: removed per-room tunnel, simplified corridor strip (12vh), added z-index for room sections
- Shortened hero spacer (40vh→25vh), room height (120vh→110vh), corridor strip (25vh→12vh)
