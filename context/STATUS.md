# Project Status

**Last Updated:** 2026-02-26

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
| Prediction Market | DONE | Create/bet/resolve, payout logic |
| Slots | DONE | |
| Blackjack | DONE | |
| Profile + Avatar Upload | DONE | Sharp resize to 256x256 |
| Admin Panel | DONE | Users, settings, analytics, balance, Abi Zeitung |
| About Us + Privacy | DONE | |
| Role System | DONE | ABI27, ESSENSGRUPPE_MITGLIED, ADMIN |
| Security Audit | DONE | Rate limits, JWT guard, source maps — see context/features/securities.md |
| Post/Event/Prediction Visibility | DONE | ESSENSGRUPPE_ONLY toggle for members; ABI27 filtered server-side |
| Daily Login Reward | DONE | 1000 coins/day with 24h cooldown, auto-claim on landing page |
| Forum Graph/Bubble View | PLANNED | See context/features/forum-bubbles.md |
| Frontend Theme Overhaul | PLANNED | See context/features/frontend-theme.md |
| Mobile Optimization | TODO | |
| Production Deploy (OCI) | PARTIAL | Server running but needs build optimization |

## Needs User Input

- **Stundenplan data** — schedule data for the dropdown selector on Links page
- **MC Leaderboard** — data source for player stats (API, file, or manual)
- **Social link URLs** — verify GoFundMe, Instagram are current
- **Landing page video** — currently YouTube `Y2gmQFjpcsU`, swap if needed

## Current Branch

`feature/daily-coins` — daily login reward system (1000 coins/24h) implemented, ready to merge
