# Project Status

**Last Updated:** 2026-03-06

## Features

| Feature | Status | Notes |
|---------|--------|-------|
| Landing Page | DONE | V2: tunnel grid + photo room scenes (see features/landing-redesign.md) |
| Auth (register/login/JWT) | DONE | Email verification via Resend |
| Password Reset | DONE | Self-service, 1-hour token |
| Email System (5 templates) | DONE | Resend SMTP, Emperor@essensgruppe.de |
| Forum (posts/comments/votes) | DONE | Reddit-style, nested comments, search, sort |
| Events + Photo Galleries | DONE | Propose/vote/status, photo carousel |
| Abi Zeitung (anonymous) | DONE | Submit anonymously, admin views |
| Links Page | DONE | School links, 83 teachers, Stundenplan placeholder |
| MC Page | DONE | Server status, BlueMap iframe, announcements |
| Poker (Texas Hold'em) | DONE | 6-seat, solo mode, queue, watchers, emotes |
| Prediction Market | DONE | Create/bet/resolve; debt system (losers can go negative) |
| Slots | DONE | |
| Blackjack | DONE | |
| Mines | DONE | Stake-style 5x5, custom mine picker, 5% house edge |
| Profile + Avatar Upload | DONE | Sharp resize to 256x256 |
| Admin Panel | DONE | Users (incl. E-Mail), settings, analytics, balance, Abi Zeitung |
| About Us + Privacy | DONE | |
| Role System | DONE | ABI27, ESSENSGRUPPE_MITGLIED, ADMIN |
| Security Audit | DONE | Rate limits, JWT guard, source maps — see features/securities.md |
| Post/Event/Prediction Visibility | DONE | ESSENSGRUPPE_ONLY toggle; ABI27 filtered server-side |
| Daily Login Reward | DONE | 1000 coins/day, 24h cooldown, auto-claim on landing |
| Chat System | DONE | Floating Messenger, 1-on-1 DMs (24h TTL), contacts, AI bot (Haiku) |
| Guest Mode (Games) | DONE | Guest hub + blackjack/slots/mines/poker; 1000 session coins |
| PWA | DONE | Installable app, offline banner/overlay, Workbox caching |
| Notification System | DONE | Browser native via Socket.io; 9 types; user prefs; admin broadcast |
| User Blocking | DONE | Block/unblock in profile + chat; blocked DMs silently discarded |
| Mobile Bottom Nav | DONE | 5-tab fixed bar (Forum/Links/Abi27/Games/MC) |
| German Translation | DONE | All pages; AdminPage left as-is |
| Frontend Theme | PARTIAL | Dark theme + landing V2 done; WebGL/cursor not built (see features/frontend-theme.md) |
| Forum Graph/Bubble View | PLANNED | See features/forum-bubbles.md |
| Production Deploy (OCI) | DONE | Live at essensgruppe.de, PM2 managed |

## Needs User Input

- **Stundenplan data** — schedule data for Links page dropdown
- **MC Leaderboard** — data source for player stats
- **Social link URLs** — verify GoFundMe, Instagram are current
- **Landing page video** — currently YouTube `Y2gmQFjpcsU`
- **AI chatbot character** — fill in features/ai-chatbot-character.md + set ANTHROPIC_API_KEY

## Current Branch

`main` — all feature branches merged. Deploy pending for latest changes.
