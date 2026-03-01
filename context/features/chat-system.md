# Chat System — Implementation Plan

**Status:** DONE (Steps 1-8 complete; AI character TBD in ai-chatbot-character.md; ANTHROPIC_API_KEY needed in .env)
**Branch:** `feature/chat-system`
**Created:** 2026-02-28

---

## Overview

A global chat system accessible via a floating bubble button on every page. Users can:
1. Chat 1-on-1 with other users (messages persist 24h, then auto-delete)
2. Chat with an AI chatbot (Haiku, character defined in `context/features/ai-chatbot-character.md`)
3. Manage contacts (contacts persist until manually deleted)

The chat panel is a **floating card** (Messenger-style popup, bottom-right) with a **semi-transparent backdrop** so users can see the page behind it. Chat stays open while navigating between pages.

---

## Architecture

### Database (Prisma)

Add these models to `schema.prisma`:

```prisma
// Direct messages between users (auto-deleted after 24h)
model DirectMessage {
  id         String   @id @default(uuid())
  senderId   String   @map("sender_id")
  receiverId String   @map("receiver_id")
  content    String   @db.Text
  read       Boolean  @default(false)
  createdAt  DateTime @default(now()) @map("created_at")

  sender   User @relation("SentMessages", fields: [senderId], references: [id], onDelete: Cascade)
  receiver User @relation("ReceivedMessages", fields: [receiverId], references: [id], onDelete: Cascade)

  @@index([senderId, receiverId])
  @@index([receiverId, read])
  @@index([createdAt]) // for cleanup query
  @@map("direct_messages")
}

// Persistent contact list (survives message deletion)
model Contact {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  contactId String   @map("contact_id")
  createdAt DateTime @default(now()) @map("created_at")

  user    User @relation("UserContacts", fields: [userId], references: [id], onDelete: Cascade)
  contact User @relation("ContactOf", fields: [contactId], references: [id], onDelete: Cascade)

  @@unique([userId, contactId])
  @@index([userId])
  @@map("contacts")
}
```

Add to `User` model:
```prisma
sentMessages     DirectMessage[] @relation("SentMessages")
receivedMessages DirectMessage[] @relation("ReceivedMessages")
contacts         Contact[]       @relation("UserContacts")
contactOf        Contact[]       @relation("ContactOf")
```

Run `prisma db push` after changes.

---

### Backend Routes (`backend/src/routes/chat.routes.ts`)

All routes require `authenticateToken` middleware.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/chat/contacts` | List user's contacts (with last message preview + unread count) |
| POST | `/api/chat/contacts/:userId` | Add a user as contact (also adds reverse contact) |
| DELETE | `/api/chat/contacts/:userId` | Remove contact (only removes YOUR side) |
| GET | `/api/chat/messages/:userId` | Get message history with a specific user (paginated, last 50) |
| GET | `/api/chat/search?q=` | Search users by username (for adding contacts, exclude self) |
| POST | `/api/chat/ai` | Send message to AI chatbot, get response |

#### Message cleanup

Add a cleanup function that runs periodically (e.g., on server start + every hour via `setInterval`):

```typescript
async function cleanupOldMessages() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await prisma.directMessage.deleteMany({
    where: { createdAt: { lt: cutoff } }
  });
}
```

---

### Socket Events (`backend/src/server.ts`)

Add to existing socket handler:

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `chat:send` | Client → Server | `{ toUserId, content }` | Send DM, save to DB, forward to recipient |
| `chat:receive` | Server → Client | `{ message: DirectMessage }` | New message received (real-time) |
| `chat:read` | Client → Server | `{ fromUserId }` | Mark all messages from user as read |
| `chat:typing` | Client → Server | `{ toUserId }` | Typing indicator |
| `chat:typing_indicator` | Server → Client | `{ fromUserId }` | Show typing indicator |
| `chat:unread_count` | Server → Client | `{ count }` | Total unread messages (for badge) |

When a `chat:send` is received:
1. Save message to DB (`DirectMessage`)
2. Auto-add both users as contacts if not already
3. Emit `chat:receive` to recipient (if online)
4. Emit `chat:unread_count` to recipient

---

### Frontend Components

#### 1. `ChatBubble.tsx` — Floating button component
- Renders in `App.tsx` (outside Routes, inside SocketProvider)
- **Only renders when user is logged in**
- Fixed position bottom-right (`bottom-6 right-6`)
- Chat icon (speech bubble SVG)
- Shows **unread badge** (red dot with count)
- Click toggles the chat panel open/closed
- Z-index high enough to sit above everything (`z-[9998]`)

#### 2. `ChatPanel.tsx` — The floating card
- Anchored to bottom-right, above the bubble button
- Size: ~360px wide, ~500px tall (or viewport-responsive)
- **Semi-transparent background** (`bg-gray-900/85 backdrop-blur-md`)
- Border + shadow for depth
- Has two views managed by internal state:
  - **Contact list view** (default)
  - **Chat view** (when a contact is selected)

#### 3. `ChatContactList.tsx` — Contact list view inside the panel
- **Search bar** at top — searches users by username via `/api/chat/search`
  - Shows search results with "Nachricht senden" button
  - Clicking adds contact + opens chat
- **AI Chatbot entry** — always pinned at top of contact list (special entry with bot avatar)
- **Contact list** — each entry shows:
  - Username + avatar
  - Last message preview (truncated)
  - Unread count badge
  - Online indicator (green dot, from `onlineUsers`)
- **Remove contact** — small X button visible on hover/long-press, only when inside chat view (not from contact list)

#### 4. `ChatConversation.tsx` — Chat view inside the panel
- Header: back arrow (returns to contact list) + username + online status + delete contact button
- Message list: scrollable, newest at bottom, auto-scroll on new message
- Messages styled as bubbles (sent = right/indigo, received = left/gray)
- Timestamps on messages (relative: "vor 2 Min.")
- Typing indicator
- Input bar at bottom: text input + send button (Enter to send)
- For AI chat: show loading spinner while waiting for response

#### 5. `ChatAIConversation.tsx` — AI chatbot view (extends ChatConversation)
- Same UI as regular chat but:
  - No "delete contact" button
  - AI messages have bot avatar + name
  - Messages are NOT persisted in DB (session-only, stored in React state)
  - Calls `POST /api/chat/ai` with message history for context
  - Shows typing indicator while waiting for AI response

---

### AI Chatbot Backend (`POST /api/chat/ai`)

```typescript
// Request body
{ messages: Array<{ role: 'user' | 'assistant', content: string }> }

