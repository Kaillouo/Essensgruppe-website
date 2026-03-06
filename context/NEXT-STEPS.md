# Next Steps

**Last Updated:** 2026-03-06

<!-- User: write your priorities here between sessions. Claude reads this at session start. -->

## Current Priorities

1. **Deploy latest to OCI** — git push main, pull on server, npm run build, pm2 restart
2. **Landing V2 polish** — review on mobile, tweak tunnel speed/density if needed, adjust room scenes
3. **Mobile optimization** — test all pages on mobile, fix responsive issues

## Backlog

- **Forum bubble/graph view** — Obsidian-style force-directed graph (see features/forum-bubbles.md)
- **AI chatbot character** — fill in `context/features/ai-chatbot-character.md`, set `AI_SYSTEM_PROMPT` + `ANTHROPIC_API_KEY` in backend `.env`
- **Frontend theme overhaul** — implement advanced animations from features/frontend-theme.md (WebGL, GSAP, custom cursor)
- BlueMap nginx reverse proxy on OCI (`/bluemap` → localhost:8100)
- Stundenplan component (waiting for schedule data)
- MC Leaderboard (waiting for data source)
- Loading states / skeleton screens for async operations
- Error handling improvements
