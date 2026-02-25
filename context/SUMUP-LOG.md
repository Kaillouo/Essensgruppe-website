# Session Log

<!-- Append a brief entry after each work session (2-4 bullet points). -->
<!-- When this file exceeds ~80 lines: compact old entries into 1-2 lines each, keep last 10 entries detailed. -->

---

## 2026-02-25 — Visibility Feature (feature/post-visibility)
- Added `visibility String @default("ALL")` field to Post, Event, Prediction Prisma models; ran `prisma db push`
- Backend: `post.routes.ts`, `event.routes.ts`, `prediction.routes.ts` — ABI27 users filtered to `visibility='ALL'` items only; ESSENSGRUPPE_MITGLIED/ADMIN can create `ESSENSGRUPPE_ONLY` items
- Frontend: `types/index.ts` + `api.service.ts` updated; `ForumPage`, `EventsPage`, `PredictionPage` each have a visibility select (Alle/Nur Essensgruppe) shown only to members/admins, plus a "Nur EG" badge on restricted items

## 2026-02-24 — Context Reorganization
- Restructured project documentation: new `context/` folder replacing `kontext/`
- Rewrote CLAUDE.md as lean ~5KB quick card with maintenance rules
- Created ARCHITECTURE.md (routes, models, socket events, file tree)
- Created STATUS.md, NEXT-STEPS.md, UNFINISHED.md, KNOWN-ISSUES.md
- Created feature docs: email-system, gambling, poker, forum-bubbles, frontend-theme
- No code changes — documentation only

## Pre-2026-02-24 — Summary of all prior work
- Phase 1: Foundation (Express+React+Prisma, auth, landing page, admin shell)
- Phase 1.5: Auth refactor (admin approval flow, ban/unban, balance control)
- Phase 2: Forum (posts, nested comments, votes, search, sort, images)
- Phase 3: Events (proposals, voting, status mgmt, photo galleries), Links, MC page
- Phase 3.5: Event photo upload with multer+sharp, lightbox carousel
- Phase 4: Games hub, Poker (full Hold'em), Prediction Market, Slots, Blackjack
- Phase 4.3: Content fill (real teachers, links, MC IP, About page, Abi Zeitung)
- Phase 5.0: Email verification + role refactor (ABI27/ESSENSGRUPPE_MITGLIED/ADMIN)
- Phase 5.1-5.2: Email templates (5 designs), password reset flow, Resend SMTP switch
- Multiple bugfix sessions: token consumption by scanners, StrictMode double-fire, rate limiter JSON, duplicate method names
