# School Community Portal + Gambling Site

## Development Environment

**Local Development (Windows PC):**
- Node.js installed
- Git Bash installed
- PostgreSQL to be installed locally
- VS Code for editing
- Test at localhost before deployment

**Production (OCI Instance):**
- Ubuntu server
- nginx configured
- Domain from Squarespace (already pointing)
- SSL configured
- BlueMap running on port 8100

**Workflow:**
```
Windows PC (develop) → GitHub (version control) → OCI (production deploy)
```

### Starting the Dev Servers

**IMPORTANT:** Before starting servers, always kill any stale processes on the required ports first. Leftover processes from previous sessions cause port conflicts.

**Required ports:**
- Backend API: `localhost:3000`
- Frontend Dev Server: `localhost:3001` (strictPort enabled — will ERROR if 3001 is taken, not silently switch)
- PostgreSQL: `localhost:5432`

**Startup procedure:**
```bash
# 1. Kill any stale node processes on ports 3000 and 3001
# Find PIDs:
netstat -ano | grep -E "LISTENING" | grep -E "300[01]"
# Kill them (replace PIDs):
taskkill //PID <pid> //F

# 2. Start backend
cd backend && npm run dev

# 3. Start frontend (in separate terminal)
cd frontend && npm run dev
```

**If frontend fails with "port 3001 is already in use":** A stale process is hogging the port. Find and kill it with the commands above, then retry.

---

## Project Overview
Multi-purpose website for my school class (Abitur 2027). Combines public landing,
private forum, event planning, resource links, Minecraft server info, and gambling games.

---

## 📋 Documentation Files

**PROGRESS.md** - Implementation progress log. Read this file to see what has been completed, what's in progress, and architectural decisions made. Updated after each phase completion.

**NextSteps.md** - START HERE for future sessions! Current status, what to do next, troubleshooting guide, and success criteria for each phase.

---

## User Access Levels

### 1. Visitors (Public)
- See landing page
- View "About Us"
- Can request to join Essensgruppe

### 2. Essensgruppe Members (Private)
- Everything visitors see +
- Forum access
- Event planning (ABI 27)
- Links section
- MC server page
- Gambling games
- User profile

### 3. Admin (Me)
- Everything +
- Add/remove members
- Manage user balances (gambling)
- Moderate forum posts
- Edit events
- View analytics

---

## Site Structure

### Landing Page (Public)
- Modern scroll-down experience with effects
- Sections that reveal as you scroll
- Mobile + desktop responsive
- Clean, impressive design
- Top-left button: "Ich bin Teil der Essensgruppe" → login
- Sections preview: Forum bubble animation, event calendar glimpse, etc.
- CTA: Join our community

### Navigation (After Login)
```
Navbar:
- Essensgruppe Forum
- ABI 27
- Links
- MC
- Games
- About Us
- [Profile Icon] → dropdown (Profile, Logout)
```

---

## Core Features

### 1. Essensgruppe Forum
**Visual:** Bubble/mindmap interface

- Main view: Floating bubbles representing threads
- Click bubble → expands into Reddit-style thread
- Each thread has:
  - Title
  - Original post (text + images)
  - Upvote/downvote system
  - Comments (nested, unlimited depth)
  - Reply to comments
  - Edit/delete own posts
- Search bar at top
- Filter: Hot, New, Top
- Create new thread button
- Image upload (no videos)
- User avatars next to posts

### 2. ABI 27 (Events)
**Three sections:**

**Upcoming Events:**
- Anyone can submit event proposal
- Fields: Title, description, date, location, budget estimate
- Vote system (thumbs up/down)
- Sort by votes
- Status: Proposed

**In Planning:**
- Events moved here when accepted
- Shows planning details
- Assign tasks to members
- Status updates

**Completed:**
- Archive of past events
- Photos, recap text
- Memories section

**External Links Section:**
- GoFundMe link (with embed preview)
- TikTok (@yourhandle)
- Instagram (@yourhandle)
- Other socials

### 3. Links
Resource hub for school stuff:

- **Teachers List:** Name, subjects, email (I provide data)
- **Stundenplan:** 
  - Dropdown to select person
  - Shows their schedule (I provide link/embed)
- **Important Links:**
  - School website
  - Moodle
  - Other resources I'll add later

Layout: Card-based, clean, searchable

### 4. MC (Minecraft Server)
- Hero section: Server IP (copy button)
- Embedded BlueMap: iframe to `http://[OCI-IP]:8100` (already running)
- **Announcements:** Admin posts updates (new plugins, events)
- **Rules:** Text list
- **Leaderboard:** Top players (playtime, achievements) - I'll provide data source later
- **How to Join:** Instructions
- Server status indicator (online/offline, player count)

### 5. Games (Gambling)
**User Balance System:**
- Everyone starts: 1000 coins
- Balance shown in navbar
- Transaction history in profile

**Game Structure:**
- Games list page (cards for each game)
- Each game on separate route: `/games/coinflip`, `/games/dice`, etc.
- Real-time via WebSocket
- Bet validation server-side
- Animations for results
- House edge: 5% on all games

**I'll design games later** - just build the framework now.

### 6. About Us
Simple page:
- Class photo
- Text about our Abitur journey
- Contact info
- Maybe timeline of our years together

### 7. User Profile
- Username
- Avatar upload
- Member since date
- Gambling stats: Total bets, wins, losses, current balance
- Forum stats: Posts created, comments, upvotes received
- Change password
- Delete account (with confirmation)

### 8. Admin Panel
Only I can access (`/admin`):

**User Management:**
- List all members (table)
- Add member (username, email, temp password)
- Delete member
- Ban/unban
- Adjust gambling balance manually

