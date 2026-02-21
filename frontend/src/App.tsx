import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { useSocket } from './contexts/SocketContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForumPage } from './pages/ForumPage';
import { ThreadPage } from './pages/ThreadPage';
import { EventsPage } from './pages/EventsPage';
import { LinksPage } from './pages/LinksPage';
import { MinecraftPage } from './pages/MinecraftPage';
import { GamesPage } from './pages/GamesPage';
import { GamePlaceholderPage } from './pages/GamePlaceholderPage';
import { PredictionPage } from './pages/PredictionPage';
import { PokerPage } from './pages/PokerPage';
import { SlotsPage } from './pages/SlotsPage';
import { BlackjackPage } from './pages/BlackjackPage';
import { AboutPage } from './pages/AboutPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';

function GlobalMessageToast() {
  const { incomingMessage, clearIncomingMessage } = useSocket();
  return (
    <AnimatePresence>
      {incomingMessage && (
        <motion.div
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 60 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="fixed top-20 right-6 z-[9999] max-w-xs"
        >
          <div className="bg-[#111827] border border-indigo-600/30 rounded-2xl px-4 py-3 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-indigo-400 font-semibold mb-1">📨 {incomingMessage.fromUsername}</p>
                <p className="text-sm text-gray-200">{incomingMessage.message}</p>
              </div>
              <button onClick={clearIncomingMessage} className="text-gray-600 hover:text-gray-400 text-lg leading-none flex-shrink-0 mt-0.5">×</button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AppContent() {
  const location = useLocation();

  // Don't show navbar/footer on landing page
  const showLayout = location.pathname !== '/' && location.pathname !== '/games/poker' && location.pathname !== '/games/blackjack';

  return (
    <div className="flex flex-col min-h-screen">
      <GlobalMessageToast />
      {showLayout && <Navbar />}

      <main className={showLayout ? '' : ''}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/about" element={<AboutPage />} />

          {/* Protected routes */}
          <Route
            path="/forum"
            element={
              <ProtectedRoute>
                <ForumPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/forum/:id"
            element={
              <ProtectedRoute>
                <ThreadPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events"
            element={
              <ProtectedRoute>
                <EventsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/links"
            element={
              <ProtectedRoute>
                <LinksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mc"
            element={
              <ProtectedRoute>
                <MinecraftPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/games"
            element={
              <ProtectedRoute>
                <GamesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/games/prediction"
            element={
              <ProtectedRoute>
                <PredictionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/games/poker"
            element={
              <ProtectedRoute>
                <PokerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/games/slots"
            element={
              <ProtectedRoute>
                <SlotsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/games/blackjack"
            element={
              <ProtectedRoute>
                <BlackjackPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/games/:game"
            element={
              <ProtectedRoute>
                <GamePlaceholderPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Admin routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminPage />
              </ProtectedRoute>
            }
          />

          {/* 404 redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {showLayout && <Footer />}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <AppContent />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
