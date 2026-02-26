import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { ApiService } from '../services/api.service';
import { Announcement } from '../types';

const SERVER_IP = 'Mc.essensgruppe.com';
const BLUEMAP_URL = 'https://essensgruppe.de/bluemap';
const DISCORD_URL = 'https://discord.gg/X5nzxXZU';

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'gerade eben';
  if (diff < 3600) return `vor ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)}h`;
  return `vor ${Math.floor(diff / 86400)}d`;
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
          ? 'bg-green-500/80 text-white'
          : 'bg-white/10 text-white/80 hover:bg-white/20'
      }`}
    >
      {copied ? '✓ Kopiert!' : 'IP kopieren'}
    </button>
  );
}

// ─── Glass Card ──────────────────────────────────────────────────────────────

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-black/40 backdrop-blur-md border border-white/10 rounded-xl ${className}`}>
      {children}
    </div>
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
      setError('Titel und Inhalt sind erforderlich.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const ann = await ApiService.createAnnouncement({ title: title.trim(), content: content.trim() }) as Announcement;
      onCreated(ann);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ankündigung konnte nicht gepostet werden.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gray-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Neue Ankündigung</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Titel</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={200}
              placeholder="Ankündigungstitel..."
              className="w-full border border-gray-600 bg-gray-800 text-white placeholder-gray-500 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Inhalt</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              maxLength={5000}
              rows={4}
              placeholder="Was gibt es Neues?"
              className="w-full border border-gray-600 bg-gray-800 text-white placeholder-gray-500 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-800">Abbrechen</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
              {loading ? 'Wird gepostet...' : 'Posten'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const RULES = [
  'Kein Xray',
  'Kein Hacking',
  'Nicht absichtlich crashen',
  'Griefing erlaubt',
  'Regelverstöße melden',
  'Discord beitreten',
];

const HOW_TO_JOIN = [
  { step: '1', text: 'Minecraft Java Edition herunterladen (erforderlich).' },
  { step: '2', text: 'Minecraft öffnen → Multiplayer → Server hinzufügen.' },
  { step: '3', text: `Server-IP eingeben: ${SERVER_IP}` },
  { step: '4', text: 'Auf „Server beitreten" klicken — du bist dabei!' },
  { step: '5', text: 'Admin fragen, wenn du nicht weiterkommst oder einen Whitelist-Platz brauchst.' },
];

export const MinecraftPage = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [annLoading, setAnnLoading] = useState(true);
  const [showCreateAnn, setShowCreateAnn] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);

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

  const checkServerStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/mc/status');
      const data = await res.json();
      setServerOnline(data.online);
    } catch {
      setServerOnline(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchAnnouncements, checkServerStatus]);

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
    <div
      className="min-h-screen"
      style={{
        backgroundImage: 'url(/MCbanner.jpeg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Dark overlay over entire page */}
      <div className="min-h-screen bg-black/65">

        {/* Hero */}
        <div className="text-center px-4 py-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white/90">Essensgruppe MC</h1>

            {/* Server IP */}
            <div className="inline-flex items-center gap-3 bg-black/30 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/10">
              <span className="text-sm text-white/50 font-mono">Server IP:</span>
              <span className="font-mono text-white/90 font-semibold text-lg">{SERVER_IP}</span>
              <CopyButton text={SERVER_IP} />
            </div>

            {/* Status indicator */}
            <div className="flex items-center justify-center gap-2 mt-4">
              {serverOnline === null ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-400 animate-pulse" />
                  <span className="text-sm text-white/50">Wird geprüft...</span>
                </>
              ) : serverOnline ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-sm text-green-300/80">Server Online</span>
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="text-sm text-red-300/80">Server Offline</span>
                </>
              )}
            </div>
          </motion.div>
        </div>

        <div className="max-w-5xl mx-auto px-4 pb-10 space-y-8">

          {/* BlueMap */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h2 className="text-xl font-bold text-white/80 mb-3">Live Map</h2>
            <GlassCard className="overflow-hidden">
              <iframe
                src={BLUEMAP_URL}
                className="w-full"
                style={{ height: '480px', border: 'none' }}
                title="BlueMap — Live Minecraft World Map"
                loading="lazy"
              />
            </GlassCard>
            <p className="text-xs text-white/30 mt-2 text-center">Powered by BlueMap · Aktualisiert alle paar Minuten</p>
          </motion.section>

          {/* Announcements */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-white/80">Ankündigungen</h2>
              {isAdmin && (
                <button
                  onClick={() => setShowCreateAnn(true)}
                  className="px-4 py-2 bg-primary-600/80 backdrop-blur-sm text-white rounded-lg hover:bg-primary-600 text-sm font-medium border border-primary-500/30"
                >
                  + Posten
                </button>
              )}
            </div>

            {annLoading ? (
              <p className="text-white/40 text-sm">Wird geladen...</p>
            ) : announcements.length === 0 ? (
              <GlassCard className="p-6 text-center text-white/30 text-sm">
                Noch keine Ankündigungen.
              </GlassCard>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {announcements.map(ann => (
                    <motion.div
                      key={ann.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                    >
                      <GlassCard className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-white/90">{ann.title}</h3>
                            <p className="text-sm text-white/60 mt-1 whitespace-pre-wrap">{ann.content}</p>
                            <p className="text-xs text-white/30 mt-2">von {ann.user.username} · {timeAgo(ann.createdAt)}</p>
                          </div>
                          {isAdmin && (
                            <div>
                              {deleteConfirm === ann.id ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-white/40">Sicher?</span>
                                  <button onClick={() => handleDeleteAnn(ann.id)} className="text-xs px-2 py-1 bg-red-600/80 text-white rounded hover:bg-red-600">Ja</button>
                                  <button onClick={() => setDeleteConfirm(null)} className="text-xs px-2 py-1 bg-white/10 text-white/60 rounded hover:bg-white/20">Nein</button>
                                </div>
                              ) : (
                                <button onClick={() => setDeleteConfirm(ann.id)} className="text-xs px-2 py-1 bg-red-900/40 text-red-300 rounded hover:bg-red-900/60">Löschen</button>
                              )}
                            </div>
                          )}
                        </div>
                      </GlassCard>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.section>

          {/* How to Join + Rules side by side */}
          <div className="grid md:grid-cols-2 gap-6">
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <h2 className="text-xl font-bold text-white/80 mb-3">So beitreten</h2>
              <GlassCard className="p-5 space-y-3">
                {HOW_TO_JOIN.map(item => (
                  <div key={item.step} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary-600/40 text-primary-300 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {item.step}
                    </span>
                    <p className="text-sm text-white/70">{item.text}</p>
                  </div>
                ))}
              </GlassCard>
            </motion.section>

            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <h2 className="text-xl font-bold text-white/80 mb-3">Server-Regeln</h2>
              <GlassCard className="p-5 space-y-2.5">
                {RULES.map((rule, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="text-primary-400/70 font-bold text-sm flex-shrink-0 mt-0.5">{i + 1}.</span>
                    <p className="text-sm text-white/70">{rule}</p>
                  </div>
                ))}
                <div className="pt-3 border-t border-white/10">
                  <a
                    href={DISCORD_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600/70 backdrop-blur-sm text-white text-sm font-medium rounded-lg hover:bg-indigo-600 transition-colors border border-indigo-500/30"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026c.462-.62.874-1.275 1.226-1.963.021-.04.001-.088-.041-.104a13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028z"/>
                    </svg>
                    Discord beitreten
                  </a>
                </div>
              </GlassCard>
            </motion.section>
          </div>

          {/* Leaderboard placeholder */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h2 className="text-xl font-bold text-white/80 mb-3">Bestenliste</h2>
            <GlassCard className="p-8 text-center">
              <div className="text-4xl mb-2">🏅</div>
              <p className="font-medium text-white/50">Bestenliste kommt bald</p>
              <p className="text-sm text-white/30 mt-1">Datenquelle noch offen — Spielzeit & Erfolge erscheinen hier.</p>
            </GlassCard>
          </motion.section>
        </div>
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
