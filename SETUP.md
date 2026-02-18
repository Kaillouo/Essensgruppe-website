# Setup Guide - Essensgruppe Portal

## Prerequisites

Before you begin, ensure you have installed:

1. **Node.js** (v18 or higher)
   - Download from: https://nodejs.org/
   - Verify: `node --version`

2. **PostgreSQL** (localhost:5432)
   - Download from: https://www.postgresql.org/download/windows/
   - During installation, set a password for the `postgres` user
   - Remember this password - you'll need it!

3. **Git Bash** (already installed ✓)

4. **VS Code** (already installed ✓)

---

## Installation Steps

### Step 1: Install Dependencies

Open Git Bash in the project folder and run:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 2: Set Up Environment Variables

#### Backend Environment

Create a `.env` file in the `backend` folder:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your PostgreSQL credentials:

```env
# Database - IMPORTANT: Update the password!
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/essensgruppe?schema=public"

# JWT Secret - Change this to a random string!
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# Server
PORT=3000
NODE_ENV="development"

# Frontend URL (for CORS)
FRONTEND_URL="http://localhost:3001"
```

**Replace `YOUR_PASSWORD` with your actual PostgreSQL password!**

#### Frontend Environment

Create a `.env` file in the `frontend` folder:

```bash
cd ../frontend
cp .env.example .env
```

The frontend `.env` should contain:

```env
VITE_API_URL=http://localhost:3000/api
```

### Step 3: Set Up Database

```bash
cd backend

# Generate Prisma Client
npm run prisma:generate

# Create the database and run migrations
npm run prisma:migrate

# Optional: Open Prisma Studio to view your database
npm run prisma:studio
```

If the migration asks for a name, you can use: `init` or `initial_schema`

### Step 4: Run Development Servers

You'll need **TWO terminal windows**:

#### Terminal 1 - Backend

```bash
cd backend
npm run dev
```

You should see:
```
🚀 Server running on http://localhost:3000
📊 Environment: development
```

#### Terminal 2 - Frontend

```bash
cd frontend
npm run dev
```

You should see:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:3001/
➜  Network: use --host to expose
```

### Step 5: Test the Application

1. Open your browser and go to: **http://localhost:3001**
2. You should see the landing page with animations
3. Click "Ich bin Teil der Essensgruppe" to go to login
4. Click "Request to join" to register a new account
5. Register with:
   - Username: test_user
   - Email: test@example.com
   - Password: password123
6. After registration, you'll be logged in automatically
7. You should see the navbar with your balance (1000 coins)
8. Navigate through all the pages

---

## Testing Phase 1 Checklist

- [ ] Landing page loads with scroll animations
- [ ] Can register a new account
- [ ] Can login with credentials
- [ ] Navbar shows user balance and profile dropdown
- [ ] Can navigate to all placeholder pages (Forum, Events, Links, MC, Games, About)
- [ ] Can view profile page with stats
- [ ] Can change password
- [ ] Can update profile info
- [ ] Admin account can access `/admin` panel
- [ ] Can logout successfully
- [ ] Protected routes redirect to login when not authenticated

---

## Creating an Admin Account

To test admin features, you can promote your account to admin:

1. Open Prisma Studio:
   ```bash
   cd backend
   npm run prisma:studio
   ```

2. Go to the `User` table
3. Find your user
4. Change `role` from `USER` to `ADMIN`
5. Save and refresh your browser
6. You should now see "Admin Panel" in your profile dropdown

---

## Troubleshooting

### Database Connection Error

**Error:** `Can't reach database server at localhost:5432`

**Solution:**
- Make sure PostgreSQL is running
- Check your DATABASE_URL in `backend/.env`
- Verify the password is correct
- Try: `psql -U postgres` in terminal to test connection

### Port Already in Use

**Error:** `Port 3000 or 3001 is already in use`

**Solution:**
```bash
# Windows: Find and kill the process
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

### Prisma Client Not Found

**Error:** `@prisma/client did not initialize yet`

**Solution:**
```bash
cd backend
npm run prisma:generate
```

### CORS Errors

**Error:** `Access to fetch blocked by CORS policy`

**Solution:**
- Make sure both frontend and backend are running
- Check that `FRONTEND_URL` in backend/.env is correct
- Restart both servers

---

## Next Steps

After Phase 1 is working:

- **Phase 2:** Implement the Forum System with bubble visualization
- **Phase 3:** Build Events, Links, and Minecraft pages
- **Phase 4:** Create Gambling Framework with WebSocket
- **Phase 5:** Polish, optimize, and deploy to OCI

---

## Useful Commands

```bash
# Backend
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Run production server
npm run prisma:studio # Open database GUI

# Frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Both
npm install          # Install dependencies
```

---

## Need Help?

- Check the console for error messages (both browser and terminal)
- Make sure PostgreSQL is running
- Verify all environment variables are set correctly
- Ensure all dependencies are installed (`npm install`)

Good luck! 🚀
