# Project Status

**Last Updated:** 2026-03-01 (Mobile bottom nav + prediction FAB fix)

## Features

| Feature | Status | Notes |
|---------|--------|-------|
| Landing Page | DONE | YouTube background, scroll effects |
| Auth (register/login/JWT) | DONE | Email verification via Resend |
| Password Reset | DONE | Self-service, 1-hour token |
| Email System (5 templates) | DONE | Resend SMTP, Emperor@essensgruppe.de |
| Forum (posts/comments/votes) | DONE | Reddit-style, nested comments, search, sort |
| Events + Photo Galleries | DONE | Propose/vote/status, photo carousel |
| Abi Zeitung (anonymous) | DONE | Submit anonymously, admin views |
| Links Page | DONE | School links, 83 teachers, Stundenplan placeholder |
| MC Page | DONE | Server status, BlueMap iframe, announcements |
| Poker (Texas Hold'em) | DONE | 6-seat, solo mode, queue, watchers, emotes |
| Prediction Market | DONE | Create/bet/resolve, payout logic; debt system 2026-02-28 (reserved coins no longer block games; losers can go negative) |
| Slots | DONE | |
| Blackjack | DONE | |
| Mines | DONE | Stake-style 5×5 grid; custom mine picker; responsive (grid top on mobile, controls left on desktop); 5% house edge combinatorics multiplier |
| Profile + Avatar Upload | DONE | Sharp resize to 256x256 |
| Admin Panel | DONE | Users (incl. E-Mail-Spalte), settings, analytics, balance, Abi Zeitung |
| About Us + Privacy | DONE | |
| Role System | DONE | ABI27, ESSENSGRUPPE_MITGLIED, ADMIN |
| Security Audit | DONE | Rate limits, JWT guard, source maps — see context/features/securities.md |
| Post/Event/Prediction Visibility | DONE | ESSENSGRUPPE_ONLY toggle for members; ABI27 filtered server-side |
| Daily Login Reward | DONE | 1000 coins/day with 24h cooldown, auto-claim on landing page; countdown uses absolute timestamp (background-tab safe) 2026-02-28 |
| Chat System | DONE | Floating Messenger card, 1-on-1 DMs (24h), contacts, AI bot (Haiku); character TBD in context/features/ai-chatbot-character.md |
| Forum Graph/Bubble View | PLANNED | See context/features/forum-bubbles.md |
| Frontend Theme Overhaul | DONE | Dark theme applied globally (fix/round2) |
| German Translation (UI) | DONE | All pages fully in German; Footer description/nav translated; AdminPage left as-is |
| Guest Mode (Games) | DONE | /games/guest hub + blackjack/slots/mines + poker; 1000 session coins; /games → 3-card chooser for auth users; guest poker uses /guest-poker Socket.IO namespace (6-seat, 1/2 blinds, 60s AFK kick, separate from logged-in tables) |
| PWA (installable app + offline) | DONE | SW + Workbox caching; OfflineBanner + OfflineOverlay; see context/features/pwa.md |
| Mobile Optimization | PARTIAL | Fixed bottom nav bar (Forum/Links/Abi27/Games/MC); footer hidden on mobile; prediction FAB cleared from nav bar; hamburger menu + chat button remain in top navbar |
| Production Deploy (OCI) | DONE | Live at essensgruppe.de, PM2 managed, fresh DB |

## Needs User Input

- **Stundenplan data** — schedule data for the dropdown selector on Links page
- **MC Leaderboard** — data source for player stats (API, file, or manual)
- **Social link URLs** — verify GoFundMe, Instagram are current
- **Landing page video** — currently YouTube `Y2gmQFjpcsU`, swap if needed

## Current Branch

`feature/german-translation` — chat system, bug fixes, i18n work; needs merge to main
