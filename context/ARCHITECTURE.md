# Architecture

**Last Updated:** 2026-03-02

Monorepo: `backend/` (Express + TypeScript) and `frontend/` (React + Vite + TypeScript)

---

## Folder Structure

```
backend/
  src/
    server.ts                  # Express + Socket.io entry, schedulers (msg cleanup, notification reminders)
    seed.ts                    # DB seed (admin account)
    middleware/
      auth.middleware.ts       # authenticateToken, optionalAuth, requireAdmin, requireMember
      upload.middleware.ts     # multer for avatars + event photos + post photos
      rateLimiter.middleware.ts # login (5/min), register (3/hr), forgotPassword (5/15min), resetPassword (5/15min)
      guestAuth.middleware.ts  # authenticateGuest — validates X-Guest-ID header (UUID)
    routes/
      auth.routes.ts           # register, verify-email, login, forgot/reset password
      user.routes.ts           # profile, avatar, daily-claim
      admin.routes.ts          # user mgmt, settings, analytics, balance, broadcast
      post.routes.ts           # forum posts, comments, votes, photo upload
      event.routes.ts          # events, votes, status, photos
      prediction.routes.ts     # prediction market
      announcement.routes.ts   # MC announcements (admin)
      poker.routes.ts          # GET /api/poker/state
      slots.routes.ts          # slots game
      blackjack.routes.ts      # blackjack game
      mines.routes.ts          # mines game (5x5, in-memory, 3 endpoints)
      mc.routes.ts             # MC server status (TCP ping)
      abi.routes.ts            # anonymous Abi Zeitung submissions
      chat.routes.ts           # contacts, messages, search, AI chatbot
      notification.routes.ts   # notifications + preferences
      block.routes.ts          # user blocks
      guestGames.routes.ts     # guest session, balance, blackjack/slots/mines (no auth, in-memory)
    socket/
      poker.socket.ts          # Full Texas Hold'em game logic (auth namespace)
      guestPoker.socket.ts     # Guest poker (standalone, /guest-poker namespace)
    state/
      guestState.ts            # In-memory guest sessions Map<guestId,{balance,lastSeen}>; 30min TTL
    services/
      email.service.ts         # 5 email templates + broadcast (Resend SMTP)
      notification.service.ts  # createNotification, broadcastNotification
    utils/
      jwt.util.ts, password.util.ts, prisma.ts, mailer.ts
    scripts/
      preview-email.ts, send-test-emails.ts
    types/
      index.ts                 # AuthRequest, DTOs, UserRole type
  prisma/
    schema.prisma              # 21 models, 8 enums

frontend/
  src/
    App.tsx                    # Router, layout, providers, OfflineBanner, MobileBottomNav
    pages/
      LandingPage, LoginPage, RegisterPage, VerifyEmailPage,
      ForgotPasswordPage, ResetPasswordPage,
      ForumPage, ThreadPage, EventsPage, LinksPage, MinecraftPage,
      GamesLandingPage (3-card chooser), GamesCollectionPage,
      PredictionPage, PokerPage, SlotsPage, BlackjackPage, MinesPage,
      GuestHubPage, GuestBlackjackPage, GuestSlotsPage, GuestMinesPage, GuestPokerPage,
      ProfilePage, AdminPage, AboutPage, PrivacyPage
    components/
      Navbar, Footer, ProtectedRoute, MobileBottomNav,
      OfflineBanner, OfflineOverlay,
      ChatBubble, ChatPanel, ChatContactList, ChatConversation, ChatAIConversation
    contexts/
      AuthContext.tsx           # Login/logout, user state, JWT
      SocketContext.tsx         # Socket.io, online users, messaging, notifications
      GuestContext.tsx          # Guest mode: guestId, session balance
    hooks/
      useOnlineStatus.ts       # navigator.onLine detection
    services/
      api.service.ts           # 40+ static methods for all API calls
    types/
      index.ts                 # User, Post, Comment, Event, Notification, etc.
```

---

## API Routes

### Auth (`/api/auth`)
POST /register, /verify-email, /login, /forgot-password, /reset-password

### User (`/api/users`)
GET /me | PATCH /me, /me/password | POST /me/avatar, /daily-claim | DELETE /me

### Admin (`/api/admin`) — requires ADMIN
GET /users, /users/pending, /analytics, /settings
POST /users, /broadcast
PATCH /users/:id/approve, /deny, /ban, /unban, /password, /balance, /role, /username
PATCH /settings | DELETE /users/:id

