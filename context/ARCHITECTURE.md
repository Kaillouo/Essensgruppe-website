# Architecture

**Last Updated:** 2026-02-25

Monorepo: `backend/` (Express + TypeScript) and `frontend/` (React + Vite + TypeScript)

---

## Folder Structure

```
backend/
  src/
    server.ts                  # Express + Socket.io entry point
    seed.ts                    # DB seed (admin account)
    middleware/
      auth.middleware.ts       # authenticateToken, optionalAuth, requireAdmin, requireMember
      upload.middleware.ts     # multer for avatars + event photos
      rateLimiter.middleware.ts # login (5/min), register (3/hr), forgotPassword (5/15min), resetPassword (5/15min)
    routes/
      auth.routes.ts           # register, verify-email, login, forgot/reset password
      user.routes.ts           # profile, avatar upload
      admin.routes.ts          # user mgmt, settings, analytics, balance
      post.routes.ts           # forum posts, comments, votes
      event.routes.ts          # events, event votes, event photos
      announcement.routes.ts   # MC announcements (admin)
      prediction.routes.ts     # prediction market
      poker.routes.ts          # GET /api/poker/state
      slots.routes.ts          # slots game
      blackjack.routes.ts      # blackjack game
      mc.routes.ts             # MC server status check
      abi.routes.ts            # anonymous Abi Zeitung submissions
    socket/
      poker.socket.ts          # Full Texas Hold'em game logic
    services/
      email.service.ts         # 5 email templates (Resend SMTP)
    utils/
      jwt.util.ts              # JWT sign/verify
      password.util.ts         # bcrypt hash/compare
      prisma.ts                # Prisma client singleton
      mailer.ts                # nodemailer transporter (Resend)
    scripts/
      preview-email.ts         # Generate email HTML preview locally
      send-test-emails.ts      # Send test emails to any address
    types/
      index.ts                 # AuthRequest, DTOs, UserRole type
  prisma/
    schema.prisma              # 15 models, 6 enums

frontend/
  src/
    App.tsx                    # Router, layout, auth/socket providers
    main.tsx                   # Entry point
    pages/
      LandingPage.tsx          # Public landing (YouTube bg)
      LoginPage.tsx            # Login (username or email)
      RegisterPage.tsx         # Register (with email)
      VerifyEmailPage.tsx      # Email verification callback
      ForgotPasswordPage.tsx   # Request password reset
      ResetPasswordPage.tsx    # Set new password via token
      ForumPage.tsx            # Post list + create modal
      ThreadPage.tsx           # Post detail + nested comments
      EventsPage.tsx           # ABI 27 events + Abi Zeitung form
      LinksPage.tsx            # School links, teachers, Stundenplan
      MinecraftPage.tsx        # MC server info + BlueMap
      GamesPage.tsx            # Game hub (single/multiplayer tabs)
      GamePlaceholderPage.tsx  # "Coming soon" for unbuilt games
      PredictionPage.tsx       # Prediction market
      PokerPage.tsx            # Full-screen poker table
      SlotsPage.tsx            # Slot machine
      BlackjackPage.tsx        # Blackjack
      ProfilePage.tsx          # User profile + avatar + stats
      AdminPage.tsx            # Admin panel (users, settings, analytics, Abi Zeitung)
      AboutPage.tsx            # About us page
      PrivacyPage.tsx          # Datenschutz
    components/
      Navbar.tsx               # Nav bar with balance, profile dropdown
      Footer.tsx               # Site footer
      ProtectedRoute.tsx       # Auth guard (optional requireAdmin)
    contexts/
      AuthContext.tsx           # Login/logout, user state, JWT token
      SocketContext.tsx         # Socket.io connection, online users, messaging
    services/
      api.service.ts           # 40+ static methods for all API calls
    types/
      index.ts                 # User, Post, Comment, Event, etc.
```

---

## API Routes

### Auth (`/api/auth`)
| Method | Path | Description |
|--------|------|-------------|
| POST | /register | Create account + send verification email |
| POST | /verify-email | Activate account with token |
| POST | /login | Login with username or email |
| POST | /forgot-password | Send password reset email |
| POST | /reset-password | Set new password with token |

### User (`/api/users`)
| Method | Path | Description |
|--------|------|-------------|
| GET | /me | Get own profile |
| PATCH | /me | Update profile |
| PATCH | /me/password | Change password |
| POST | /me/avatar | Upload avatar (multer + sharp) |
| DELETE | /me | Delete account |

### Admin (`/api/admin`) — requires ADMIN role
| Method | Path | Description |
|--------|------|-------------|
| GET | /users | List all users |
| GET | /users/pending | List pending users |
| POST | /users | Create user (skip verification) |
| PATCH | /users/:id/approve | Approve pending user |
| PATCH | /users/:id/deny | Deny pending user |
| PATCH | /users/:id/ban | Ban user |
| PATCH | /users/:id/unban | Unban user |
| PATCH | /users/:id/password | Admin reset password |
| PATCH | /users/:id/balance | Adjust gambling balance |
| PATCH | /users/:id/role | Change role (ABI27/ESSENSGRUPPE_MITGLIED) |
| PATCH | /users/:id/username | Rename user |
| DELETE | /users/:id | Delete user |
| GET | /analytics | Dashboard stats |
| GET | /settings | Get app settings |
| PATCH | /settings | Update app settings |