**Forum Moderation:**
- See flagged posts
- Delete any post/comment
- View user activity

**Analytics Dashboard:**
- Total members
- Active users today
- Forum posts this week
- Gambling: Total bets, house profit
- Event participation stats

---

## Design Requirements

### Visual Style
- **Theme:** Modern, clean, youthful
- **Colors:** TBD (we'll iterate together)
- **Typography:** Sans-serif, readable
- **Spacing:** Generous whitespace
- **Animations:** Smooth transitions, scroll effects, micro-interactions

### Landing Page Effects
- Parallax scrolling
- Fade-in animations on scroll
- Smooth section transitions
- Mobile hamburger menu
- Sticky navbar on scroll

### Responsive Design
- Mobile-first approach
- Breakpoints: 640px, 768px, 1024px, 1280px
- Touch-friendly buttons (min 44px)
- Collapsible sidebar on mobile

### UI Components Needed
- Modal dialogs (login, create post, confirm delete)
- Toast notifications (success, error)
- Loading spinners
- Avatar placeholders
- Image lightbox
- Dropdown menus
- Tabs
- Accordions
- Card layouts
- Bubble/node visualization for forum

---

## Technical Stack

### Frontend
- **Framework:** React with TypeScript
- **Styling:** TailwindCSS + custom CSS for animations
- **State:** React Context API or Zustand
- **Routing:** React Router v6
- **Real-time:** Socket.io client
- **Forms:** React Hook Form
- **Image handling:** React Dropzone
- **Animations:** Framer Motion
- **Charts (admin):** Recharts

### Backend
- **Runtime:** Node.js with TypeScript
- **Framework:** Express
- **Database:** PostgreSQL
- **ORM:** Prisma (preferred) or raw SQL
- **Auth:** JWT (7-day expiry) + bcrypt
- **Real-time:** Socket.io server
- **Image upload:** Multer + sharp (resize)
- **Validation:** Zod
- **Rate limiting:** express-rate-limit

### Local Development Setup
- PostgreSQL on localhost:5432
- Backend runs on localhost:3000
- Frontend runs on localhost:3001 (proxies to backend)
- Hot reload enabled
- Environment variables in .env files

### Database Schema (High-level)
```
users: id, username, email, password_hash, role, balance, avatar_url, created_at
posts: id, user_id, title, content, image_url, created_at, updated_at
comments: id, post_id, parent_comment_id, user_id, content, created_at
votes: id, user_id, target_id, target_type (post/comment), value (+1/-1)
events: id, user_id, title, description, date, location, budget, status, votes, created_at
transactions: id, user_id, amount, type, game, created_at
games_history: id, user_id, game_type, bet, result, payout, created_at
```

### Production Deployment (OCI)
- **Ports:** 
  - 3000: Main app backend
  - 3001: WebSocket server
  - 5432: PostgreSQL
  - 8100: BlueMap (already running)
- **Process manager:** PM2
- **Reverse proxy:** nginx (already configured)
- **SSL:** Let's Encrypt (already configured)

---

## Development Phases

### Phase 1: Foundation (Start Here)
1. Project structure + dependencies
2. Database schema + Prisma setup
3. Auth system (register, login, JWT)
4. Basic routing (all pages placeholders)
5. Landing page with scroll effects
6. Navbar + footer
7. User profile page
8. Admin panel shell
9. Local dev environment setup

**Deliverable:** Can login, see all pages (empty), landing looks impressive

### Phase 2: Forum System
1. Create post/thread
2. Bubble visualization
3. Thread view (Reddit-style)
4. Nested comments
5. Upvote/downvote
6. Search functionality
7. Image uploads
8. Edit/delete own content

**Deliverable:** Fully functional forum

### Phase 3: Events + Links
1. Event submission form
2. Voting system
3. Status management (admin)
4. Social links section
5. Links page (teachers, schedules)
6. MC page (iframe BlueMap, static content)

**Deliverable:** ABI 27 + Links + MC pages complete

### Phase 4: Gambling Framework
1. Balance system
2. Game template (reusable)
3. WebSocket setup
4. Transaction logging
5. Admin balance adjustment

**Deliverable:** Ready for game implementation

### Phase 5: Polish + Deployment
1. Mobile optimization
2. Loading states
3. Error handling
4. Admin analytics
5. Production build scripts
6. nginx config for OCI
7. PM2 ecosystem file
8. Deployment documentation
9. GitHub Actions CI/CD (optional)

**Deliverable:** Production-ready, deployed to OCI

---

## Security Requirements
- Passwords: bcrypt (12 rounds)
- XSS protection: Sanitize all user input
- CSRF tokens for forms
- Rate limiting: 5 login attempts/min, 20 API calls/min
- JWT secret in .env (never commit)
- SQL injection prevention (parameterized queries via Prisma)
- Image validation (type, size max 5MB)
- Role-based access control middleware
- HTTPS only in production

---

## Git Workflow
```bash
# Local development
git init
git add .
git commit -m "Initial commit"

# Push to GitHub
git remote add origin https://github.com/yourusername/school-portal
git push -u origin main

# Deploy to OCI
ssh ubuntu@your-oci-ip
git clone https://github.com/yourusername/school-portal
# Run deployment scripts
```

---

## Future Features (Not Now)
- Mobile app (React Native)
- Push notifications
- Private messaging
- Calendar integration
- File sharing
- Live chat (separate from forum)

---

## Initial Questions for Claude Code
- Exact color scheme preferences?
- Landing page sections content?
- Preferred scroll animation style?
- Forum bubble layout specifics?
- Avatar system (upload or generated avatars)?