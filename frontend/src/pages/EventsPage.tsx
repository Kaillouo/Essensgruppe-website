import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { ApiService } from '../services/api.service';
import { Event, EventPhoto } from '../types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'TBD';
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatBudget(budget: number | null): string {
  if (budget === null) return 'TBD';
  return `${budget.toLocaleString('de-DE')} €`;
}

// ─── Photo Carousel ───────────────────────────────────────────────────────────

interface PhotoCarouselProps {
  eventId: string;
  photos: EventPhoto[];
  currentUserId: string;
  isAdmin: boolean;
  canUpload: boolean;
  onPhotosChange: (eventId: string, photos: EventPhoto[]) => void;
}

function PhotoCarousel({ eventId, photos, currentUserId, isAdmin, canUpload, onPhotosChange }: PhotoCarouselProps) {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clampedIndex = Math.min(index, Math.max(0, photos.length - 1));

  const prev = () => setIndex(i => Math.max(0, i - 1));
  const next = () => setIndex(i => Math.min(photos.length - 1, i + 1));

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    try {
      const newPhoto = await ApiService.uploadEventPhoto(eventId, file) as EventPhoto;
      const updated = [...photos, newPhoto];
      onPhotosChange(eventId, updated);
      setIndex(updated.length - 1);
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photoId: string) => {
    try {
      await ApiService.deleteEventPhoto(eventId, photoId);
      const updated = photos.filter(p => p.id !== photoId);
      onPhotosChange(eventId, updated);
      setIndex(i => Math.min(i, Math.max(0, updated.length - 1)));
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const currentPhoto = photos[clampedIndex];
  const canDeleteCurrent = currentPhoto && (isAdmin || currentPhoto.userId === currentUserId);

  if (photos.length === 0) {
    if (!canUpload) return null;
    return (
      <div className="mt-3 pt-3 border-t border-white/[0.06]">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="text-xs px-2 py-1 rounded bg-white/[0.06] text-white/50 hover:bg-white/10 disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : '📷 Add Photo'}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-white/[0.06]">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {/* Carousel */}
      <div className="relative rounded-lg overflow-hidden bg-black/40" style={{ height: 220 }}>
        {/* Image */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.img
            key={currentPhoto.id}
            src={currentPhoto.imageUrl}
            alt="Event photo"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full object-cover cursor-pointer"
            onClick={() => setLightbox(true)}
          />
        </AnimatePresence>

        {/* Arrows */}
        {photos.length > 1 && (
          <>
            <button
              onClick={prev}
              disabled={clampedIndex === 0}
              className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center disabled:opacity-20 hover:bg-black/60 text-xs"
            >
              ‹
            </button>
            <button
              onClick={next}
              disabled={clampedIndex === photos.length - 1}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center disabled:opacity-20 hover:bg-black/60 text-xs"
            >
              ›
            </button>
          </>
        )}

        {/* Action buttons overlay (bottom-right) */}
        {canUpload && (
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            {canDeleteCurrent && !confirmDeleteId && (
              <button
                onClick={() => setConfirmDeleteId(currentPhoto.id)}
                className="w-6 h-6 rounded-full bg-red-600/80 text-white text-xs flex items-center justify-center hover:bg-red-700"
                title="Delete photo"
              >
                ×
              </button>
            )}
            {confirmDeleteId === currentPhoto.id && (
              <div className="flex items-center gap-1 bg-black/60 rounded-full px-2 py-0.5">
                <span className="text-white text-xs">Delete?</span>
                <button onClick={() => handleDelete(currentPhoto.id)} className="text-red-300 hover:text-red-200 text-xs font-bold">Yes</button>
                <button onClick={() => setConfirmDeleteId(null)} className="text-gray-300 hover:text-white text-xs">No</button>
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Add photo"
              className="w-6 h-6 rounded-full bg-black/40 text-white text-xs flex items-center justify-center hover:bg-black/60 disabled:opacity-50"
            >
              {uploading ? '…' : '+'}
            </button>
          </div>
        )}
      </div>

      {/* Dots */}
      {photos.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${i === clampedIndex ? 'bg-primary-600' : 'bg-gray-300'}`}
            />
          ))}
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightbox(false)}
          >
            <button
              className="absolute top-4 right-4 text-white text-2xl w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
              onClick={() => setLightbox(false)}
            >
              ×
            </button>
            {photos.length > 1 && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); prev(); }}
                  disabled={clampedIndex === 0}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-3xl w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-20"
                >
                  ‹
                </button>
                <button
                  onClick={e => { e.stopPropagation(); next(); }}
                  disabled={clampedIndex === photos.length - 1}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-3xl w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-20"
                >
                  ›
                </button>
              </>
            )}
            <motion.img
              key={currentPhoto.id}
              src={currentPhoto.imageUrl}
              alt="Event photo"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-h-[90vh] max-w-full object-contain rounded-lg"
              onClick={e => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Create Modal ────────────────────────────────────────────────────────────

interface CreateModalProps {
  onClose: () => void;
  onCreated: (event: Event) => void;
}

function CreateModal({ onClose, onCreated }: CreateModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [visibility, setVisibility] = useState<'ALL' | 'ESSENSGRUPPE_ONLY'>('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const canSetVisibility = user?.role === 'ESSENSGRUPPE_MITGLIED' || user?.role === 'ADMIN';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data: any = {
        title: title.trim(),
        description: description.trim(),
        date: date ? new Date(date).toISOString() : null,
        location: location.trim() || null,
        budget: budget ? parseFloat(budget) : null,
        visibility,
      };
      const created = await ApiService.createEvent(data) as Event;
      onCreated(created);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit event.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{ background: 'rgba(10,14,26,0.97)', border: '1px solid rgba(255,255,255,0.08)' }}
        className="rounded-2xl shadow-2xl w-full max-w-lg p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Propose an Event</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/70 text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/55 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={200}
              placeholder="Event title..."
              className="w-full border border-white/10 bg-white/[0.04] text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500/50 placeholder-white/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/55 mb-1">Description *</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={5000}
              rows={4}
              placeholder="What's the event about? Why should we do it?"
              className="w-full border border-white/10 bg-white/[0.04] text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500/50 resize-none placeholder-white/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-white/55 mb-1">Date (optional)</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full border border-white/10 bg-white/[0.04] text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500/50 [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/55 mb-1">Budget in € (optional)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={budget}
                onChange={e => setBudget(e.target.value)}
                placeholder="0.00"
                className="w-full border border-white/10 bg-white/[0.04] text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500/50 placeholder-white/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/55 mb-1">Location (optional)</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              maxLength={200}
              placeholder="Where would this take place?"
              className="w-full border border-white/10 bg-white/[0.04] text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500/50 placeholder-white/20"
            />
          </div>

          {canSetVisibility && (
            <div>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 600, marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Sichtbarkeit</label>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.10)', overflow: 'hidden' }}>
                <button type="button" onClick={() => setVisibility('ALL')} style={{ flex: 1, padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: visibility === 'ALL' ? 'rgba(99,102,241,0.30)' : 'transparent', color: visibility === 'ALL' ? '#c4b5fd' : 'rgba(255,255,255,0.35)', border: 'none', borderRight: '1px solid rgba(255,255,255,0.08)', transition: 'all 0.15s', fontFamily: 'inherit' }}>Alle</button>
                <button type="button" onClick={() => setVisibility('ESSENSGRUPPE_ONLY')} style={{ flex: 1, padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: visibility === 'ESSENSGRUPPE_ONLY' ? 'rgba(99,102,241,0.30)' : 'transparent', color: visibility === 'ESSENSGRUPPE_ONLY' ? '#c4b5fd' : 'rgba(255,255,255,0.35)', border: 'none', transition: 'all 0.15s', fontFamily: 'inherit' }}>Nur Essensgruppe</button>
              </div>
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-white/10 rounded-lg text-white/60 hover:bg-white/[0.04]">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
              {loading ? 'Submitting...' : 'Submit Proposal'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Status Change Modal (Admin) ─────────────────────────────────────────────

interface StatusModalProps {
  event: Event;
  onClose: () => void;
  onUpdated: (eventId: string, status: Event['status']) => void;
}

function StatusModal({ event, onClose, onUpdated }: StatusModalProps) {
  const [loading, setLoading] = useState(false);

  const handleStatus = async (status: Event['status']) => {
    setLoading(true);
    try {
      await ApiService.updateEventStatus(event.id, status);
      onUpdated(event.id, status);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const statusOptions: { label: string; value: Event['status']; color: string }[] = [
    { label: 'Proposed', value: 'PROPOSED', color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' },
    { label: 'In Planning', value: 'IN_PLANNING', color: 'bg-blue-100 text-blue-800 hover:bg-blue-200' },
    { label: 'Completed', value: 'COMPLETED', color: 'bg-green-100 text-green-800 hover:bg-green-200' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
      >
        <h2 className="text-lg font-bold text-gray-900 mb-2">Move Event</h2>
        <p className="text-sm text-gray-500 mb-4">"{event.title}"</p>
        <div className="space-y-2">
          {statusOptions.map(opt => (
            <button
              key={opt.value}
              disabled={loading || event.status === opt.value}
              onClick={() => handleStatus(opt.value)}
              className={`w-full px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${opt.color} disabled:opacity-40`}
            >
              {event.status === opt.value ? `✓ Currently: ${opt.label}` : opt.label}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="mt-4 w-full px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 text-sm">
          Cancel
        </button>
      </motion.div>
    </div>
  );
}

// ─── Event Card ───────────────────────────────────────────────────────────────

interface EventCardProps {
  event: Event;
  isAdmin: boolean;
  isAuthenticated: boolean;
  currentUserId: string;
  onVote: (eventId: string, value: 1 | -1) => void;
  onDelete: (eventId: string) => void;
  onStatusChange: (event: Event) => void;
  onPhotosChange: (eventId: string, photos: EventPhoto[]) => void;
}

function EventCard({ event, isAdmin, isAuthenticated, currentUserId, onVote, onDelete, onStatusChange, onPhotosChange }: EventCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const statusColors: Record<Event['status'], string> = {
    PROPOSED: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    IN_PLANNING: 'bg-blue-100 text-blue-700 border-blue-200',
    COMPLETED: 'bg-green-100 text-green-700 border-green-200',
  };

  const statusLabels: Record<Event['status'], string> = {
    PROPOSED: 'Proposed',
    IN_PLANNING: 'In Planning',
    COMPLETED: 'Completed',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
      className="rounded-xl p-5 hover:bg-white/[0.06] transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColors[event.status]}`}>
              {statusLabels[event.status]}
            </span>
            {event.visibility === 'ESSENSGRUPPE_ONLY' && (
              <span style={{ fontSize: 11, background: '#4a1a6b', color: '#d4a0ff', padding: '2px 6px', borderRadius: 4 }}>Nur EG</span>
            )}
            {event.date && (
              <span className="text-xs text-white/40">📅 {formatDate(event.date)}</span>
            )}
          </div>
          <h3 className="text-base font-semibold text-white leading-snug">{event.title}</h3>
          <p className="text-sm text-white/55 mt-1 line-clamp-3">{event.description}</p>

          <div className="flex items-center gap-4 mt-3 text-xs text-white/35 flex-wrap">
            {event.location && <span>📍 {event.location}</span>}
            {event.budget !== null && <span>💰 {formatBudget(event.budget)}</span>}
            <span>by {event.user.username} · {timeAgo(event.createdAt)}</span>
          </div>
        </div>

        {/* Vote column — only for PROPOSED */}
        {event.status === 'PROPOSED' && (
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => onVote(event.id, 1)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    event.userVote === 1 ? 'bg-green-500 text-white' : 'text-white/30 hover:bg-green-500/10 hover:text-green-400'
                  }`}
                  title="Upvote"
                >
                  ▲
                </button>
                <span className={`text-sm font-bold ${event.votes > 0 ? 'text-green-400' : event.votes < 0 ? 'text-red-400' : 'text-white/40'}`}>
                  {event.votes}
                </span>
                <button
                  onClick={() => onVote(event.id, -1)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    event.userVote === -1 ? 'bg-red-500 text-white' : 'text-white/30 hover:bg-red-500/10 hover:text-red-400'
                  }`}
                  title="Downvote"
                >
                  ▼
                </button>
              </>
            ) : (
              <span className={`text-sm font-bold ${event.votes > 0 ? 'text-green-400' : event.votes < 0 ? 'text-red-400' : 'text-white/40'}`}>
                {event.votes}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Photo carousel */}
      <PhotoCarousel
        eventId={event.id}
        photos={event.photos}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        canUpload={isAuthenticated}
        onPhotosChange={onPhotosChange}
      />

      {/* Admin / creator actions */}
      {(isAdmin || event.user.id === currentUserId) && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.06]">
          {isAdmin && (
            <button
              onClick={() => onStatusChange(event)}
              className="text-xs px-2 py-1 rounded bg-white/[0.06] text-white/50 hover:bg-white/10"
            >
              Move Status
            </button>
          )}
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20"
            >
              Delete
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">Sure?</span>
              <button onClick={() => onDelete(event.id)} className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700">Yes</button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200">No</button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  icon: string;
  events: Event[];
  isAdmin: boolean;
  isAuthenticated: boolean;
  currentUserId: string;
  onVote: (eventId: string, value: 1 | -1) => void;
  onDelete: (eventId: string) => void;
  onStatusChange: (event: Event) => void;
  onPhotosChange: (eventId: string, photos: EventPhoto[]) => void;
  emptyText: string;
}

function Section({ title, icon, events, isAdmin, isAuthenticated, currentUserId, onVote, onDelete, onStatusChange, onPhotosChange, emptyText }: SectionProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{icon}</span>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <span className="ml-1 text-sm font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{events.length}</span>
      </div>
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {events.length === 0 ? (
            <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-gray-400 italic">
              {emptyText}
            </motion.p>
          ) : (
            events.map(event => (
              <EventCard
                key={event.id}
                event={event}
                isAdmin={isAdmin}
                isAuthenticated={isAuthenticated}
                currentUserId={currentUserId}
                onVote={onVote}
                onDelete={onDelete}
                onStatusChange={onStatusChange}
                onPhotosChange={onPhotosChange}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Abi Zeitung Form ────────────────────────────────────────────────────────

const MAX_CHARS = 4000;

function AbiZeitungForm() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Titel und Inhalt sind pflicht.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await fetch('/api/abi/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ title: title.trim(), content: content.trim() }),
      });
      setSuccess(true);
      setTitle('');
      setContent('');
      setTimeout(() => { setSuccess(false); }, 3000);
    } catch {
      setError('Fehler beim Senden. Bitte erneut versuchen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 pt-8 border-t border-white/[0.06]">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">📰</span>
        <h2 className="text-xl font-bold text-white">Abi Zeitung – Anonymer Beitrag</h2>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }} className="rounded-xl p-5">
        <p className="text-xs text-white/40 mb-4">
          Dein Beitrag wird anonym gespeichert — kein Name, keine Zuordnung.
          Er wird nur für das Abi-Magazin genutzt und ist nur für Admins sichtbar.
        </p>
        {success ? (
          <div className="text-green-400 font-medium text-sm py-4 text-center">
            ✓ Beitrag anonym eingereicht!
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={200}
              placeholder="Titel des Beitrags..."
              className="w-full border border-white/10 bg-white/[0.04] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500/50 placeholder-white/20"
            />
            <div>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                maxLength={MAX_CHARS}
                rows={6}
                placeholder="Dein Beitrag... (max. 4000 Zeichen)"
                className="w-full border border-white/10 bg-white/[0.04] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500/50 resize-none placeholder-white/20"
              />
              <p className="text-xs text-white/30 text-right">{content.length} / {MAX_CHARS}</p>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-white/10 text-white/80 rounded-lg hover:bg-white/15 text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Wird gesendet...' : 'Anonym einreichen'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export const EventsPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [statusTarget, setStatusTarget] = useState<Event | null>(null);
  const [activeTab, setActiveTab] = useState<'PROPOSED' | 'IN_PLANNING' | 'COMPLETED'>('PROPOSED');

  const isAdmin = user?.role === 'ADMIN';

  const fetchEvents = useCallback(async () => {
    try {
      const data = await ApiService.getEvents() as Event[];
      setEvents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleVote = async (eventId: string, value: 1 | -1) => {
    try {
      const result = await ApiService.voteEvent(eventId, value) as { votes: number; userVote: number };
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, votes: result.votes, userVote: result.userVote } : e));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (eventId: string) => {
    try {
      await ApiService.deleteEvent(eventId);
      setEvents(prev => prev.filter(e => e.id !== eventId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusUpdated = (eventId: string, status: Event['status']) => {
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status } : e));
  };

  const handlePhotosChange = (eventId: string, photos: EventPhoto[]) => {
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, photos } : e));
  };

  const proposed = events.filter(e => e.status === 'PROPOSED').sort((a, b) => b.votes - a.votes);
  const inPlanning = events.filter(e => e.status === 'IN_PLANNING');
  const completed = events.filter(e => e.status === 'COMPLETED');

  const tabs = [
    { key: 'PROPOSED' as const, label: 'Proposed', icon: '💡', count: proposed.length },
    { key: 'IN_PLANNING' as const, label: 'In Planning', icon: '🗓️', count: inPlanning.length },
    { key: 'COMPLETED' as const, label: 'Completed', icon: '✅', count: completed.length },
  ];

  const tabEvents = { PROPOSED: proposed, IN_PLANNING: inPlanning, COMPLETED: completed };
  const tabEmptyText = {
    PROPOSED: 'No proposals yet. Be the first to suggest something!',
    IN_PLANNING: 'No events currently in planning.',
    COMPLETED: 'No completed events yet.',
  };
  const tabIcons = { PROPOSED: '💡', IN_PLANNING: '🗓️', COMPLETED: '✅' };
  const tabTitles = { PROPOSED: 'Proposed Events', IN_PLANNING: 'In Planning', COMPLETED: 'Completed' };

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      {/* Camping hero banner */}
      <div
        className="relative h-40 flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: 'url(/camping.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 text-center text-white px-4">
          <h1 className="text-4xl font-bold drop-shadow-lg">ABI 27 Events</h1>
          <p className="text-gray-200 mt-1 text-sm">Plan, vote, and celebrate together</p>
        </div>
      </div>

      <div className="py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header row */}
          {isAuthenticated && (
            <div className="flex items-center justify-end mb-6">
              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium text-sm"
              >
                + Propose Event
              </button>
            </div>
          )}

          {/* Social links strip */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-4 mb-6 flex items-center gap-4 flex-wrap">
            <span className="text-white font-medium text-sm">Follow the journey:</span>
            <a href="https://gofund.me/6c2bc4e83" target="_blank" rel="noopener noreferrer"
              className="text-white/90 hover:text-white text-sm underline underline-offset-2">GoFundMe</a>
            <a href="https://instagram.com/thg_abi27" target="_blank" rel="noopener noreferrer"
              className="text-white/90 hover:text-white text-sm underline underline-offset-2">Instagram</a>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 rounded-xl p-1 mb-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.key ? 'bg-primary-600/30 text-primary-300' : 'bg-white/10 text-white/40'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          {loading ? (
            <div className="text-center py-16 text-gray-400">Loading events...</div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
              >
                <Section
                  title={tabTitles[activeTab]}
                  icon={tabIcons[activeTab]}
                  events={tabEvents[activeTab]}
                  isAdmin={isAdmin}
                  isAuthenticated={isAuthenticated}
                  currentUserId={user?.id ?? ''}
                  onVote={handleVote}
                  onDelete={handleDelete}
                  onStatusChange={setStatusTarget}
                  onPhotosChange={handlePhotosChange}
                  emptyText={tabEmptyText[activeTab]}
                />
              </motion.div>
            </AnimatePresence>
          )}
          {/* Abi Zeitung Anonymous Submission — members only */}
          {isAuthenticated && <AbiZeitungForm />}

        </motion.div>
      </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreate && (
          <CreateModal
            onClose={() => setShowCreate(false)}
            onCreated={event => setEvents(prev => [event, ...prev])}
          />
        )}
        {statusTarget && (
          <StatusModal
            event={statusTarget}
            onClose={() => setStatusTarget(null)}
            onUpdated={handleStatusUpdated}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