### Forum (`/api/posts`)
| Method | Path | Description |
|--------|------|-------------|
| GET | / | List posts (sort: new/hot/top, search) |
| POST | / | Create post |
| GET | /:id | Get post with comment tree + votes |
| PATCH | /:id | Edit own post |
| DELETE | /:id | Delete own post (cascades) |
| POST | /:id/comments | Add comment (supports nesting) |
| DELETE | /comments/:id | Delete own comment |
| POST | /:id/vote | Vote on post (+1/-1 toggle) |
| POST | /comments/:id/vote | Vote on comment |

### Events (`/api/events`)
| Method | Path | Description |
|--------|------|-------------|
| GET | / | List all events with user votes |
| POST | / | Create event proposal |
| POST | /:id/vote | Vote on event |
| PATCH | /:id/status | Admin: change status |
| DELETE | /:id | Delete event |
| POST | /:id/photos | Upload event photo |
| DELETE | /:id/photos/:photoId | Delete event photo |

### Other Routes
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/announcements | List MC announcements |
| POST | /api/announcements | Admin: create announcement |
| DELETE | /api/announcements/:id | Admin: delete announcement |
| GET | /api/predictions | List predictions with bets |
| POST | /api/predictions | Create prediction |
| POST | /api/predictions/:id/bet | Place bet |
| POST | /api/predictions/:id/resolve | Resolve + payout |
| DELETE | /api/predictions/:id | Delete prediction |
| GET | /api/poker/state | Current poker table state |
| GET | /api/mc/status | MC server online check (TCP) |
| POST | /api/abi/submit | Anonymous Abi Zeitung submission |
| GET | /api/abi/submissions | Admin: list submissions |
| DELETE | /api/abi/submissions/:id | Admin: delete submission |
| GET | /api/health | Health check |

---

## Database Models (Prisma)

| Model | Key Fields | Purpose |
|-------|-----------|---------|
| User | username, email, passwordHash, role, status, emailVerified, balance, avatarUrl | Accounts |
| EmailVerification | userId (unique), token, expiresAt | Email verify tokens |
| PasswordReset | userId (unique), token, expiresAt | Password reset tokens |
| AppSetting | key (PK), value | App config (registration open/closed) |
| Post | userId, title, content, imageUrl | Forum threads |
| Comment | postId, parentCommentId, userId, content | Nested comments |
| Vote | userId, targetId, targetType (POST/COMMENT), value | Polymorphic votes |
| Event | userId, title, description, date, location, budget, status, votes | Event proposals |
| EventVote | userId, eventId, value | Per-user event votes |
| EventPhoto | eventId, userId, imageUrl | Event gallery |
| Announcement | userId, title, content | MC announcements |
| Transaction | userId, amount, type, game | Balance ledger |
| Prediction | creatorId, title, closeDate, status, outcome | Prediction market |
| PredictionBet | predictionId, userId, side, amount | Prediction bets |
| AbiSubmission | title, content (no userId — anonymous) | Abi Zeitung |
| GameHistory | userId, gameType, bet, result, payout | Game results |

**Enums:** Role (ABI27, ESSENSGRUPPE_MITGLIED, ADMIN), UserStatus (PENDING, ACTIVE, BANNED), VoteType (POST, COMMENT), EventStatus (PROPOSED, IN_PLANNING, COMPLETED), TransactionType (INITIAL_BALANCE, GAME_BET, GAME_WIN, PREDICTION_BET, PREDICTION_WIN, ADMIN_ADJUSTMENT), PredictionStatus (OPEN, CLOSED)

---

## Socket Events

### Site-wide (server.ts)
| Event | Direction | Description |
|-------|-----------|-------------|
| site:online_users | Server → All | List of online users |
| games:online_users | Server → All | Same list (backward compat) |
| games:message | Client → Server | Send instant message to user |
| games:receive_message | Server → Client | Receive instant message |

### Poker (poker.socket.ts)
| Event | Direction | Description |
|-------|-----------|-------------|
| poker:sit / poker:join | Client → Server | Take a seat |
| poker:stand | Client → Server | Leave seat |
| poker:action | Client → Server | fold/check/call/raise |
| poker:emote | Client → Server | Send emoji (8 options) |
| poker:message | Client → Server | Chat message (50 chars) |
| poker:state | Server → All | Full table state broadcast |
| poker:my_cards | Server → Client | Private hole cards |
| poker:hand_result | Server → All | Winner + hand name |
| poker:emote_broadcast | Server → All | Emoji from player |
| poker:message_broadcast | Server → All | Chat from player |
| poker:queue_update | Server → Client | Queue position |
| poker:queue_seated | Server → Client | Auto-seated from queue |
| poker:error | Server → Client | Error message |

---

## Frontend Routes

| Path | Component | Auth | Notes |
|------|-----------|------|-------|
| / | LandingPage | Public | No navbar/footer |
| /login | LoginPage | Public | |
| /register | RegisterPage | Public | |
| /verify-email | VerifyEmailPage | Public | |
| /forgot-password | ForgotPasswordPage | Public | |
| /reset-password | ResetPasswordPage | Public | |
| /about | AboutPage | Public | |
| /privacy | PrivacyPage | Public | |
| /forum | ForumPage | Protected | |
| /forum/:id | ThreadPage | Protected | |
| /events | EventsPage | Public | |
| /links | LinksPage | Public | |
| /mc | MinecraftPage | Protected | |
| /games | GamesPage | Protected | |
| /games/prediction | PredictionPage | Protected | |
| /games/poker | PokerPage | Protected | No navbar/footer |
| /games/slots | SlotsPage | Protected | |
| /games/blackjack | BlackjackPage | Protected | No navbar/footer |
| /games/:game | GamePlaceholderPage | Protected | |
| /profile | ProfilePage | Protected | |
| /admin | AdminPage | Admin | |