// Response
{ reply: string }
```

- Uses Claude Haiku (`claude-haiku-4-5-20251001`) via Anthropic SDK
- System prompt loaded from character file (see `context/features/ai-chatbot-character.md`)
- Max conversation context: last 20 messages
- Rate limit: 10 requests per minute per user
- API key stored in backend `.env` as `ANTHROPIC_API_KEY`

---

### UI Text (German)

| Key | Text |
|-----|------|
| Search placeholder | "Benutzer suchen..." |
| No contacts | "Noch keine Kontakte" |
| Send button | "Senden" |
| Type message | "Nachricht schreiben..." |
| Delete contact confirm | "Kontakt entfernen?" |
| AI bot name | TBD (see character file) |
| Message deleted notice | "Nachrichten werden nach 24 Stunden gelöscht" |
| User not found | "Kein Benutzer gefunden" |

---

## Implementation Order

Work through these steps in order. Each step should be a working increment.

### Step 1: Database schema
- Add `DirectMessage` and `Contact` models to `schema.prisma`
- Add relations to `User` model
- Run `prisma db push`
- Update `context/ARCHITECTURE.md` with new models

### Step 2: Backend REST routes
- Create `backend/src/routes/chat.routes.ts`
- Implement all 6 endpoints (contacts CRUD, messages, search, AI placeholder)
- Register routes in `server.ts`
- Add message cleanup function (setInterval every hour)

### Step 3: Backend socket events
- Add `chat:send`, `chat:read`, `chat:typing` handlers to `server.ts`
- Emit `chat:receive`, `chat:typing_indicator`, `chat:unread_count`
- Auto-add contacts on first message

### Step 4: Frontend — ChatBubble + ChatPanel shell
- Create `ChatBubble.tsx` with floating button + unread badge
- Create `ChatPanel.tsx` with open/close animation (framer-motion)
- Add to `App.tsx` (render when logged in, outside of Routes)
- Semi-transparent floating card UI

### Step 5: Frontend — Contact list + search
- Create `ChatContactList.tsx`
- User search with debounced API calls
- Contact list with last message preview + unread badges
- Online status indicators
- Add/remove contact functionality

### Step 6: Frontend — Chat conversation
- Create `ChatConversation.tsx`
- Real-time messaging via socket
- Message history loading from API
- Auto-scroll, typing indicators
- Read receipts (mark as read when conversation is open)

### Step 7: Frontend — AI chatbot
- Create `ChatAIConversation.tsx`
- Session-only message storage (React state)
- Loading/typing indicator while AI responds
- Integrate with `POST /api/chat/ai`

### Step 8: Backend — AI chatbot endpoint
- Install `@anthropic-ai/sdk` in backend
- Implement `POST /api/chat/ai` with Haiku
- Load system prompt from character config
- Add rate limiting (10/min)
- Add `ANTHROPIC_API_KEY` to `.env`

### Step 9: Polish + edge cases
- Handle user going offline mid-chat
- Responsive sizing for mobile (smaller card or full-screen)
- Sound/notification for new messages (optional, user preference)
- Update `context/STATUS.md` and `context/ARCHITECTURE.md`

---

## Files to Create/Modify

### New files:
- `backend/src/routes/chat.routes.ts`
- `frontend/src/components/ChatBubble.tsx`
- `frontend/src/components/ChatPanel.tsx`
- `frontend/src/components/ChatContactList.tsx`
- `frontend/src/components/ChatConversation.tsx`
- `frontend/src/components/ChatAIConversation.tsx`

### Modified files:
- `backend/prisma/schema.prisma` — new models
- `backend/src/server.ts` — register chat routes + socket events + cleanup
- `frontend/src/App.tsx` — render ChatBubble
- `frontend/src/contexts/SocketContext.tsx` — add unread count state + chat events
- `frontend/src/services/api.service.ts` — add chat API methods
- `frontend/src/types/index.ts` — add DirectMessage, Contact types
- `backend/src/middleware/rateLimiter.middleware.ts` — add AI chat rate limit

---

## Notes

- The existing `games:message` / `games:receive_message` system is a simple one-shot toast. The new chat system replaces this with a proper conversation UI. Keep the old system working for backward compat but consider deprecating it later.
- Messages auto-delete after 24h but contacts persist. This means the contact list shows users you've chatted with even after messages are gone.
- AI chatbot messages are session-only (not stored in DB) to avoid unnecessary storage and privacy concerns.
- The chat panel should NOT block interaction with the page behind it (no full-screen overlay).