### Forum (`/api/posts`)
GET /, /:id | POST /, /:id/comments, /:id/vote, /comments/:id/vote, /photo-upload
PATCH /:id | DELETE /:id, /comments/:id

### Events (`/api/events`)
GET / | POST /, /:id/vote, /:id/photos
PATCH /:id/status | DELETE /:id, /:id/photos/:photoId

### Predictions (`/api/predictions`)
GET / | POST /, /:id/bet, /:id/resolve | DELETE /:id

### Games
POST /api/games/mines/start, /reveal, /cashout
GET /api/poker/state
Slots + Blackjack: own route files

### MC + Announcements
GET /api/mc/status | GET/POST/DELETE /api/announcements

### Chat (`/api/chat`)
GET /contacts, /messages/:userId, /search, /unread | POST /contacts/:userId, /ai | DELETE /contacts/:userId

### Notifications (`/api/notifications`)
GET /, /preferences | PATCH /read-all, /:id/read, /preferences | DELETE /:id

### Blocks (`/api/blocks`)
GET / | POST /:userId | DELETE /:userId

### Abi Zeitung (`/api/abi`)
POST /submit | GET /submissions (admin) | DELETE /submissions/:id (admin)

### Guest (`/api/guest`)
POST /games/session | GET /games/balance
Guest blackjack/slots/mines endpoints in guestGames.routes.ts

### Health
GET /api/health

---

## Database Models (Prisma — 21 models)

| Model | Purpose |
|-------|---------|
| User | Accounts (username, email, role, status, balance, avatarUrl, lastDailyClaim) |
| EmailVerification | Email verify tokens |
| PasswordReset | Password reset tokens |
| AppSetting | App config (registration open/closed) |
| Post | Forum threads (userId, title, content, imageUrl, visibility) |
| Comment | Nested comments (postId, parentCommentId) |
| Vote | Polymorphic votes (POST/COMMENT) |
| Event | Event proposals (title, date, location, status, visibility) |
| EventVote | Per-user event votes |
| EventPhoto | Event gallery |
| Announcement | MC announcements |
| Transaction | Balance ledger (type: INITIAL_BALANCE/GAME_BET/GAME_WIN/PREDICTION_BET/PREDICTION_WIN/ADMIN_ADJUSTMENT/DAILY_COINS) |
| Prediction | Prediction market (title, closeDate, status, outcome, visibility) |
| PredictionBet | Prediction bets (side, amount) |
| AbiSubmission | Abi Zeitung (anonymous, no userId) |
| GameHistory | Game results (gameType, bet, result, payout) |
| DirectMessage | 1-on-1 chat (auto-deleted 24h) |
| Contact | Persistent contact list |
| Notification | In-app notifications (type, title, body, linkUrl, read) |
| UserBlock | Block users from DMs |
| NotificationPreference | Per-user notification toggles (8 booleans) |

**Enums:** Role, UserStatus, VoteType, EventStatus, TransactionType, PredictionStatus, NotificationType, Visibility (ALL/ESSENSGRUPPE_ONLY)

---

## Socket Events

### Chat (server.ts)
chat:send/receive/read/typing/typing_indicator/unread_count

### Notifications (server.ts)
notification:new, notification:count

### Site-wide (server.ts)
site:online_users, games:online_users, games:message/receive_message

### Poker (poker.socket.ts — auth namespace)
poker:sit/join/stand/action/emote/message → poker:state/my_cards/hand_result/emote_broadcast/message_broadcast/queue_update/queue_seated/error

### Guest Poker (/guest-poker namespace)
guest_poker:* events (same as poker but with guest_ prefix, UUID auth)

---

## Frontend Routes

| Path | Auth | Notes |
|------|------|-------|
| / | Public | Landing (no navbar/footer) |
| /login, /register, /verify-email, /forgot-password, /reset-password | Public | |
| /about, /privacy | Public | |
| /forum, /forum/:id | Protected | |
| /events | Public | |
| /links | Public | |
| /mc | Protected | |
| /games | Protected | 3-card chooser → singleplayer/multiplayer/guest |
| /games/prediction | Protected | |
| /games/poker, /blackjack, /mines | Protected | Full-screen (no navbar/footer) |
| /games/slots | Protected | |
| /games/guest, /guest/blackjack, /guest/slots, /guest/mines, /guest/poker | Public | Guest mode |
| /profile | Protected | |
| /admin | Admin | |
