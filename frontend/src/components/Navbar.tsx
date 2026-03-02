import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
export const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { toggleChat, unreadChatCount, chatOpen } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsProfileOpen(false);
  };

  const isMember = user?.role === 'ESSENSGRUPPE_MITGLIED' || user?.role === 'ADMIN';
  const navLinks = isAuthenticated ? [
    { name: 'Forum', path: '/forum' },
    { name: 'ABI 27', path: '/events' },
    { name: 'Links', path: '/links' },
    ...(isMember ? [{ name: 'MC', path: '/mc' }] : []),
    { name: 'Games', path: '/games' },
    { name: 'About Us', path: '/about' },
  ] : [];

  return (
    <nav className="bg-[#0d1420] border-b border-white/[0.06] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-primary-400">Essensgruppe</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                  location.pathname === link.path
                    ? 'text-primary-400 bg-white/[0.08]'
                    : 'text-white/70 hover:text-primary-400 hover:bg-white/[0.06]'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                {/* Available balance (balance minus active prediction reservations) */}
                <div className="hidden md:flex items-center space-x-2 px-4 py-2 bg-yellow-400/[0.12] rounded-lg" title={user?.reserved ? `${user.balance} total · ${user.reserved} reserved` : undefined}>
                  <span className="text-yellow-400 font-bold">{(user?.balance ?? 0) - (user?.reserved ?? 0)}</span>
                  <span className="text-sm text-white/50">coins</span>
                  {(user?.reserved ?? 0) > 0 && (
                    <span className="text-xs text-orange-400 font-medium">({user!.reserved} reserved)</span>
                  )}
                </div>

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-primary-600 flex items-center justify-center text-white font-medium">
                      {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        user?.username.charAt(0).toUpperCase()
                      )}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isProfileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute right-0 mt-2 w-48 bg-[#111827] rounded-lg shadow-lg py-2 border border-white/[0.08]"
                      >
                        <div className="px-4 py-2 border-b border-white/[0.06]">
                          <p className="font-medium text-white">{user?.username}</p>
                          <p className="text-sm text-white/40">{user?.role}</p>
                        </div>
                        <Link
                          to="/profile"
                          onClick={() => setIsProfileOpen(false)}
                          className="block px-4 py-2 text-white/70 hover:bg-white/[0.06]"
                        >
                          Profile
                        </Link>
                        {user?.role === 'ADMIN' && (
                          <Link
                            to="/admin"
                            onClick={() => setIsProfileOpen(false)}
                            className="block px-4 py-2 text-white/70 hover:bg-white/[0.06]"
                          >
                            Admin Panel
                          </Link>
                        )}
                        <button
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-red-400 hover:bg-white/[0.06]"
                        >
                          Logout
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              location.pathname !== '/login' && (
                <Link
                  to="/login"
                  className="btn btn-primary"
                >
                  Ich bin Teil der Essensgruppe
                </Link>
              )
            )}

            {/* Chat button — visible for all authenticated users */}
            {isAuthenticated && (
              <button
                onClick={toggleChat}
                className={`relative p-2 rounded-lg transition-colors ${chatOpen ? 'bg-indigo-600/20 text-indigo-400' : 'hover:bg-white/[0.06] text-white/70'}`}
                aria-label="Chat öffnen"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                </svg>
                {!chatOpen && unreadChatCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-white/[0.06] text-white/70"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden pb-4"
            >
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block px-4 py-2 rounded-lg ${
                    location.pathname === link.path
                      ? 'text-primary-400 bg-white/[0.08]'
                      : 'text-white/70 hover:bg-white/[0.06]'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
              {isAuthenticated && (
                <div className="px-4 py-2 mt-2 border-t border-white/[0.06]">
                  <p className="text-sm text-white/50">Available: <span className="font-bold text-yellow-400">{(user?.balance ?? 0) - (user?.reserved ?? 0)}</span> coins{(user?.reserved ?? 0) > 0 && <span className="text-xs text-orange-400"> ({user!.reserved} reserved)</span>}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};
