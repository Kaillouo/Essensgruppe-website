import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { useSocket } from './contexts/SocketContext';
import { GuestProvider } from './contexts/GuestContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ChatBubble } from './components/ChatBubble';
import { ChatPanel } from './components/ChatPanel';
import { OfflineBanner } from './components/OfflineBanner';
import { OfflineOverlay } from './components/OfflineOverlay';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForumPage } from './pages/ForumPage';
import { ThreadPage } from './pages/ThreadPage';
import { EventsPage } from './pages/EventsPage';
import { LinksPage } from './pages/LinksPage';
import { MinecraftPage } from './pages/MinecraftPage';
import { GamesLandingPage } from './pages/GamesLandingPage';
import { GamesCollectionPage } from './pages/GamesCollectionPage';
import { GamePlaceholderPage } from './pages/GamePlaceholderPage';
import { PredictionPage } from './pages/PredictionPage';
import { PokerPage } from './pages/PokerPage';
import { SlotsPage } from './pages/SlotsPage';
import { BlackjackPage } from './pages/BlackjackPage';
import { MinesPage } from './pages/MinesPage';
import { GuestHubPage } from './pages/GuestHubPage';
import { GuestBlackjackPage } from './pages/GuestBlackjackPage';
import { GuestSlotsPage } from './pages/GuestSlotsPage';
import { GuestMinesPage } from './pages/GuestMinesPage';
import { GuestPokerPage } from './pages/GuestPokerPage';
import { AboutPage } from './pages/AboutPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';

// Waits for auth to resolve before deciding whether to show games landing or redirect guests
function GamesRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return user ? <GamesLandingPage /> : <Navigate to="/games/guest" replace />;
}

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

// Guest game pages are full-screen (no navbar/footer)
const GUEST_GAME_PATHS = ['/games/guest/blackjack', '/games/guest/slots', '/games/guest/mines', '/games/guest/poker'];
const FULLSCREEN_PATHS = ['/games/poker', '/games/blackjack', '/games/mines', ...GUEST_GAME_PATHS];

function AppContent() {
  const location = useLocation();
  const { user } = useAuth();
  const { chatOpen } = useSocket();

  const showLayout = location.pathname !== '/' && !FULLSCREEN_PATHS.includes(location.pathname);
  const showBubble = user && location.pathname === '/';
  const panelBottomOffset = showBubble ? 80 : 24;

  return (
    <div className="flex flex-col min-h-screen">
      <GlobalMessageToast />

      {user && <ChatPanel isOpen={chatOpen} bottomOffset={panelBottomOffset} />}
      {showBubble && <ChatBubble />}
      {showLayout && <Navbar />}
      {showLayout && <OfflineBanner />}

      <main className={showLayout ? 'pb-14 md:pb-0' : ''}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* ── Guest game routes (public, no auth required) ── */}
          <Route path="/games/guest" element={<GuestHubPage />} />
          <Route path="/games/guest/blackjack" element={<OfflineOverlay><GuestBlackjackPage /></OfflineOverlay>} />
          <Route path="/games/guest/slots" element={<OfflineOverlay><GuestSlotsPage /></OfflineOverlay>} />
          <Route path="/games/guest/mines" element={<OfflineOverlay><GuestMinesPage /></OfflineOverlay>} />
          <Route path="/games/guest/poker" element={<OfflineOverlay><GuestPokerPage /></OfflineOverlay>} />

          {/* /games → redirect guests to /games/guest, show landing for auth users */}
          <Route path="/games" element={<GamesRoute />} />

          {/* ── Singleplayer / Multiplayer collection pages ── */}
          <Route
            path="/games/singleplayer"
            element={
              <ProtectedRoute>
                <GamesCollectionPage mode="singleplayer" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/games/multiplayer"
            element={
              <ProtectedRoute>
                <GamesCollectionPage mode="multiplayer" />
              </ProtectedRoute>
            }
          />

          {/* ── Existing protected game routes (unchanged) ── */}
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
                <OfflineOverlay><PokerPage /></OfflineOverlay>
              </ProtectedRoute>
            }
          />
          <Route
            path="/games/slots"
            element={
              <ProtectedRoute>
                <OfflineOverlay><SlotsPage /></OfflineOverlay>
              </ProtectedRoute>
            }
          />
          <Route
            path="/games/blackjack"
            element={
              <ProtectedRoute>
                <OfflineOverlay><BlackjackPage /></OfflineOverlay>
              </ProtectedRoute>
            }
          />
          <Route
            path="/games/mines"
            element={
              <ProtectedRoute>
                <OfflineOverlay><MinesPage /></OfflineOverlay>
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
          <Route path="/links" element={<LinksPage />} />
          <Route
            path="/mc"
            element={
              <ProtectedRoute requireRole={['ESSENSGRUPPE_MITGLIED', 'ADMIN']}>
                <MinecraftPage />
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

      {showLayout && <MobileBottomNav />}
      {showLayout && <Footer />}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <GuestProvider>
          <SocketProvider>
            <AppContent />
          </SocketProvider>
        </GuestProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
