# Gambling System

## Balance System
- Every user starts with **1000 coins** (INITIAL_BALANCE transaction on email verification)
- Balance shown in navbar
- Admin can adjust balance manually (set or add/remove, logged as ADMIN_ADJUSTMENT)
- Transaction history stored in `Transaction` model

## Games

| Game | Status | Type | Key File |
|------|--------|------|----------|
| Poker (Texas Hold'em) | DONE | Multiplayer (Socket.io) | backend/src/socket/poker.socket.ts, frontend/src/pages/PokerPage.tsx |
| Prediction Market | DONE | Multiplayer (REST) | backend/src/routes/prediction.routes.ts, frontend/src/pages/PredictionPage.tsx |
| Slots | DONE | Single player | backend/src/routes/slots.routes.ts, frontend/src/pages/SlotsPage.tsx |
| Blackjack | DONE | Single player | backend/src/routes/blackjack.routes.ts, frontend/src/pages/BlackjackPage.tsx |

## Socket Setup
- Socket.io server initialized in `backend/src/server.ts`
- JWT auth middleware on socket connections
- Site-wide online user tracking (games:online_users event)
- Instant messaging between online users (games:message / games:receive_message)
- Poker has its own socket namespace via `registerPokerSocket(io)` in poker.socket.ts

## Transaction Types
`INITIAL_BALANCE` | `GAME_BET` | `GAME_WIN` | `PREDICTION_BET` | `PREDICTION_WIN` | `ADMIN_ADJUSTMENT`

## House Edge
5% on all games (configured per-game in route handlers)

## Poker Details
See `context/features/poker.md` for enhancement roadmap and technical details.
