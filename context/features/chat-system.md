# Chat System

**Status:** DONE (2026-02-28)

## Overview
Floating Messenger-style chat (bottom-right bubble) for 1-on-1 DMs + AI chatbot. Messages auto-delete after 24h; contacts persist. AI messages are session-only (not stored in DB).

## Key Files
- `backend/src/routes/chat.routes.ts` — 6 REST endpoints (contacts CRUD, messages, search, AI)
- `backend/src/server.ts` — socket events (`chat:send/receive/read/typing`) + hourly message cleanup
- `frontend/src/components/Chat*.tsx` — ChatBubble, ChatPanel, ChatContactList, ChatConversation, ChatAIConversation

## Database Models
- **DirectMessage** — senderId, receiverId, content, read (auto-deleted after 24h via hourly cleanup)
- **Contact** — userId, contactId (persists, @@unique([userId, contactId]))

## Socket Events
| Event | Direction | Description |
|-------|-----------|-------------|
| `chat:send` | Client → Server | Send DM, save to DB, auto-add contacts, forward to recipient |
| `chat:receive` | Server → Client | New message (real-time + sender echo) |
| `chat:read` | Client → Server | Mark messages from user as read |
| `chat:typing` / `chat:typing_indicator` | Both | Typing indicator |
| `chat:unread_count` | Server → Client | Total unread badge count |

## AI Chatbot
- Endpoint: `POST /api/chat/ai` (rate limited 10/min)
- Model: Claude Haiku (`claude-haiku-4-5-20251001`), max 20 messages context
- System prompt: defined in `context/features/ai-chatbot-character.md` (TBD)
- Requires `ANTHROPIC_API_KEY` in backend `.env`

## Notes
- Old `games:message` / `games:receive_message` system still exists (simple toast). Chat system is the proper replacement.
- Chat panel: semi-transparent (`bg-gray-900/85 backdrop-blur-md`), ~360x500px, z-[9998]
- User blocking (2026-03-02): blocked DMs silently discarded in `chat:send` handler
