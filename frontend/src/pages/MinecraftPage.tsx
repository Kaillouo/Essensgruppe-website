import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { ApiService } from '../services/api.service';
import { Announcement } from '../types';

const SERVER_IP = 'play.essensgruppe.de'; // Update with real IP/domain
const BLUEMAP_URL = 'http://localhost:8100'; // Will be replaced with OCI IP in production

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Copy Button ─────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
        copied
          ? 'bg-green-500 text-white'
          : 'bg-white/20 text-white hover:bg-white/30'
      }`}
    >
      {copied ? '✓ Copied!' : 'Copy IP'}
    </button>
  );
}

// ─── Create Announcement Modal ────────────────────────────────────────────────

interface CreateAnnModalProps {
  onClose: () => void;
  onCreated: (ann: Announcement) => void;
}

function CreateAnnModal({ onClose, onCreated }: CreateAnnModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const ann = await ApiService.createAnnouncement({ title: title.trim(), content: content.trim() }) as Announcement;
      onCreated(ann);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to post announcement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">New Announcement</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={200}
              placeholder="Announcement title..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              maxLength={5000}
              rows={4}
              placeholder="What's the announcement?"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
              {loading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const RULES = [
  'Respect all players — no griefing, no harassment.',
  'No cheating, hacks, or unfair mods.',
  'Keep the world tidy — clean up failed builds.',
  'Ask before building near someone else\'s base.',
  'No redstone contraptions that cause lag.',
  'Report bugs to an admin instead of exploiting them.',
  'Have fun and help newcomers!',
];

const HOW_TO_JOIN = [
  { step: '1', text: 'Download Minecraft Java Edition (required).' },
  { step: '2', text: `Open Minecraft → Multiplayer → Add Server.` },
  { step: '3', text: `Enter the server IP: ${SERVER_IP}` },
  { step: '4', text: 'Click "Join Server" — you\'re in!' },
  { step: '5', text: 'Ask an admin if you get stuck or need a whitelist spot.' },
];

export const MinecraftPage = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [annLoading, setAnnLoading] = useState(true);
  const [showCreateAnn, setShowCreateAnn] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  const fetchAnnouncements = useCallback(async () => {
    try {
      const data = await ApiService.getAnnouncements() as Announcement[];
      setAnnouncements(data);
    } catch (err) {
      console.error(err);
    } finally {
      setAnnLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const handleDeleteAnn = async (id: string) => {
    try {
      await ApiService.deleteAnnouncement(id);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-green-700 via-green-800 to-gray-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-14">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="text-6xl mb-4">⛏️</div>
            <h1 className="text-4xl font-bold mb-2">Essensgruppe MC</h1>
            <p className="text-green-200 text-lg mb-8">Our private Minecraft server — build, explore, survive together.</p>

            {/* Server IP */}
            <div className="inline-flex items-center gap-3 bg-black/30 rounded-xl px-5 py-3 border border-white/10">
              <span className="text-sm text-green-300 font-mono">Server IP:</span>
              <span className="font-mono text-white font-semibold text-lg">{SERVER_IP}</span>
              <CopyButton text={SERVER_IP} />
            </div>

            {/* Status indicator (static for now) */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-green-300">Server Online</span>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        {/* BlueMap */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🗺️ Live Map</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <iframe
              src={BLUEMAP_URL}
              className="w-full"
              style={{ height: '480px', border: 'none' }}
              title="BlueMap — Live Minecraft World Map"
              loading="lazy"
            />
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">Powered by BlueMap · Updates every few minutes</p>
        </motion.section>

        {/* Announcements */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">📢 Announcements</h2>
            {isAdmin && (
              <button
                onClick={() => setShowCreateAnn(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
              >
                + Post Announcement
              </button>
            )}
          </div>

          {annLoading ? (
            <p className="text-gray-400 text-sm">Loading...</p>
          ) : announcements.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-400 text-sm">
              No announcements yet.
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {announcements.map(ann => (
                  <motion.div
                    key={ann.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    className="bg-white rounded-xl border border-gray-200 p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{ann.title}</h3>
                        <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{ann.content}</p>
                        <p className="text-xs text-gray-400 mt-2">by {ann.user.username} · {timeAgo(ann.createdAt)}</p>
                      </div>
                      {isAdmin && (
                        <div>
                          {deleteConfirm === ann.id ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">Sure?</span>
                              <button onClick={() => handleDeleteAnn(ann.id)} className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700">Yes</button>
                              <button onClick={() => setDeleteConfirm(null)} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">No</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirm(ann.id)} className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100">Delete</button>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.section>

        {/* How to Join + Rules side by side */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* How to Join */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="text-xl font-bold text-gray-900 mb-4">🚪 How to Join</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              {HOW_TO_JOIN.map(item => (
                <div key={item.step} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {item.step}
                  </span>
                  <p className="text-sm text-gray-700">{item.text}</p>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Rules */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <h2 className="text-xl font-bold text-gray-900 mb-4">📋 Server Rules</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2.5">
              {RULES.map((rule, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="text-primary-500 font-bold text-sm flex-shrink-0 mt-0.5">·</span>
                  <p className="text-sm text-gray-700">{rule}</p>
                </div>
              ))}
            </div>
          </motion.section>
        </div>

        {/* Leaderboard placeholder */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🏆 Leaderboard</h2>
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
            <div className="text-4xl mb-2">🏅</div>
            <p className="font-medium text-gray-500">Leaderboard coming soon</p>
            <p className="text-sm mt-1">Data source TBD — playtime & achievements will appear here.</p>
          </div>
        </motion.section>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreateAnn && (
          <CreateAnnModal
            onClose={() => setShowCreateAnn(false)}
            onCreated={ann => setAnnouncements(prev => [ann, ...prev])}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
