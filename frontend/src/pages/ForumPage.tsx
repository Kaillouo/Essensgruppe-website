import { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ApiService } from '../services/api.service';
import { Post } from '../types';
import { useAuth } from '../contexts/AuthContext';

type SortMode = 'new' | 'hot' | 'top';

// ── Physics constants ─────────────────────────────────────────────────────────
const REPULSION   = 200;   // bubble-bubble push strength (soft)
const B_DAMP      = 0.78;  // bubble velocity decay (high = stays where dropped)
const SAT_K       = 0.032; // satellite spring stiffness
const SAT_DAMP    = 0.88;  // satellite velocity decay
const SAT_R       = 5;     // satellite node radius px
const MIN_GAP     = 36;    // extra separation threshold for repulsion
const CENTER_K    = 0.0018; // weak spring pulling bubbles toward canvas center
const MAX_FORCE   = 8;     // velocity cap per frame to prevent overlap blow-up

// ── Seeded RNG ────────────────────────────────────────────────────────────────
function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// ── Themes ────────────────────────────────────────────────────────────────────
const THEMES = [
  { bg: 'rgba(99,102,241,0.14)',  border: 'rgba(99,102,241,0.75)',  glow: 'rgba(99,102,241,0.28)',  accent: '#a5b4fc', dot: '#6366f1' },
  { bg: 'rgba(6,182,212,0.14)',   border: 'rgba(6,182,212,0.75)',   glow: 'rgba(6,182,212,0.28)',   accent: '#67e8f9', dot: '#06b6d4' },
  { bg: 'rgba(16,185,129,0.14)',  border: 'rgba(16,185,129,0.75)',  glow: 'rgba(16,185,129,0.28)',  accent: '#6ee7b7', dot: '#10b981' },
  { bg: 'rgba(244,63,94,0.14)',   border: 'rgba(244,63,94,0.75)',   glow: 'rgba(244,63,94,0.28)',   accent: '#fda4af', dot: '#f43f5e' },
  { bg: 'rgba(245,158,11,0.14)',  border: 'rgba(245,158,11,0.75)',  glow: 'rgba(245,158,11,0.28)',  accent: '#fcd34d', dot: '#f59e0b' },
  { bg: 'rgba(168,85,247,0.14)',  border: 'rgba(168,85,247,0.75)',  glow: 'rgba(168,85,247,0.28)',  accent: '#d8b4fe', dot: '#a855f7' },
] as const;
type Theme = (typeof THEMES)[number];

function getRadius(post: Post): number {
  const a = Math.max(0, post.voteScore) + post.commentCount * 1.5;
  if (a >= 20) return 95; if (a >= 10) return 80; if (a >= 4) return 68; return 58;
}

// ── Layout (initial positions, stable per post ID) ────────────────────────────
interface BubbleLayout {
  post: Post; x: number; y: number; r: number; theme: Theme;
  enterDelay: number; numSats: number;
  floatAmp: number; floatFreq: number; floatPhase: number;
}

function computeLayout(posts: Post[], W: number, H: number): BubbleLayout[] {
  const result: BubbleLayout[] = [];
  const pad = 24;
  posts.forEach((post, i) => {
    const rand = mulberry32(hashStr(post.id));
    const r = getRadius(post);
    const theme = THEMES[hashStr(post.id + 'theme') % THEMES.length];
    const sw = Math.max(1, W - 2*r - 2*pad), sh = Math.max(1, H - 2*r - 2*pad);
    let x = pad + r + rand() * sw, y = pad + r + rand() * sh;
    for (let a = 0; a < 160; a++) {
      if (!result.some(p => { const dx=p.x-x,dy=p.y-y; return Math.sqrt(dx*dx+dy*dy)<p.r+r+28; })) break;
      x = pad + r + rand() * sw; y = pad + r + rand() * sh;
    }
    result.push({
      post, x, y, r, theme,
      enterDelay: i * 0.045,
      numSats: Math.min(post.commentCount, 6),
      floatAmp:   5 + rand() * 8,
      floatFreq:  0.28 + rand() * 0.28,
      floatPhase: rand() * Math.PI * 2,
    });
  });
  return result;
}

// ── Physics state types ───────────────────────────────────────────────────────
interface BubblePhys {
  id: string; x: number; y: number; vx: number; vy: number; r: number;
  isDragging: boolean;
  floatAmp: number; floatFreq: number; floatPhase: number;
}
interface SatPhys {
  bubbleId: string; idx: number;
  x: number; y: number; vx: number; vy: number; restLen: number;
}

// ── BubbleContent (pure visual, no positioning logic) ─────────────────────────
function BubbleContent({ post, r, theme }: { post: Post; r: number; theme: Theme }) {
  const isLarge = r > 70;
  return (
    <motion.div
      whileHover={{ scale: 1.08, boxShadow: `0 0 36px ${theme.glow}, 0 0 64px ${theme.glow}` }}
      style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: theme.bg, border: `2px solid ${theme.border}`,
        boxShadow: `0 0 18px ${theme.glow}`, backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: Math.round(r * 0.18), gap: 4,
        overflow: 'hidden', userSelect: 'none', pointerEvents: 'none',
      }}
    >
      <div style={{
        width: isLarge ? 28 : 22, height: isLarge ? 28 : 22,
        borderRadius: '50%', background: theme.dot, color: '#fff',
        fontSize: isLarge ? 12 : 9, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {post.user.username[0].toUpperCase()}
      </div>
      <p
        className={isLarge ? 'line-clamp-3' : 'line-clamp-2'}
        style={{
          margin: 0, fontSize: isLarge ? 11 : 9, fontWeight: 600,
          color: '#e2e8f0', lineHeight: 1.35, textAlign: 'center',
          wordBreak: 'break-word', maxWidth: '100%',
        }}
      >{post.title}</p>
      {r > 58 && (
        <div style={{ fontSize: 9, color: theme.accent, flexShrink: 0 }}>↑ {post.voteScore}</div>
      )}
      {post.visibility === 'ESSENSGRUPPE_ONLY' && (
        <div style={{ fontSize: 8, background: 'rgba(74,26,107,0.85)', color: '#d4a0ff', padding: '1px 5px', borderRadius: 4, flexShrink: 0 }}>Nur EG</div>
      )}
    </motion.div>
  );
}

// ── ForumPage ─────────────────────────────────────────────────────────────────
export const ForumPage = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasSizeRef = useRef({ w: window.innerWidth, h: Math.max(500, window.innerHeight - 128) });

  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sort, setSort] = useState<SortMode>('hot');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState('');

  // Imperative DOM refs
  const bubbleElRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const satElRefs    = useRef<Map<string, HTMLDivElement[]>>(new Map());
  const lineElRefs   = useRef<Map<string, SVGLineElement[]>>(new Map());

  // Physics state (never triggers re-render)
  const physicsRef = useRef<{ bubbles: BubblePhys[]; satellites: SatPhys[] }>({ bubbles: [], satellites: [] });
  const animFrameRef = useRef<number>(0);

  // Drag state
  const dragRef = useRef<{ id: string | null; ox: number; oy: number; moves: number }>({
    id: null, ox: 0, oy: 0, moves: 0,
  });

  // Viewport transform (zoom + pan)
  const viewportRef   = useRef<HTMLDivElement>(null);
  const viewTransRef  = useRef({ scale: 1, tx: 0, ty: 0 });
  const isPanningRef  = useRef(false);
  const panStartRef   = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  const applyViewport = useCallback(() => {
    const { scale, tx, ty } = viewTransRef.current;
    if (viewportRef.current)
      viewportRef.current.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`;
  }, []);

  const fitToScreen = useCallback(() => {
    const { w: W, h: H } = canvasSizeRef.current;
    const bubbles = physicsRef.current.bubbles;
    if (!bubbles.length) return;
    const pad = 64;
    const minX = Math.min(...bubbles.map(b => b.x - b.r));
    const maxX = Math.max(...bubbles.map(b => b.x + b.r));
    const minY = Math.min(...bubbles.map(b => b.y - b.r));
    const maxY = Math.max(...bubbles.map(b => b.y + b.r));
    const newScale = Math.min((W - pad*2) / (maxX - minX), (H - pad*2) / (maxY - minY), 1);
    viewTransRef.current = {
      scale: newScale,
      tx: (W - (minX + maxX) * newScale) / 2,
      ty: (H - (minY + maxY) * newScale) / 2,
    };
    applyViewport();
  }, [applyViewport]);

  const zoomBy = useCallback((factor: number) => {
    const { w: W, h: H } = canvasSizeRef.current;
    const { scale, tx, ty } = viewTransRef.current;
    const newScale = Math.max(0.15, Math.min(4, scale * factor));
    const cx = W / 2, cy = H / 2;
    viewTransRef.current = {
      scale: newScale,
      tx: cx - ((cx - tx) / scale) * newScale,
      ty: cy - ((cy - ty) / scale) * newScale,
    };
    applyViewport();
  }, [applyViewport]);

  // Wheel zoom (non-passive so we can preventDefault)
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const { scale, tx, ty } = viewTransRef.current;
      const factor = e.deltaY < 0 ? 1.1 : 0.91;
      const newScale = Math.max(0.15, Math.min(4, scale * factor));
      viewTransRef.current = {
        scale: newScale,
        tx: mx - ((mx - tx) / scale) * newScale,
        ty: my - ((my - ty) / scale) * newScale,
      };
      applyViewport();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [applyViewport]);

  // Auto-fit when posts load
  useEffect(() => {
    if (!posts.length) return;
    const t = setTimeout(fitToScreen, 120);
    return () => clearTimeout(t);
  }, [posts, fitToScreen]);

  // ── Resize observer ───────────────────────────────────────────────────────
  useEffect(() => {
    const ro = new ResizeObserver(() => {
      if (canvasRef.current) {
        const { width, height } = canvasRef.current.getBoundingClientRect();
        canvasSizeRef.current = { w: width, h: height };
      }
    });
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Load posts ────────────────────────────────────────────────────────────
  const loadPosts = useCallback(async () => {
    setIsLoading(true); setError('');
    try {
      setPosts((await ApiService.getPosts(sort, search || undefined)) as Post[]);
    } catch (err: any) { setError(err.message); }
    finally { setIsLoading(false); }
  }, [sort, search]);
  useEffect(() => { loadPosts(); }, [loadPosts]);

  // ── Layout (stable positions per post ID) ─────────────────────────────────
  const layout = useMemo(
    () => computeLayout(posts, canvasSizeRef.current.w, canvasSizeRef.current.h),
    [posts],
  );

  // ── Init physics whenever layout changes ──────────────────────────────────
  useLayoutEffect(() => {
    physicsRef.current = {
      bubbles: layout.map(b => ({
        id: b.post.id, x: b.x, y: b.y, vx: 0, vy: 0, r: b.r,
        isDragging: false,
        floatAmp: b.floatAmp, floatFreq: b.floatFreq, floatPhase: b.floatPhase,
      })),
      satellites: layout.flatMap(b =>
        Array.from({ length: b.numSats }, (_, i) => {
          const angle = (i / Math.max(b.numSats, 1)) * Math.PI * 2 - Math.PI / 2;
          const restLen = b.r + 30;
          return {
            bubbleId: b.post.id, idx: i,
            x: b.x + Math.cos(angle) * restLen,
            y: b.y + Math.sin(angle) * restLen,
            vx: 0, vy: 0, restLen,
          };
        }),
      ),
    };
  }, [layout]);

  // ── Physics loop (runs forever, reads from refs) ──────────────────────────
  useEffect(() => {
    const tick = (ts: number) => {
      const { bubbles, satellites } = physicsRef.current;
      const { w: W, h: H } = canvasSizeRef.current;
      const t = ts * 0.001;

      // Bubble-bubble repulsion
      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i];
        for (let j = i + 1; j < bubbles.length; j++) {
          const c = bubbles[j];
          const dx = b.x - c.x, dy = b.y - c.y;
          const distSq = dx * dx + dy * dy;
          const thresh = b.r + c.r + MIN_GAP;
          if (distSq < thresh * thresh) {
            // Clamp dist to minimum 1px to prevent blow-up when fully overlapping
            const dist = Math.max(Math.sqrt(distSq), 1);
            const force = Math.min(REPULSION * (thresh - dist) / (dist * thresh), MAX_FORCE);
            const fx = force * dx / dist, fy = force * dy / dist;
            if (!b.isDragging) { b.vx += fx; b.vy += fy; }
            if (!c.isDragging) { c.vx -= fx; c.vy -= fy; }
          }
        }
      }

      // Integrate bubble positions + update DOM
      for (const b of bubbles) {
        if (!b.isDragging) {
          // Center gravity — weak spring toward canvas center
          const cx = W / 2, cy = H / 2;
          b.vx += (cx - b.x) * CENTER_K;
          b.vy += (cy - b.y) * CENTER_K;
          b.vx *= B_DAMP; b.vy *= B_DAMP;
          b.x += b.vx;
          b.y += b.vy;
        }
        // Float is visual-only: added to rendered Y, not physics Y
        const vy = b.y + Math.sin(t * b.floatFreq * Math.PI * 2 + b.floatPhase) * b.floatAmp;
        const el = bubbleElRefs.current.get(b.id);
        if (el) { el.style.left = `${b.x - b.r}px`; el.style.top = `${vy - b.r}px`; }
      }

      // Satellite spring physics + update DOM
      for (const sat of satellites) {
        const b = bubbles.find(bb => bb.id === sat.bubbleId);
        if (!b) continue;
        // Spring targets the bubble's visual position (includes float)
        const bvy = b.y + Math.sin(t * b.floatFreq * Math.PI * 2 + b.floatPhase) * b.floatAmp;
        const dx = sat.x - b.x, dy = sat.y - bvy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0.01) {
          const sf = SAT_K * (dist - sat.restLen);
          sat.vx -= sf * dx / dist;
          sat.vy -= sf * dy / dist;
        }
        sat.vx *= SAT_DAMP; sat.vy *= SAT_DAMP;
        sat.x += sat.vx; sat.y += sat.vy;

        const satEl = satElRefs.current.get(sat.bubbleId)?.[sat.idx];
        if (satEl) { satEl.style.left = `${sat.x - SAT_R}px`; satEl.style.top = `${sat.y - SAT_R}px`; }

        const lineEl = lineElRefs.current.get(sat.bubbleId)?.[sat.idx];
        if (lineEl) {
          lineEl.setAttribute('x1', String(b.x));
          lineEl.setAttribute('y1', String(bvy));
          lineEl.setAttribute('x2', String(sat.x));
          lineEl.setAttribute('y2', String(sat.y));
        }
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []); // intentionally empty — physics loop reads refs, never needs restart

  // ── Drag (native pointer events + capture) ────────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent, id: string) => {
    e.stopPropagation(); // prevent pan triggering
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    (e.currentTarget as HTMLElement).style.cursor = 'grabbing';
    (e.currentTarget as HTMLElement).style.zIndex = '50';
    const b = physicsRef.current.bubbles.find(x => x.id === id);
    if (!b) return;
    b.isDragging = true; b.vx = 0; b.vy = 0;
    const rect = canvasRef.current!.getBoundingClientRect();
    const { scale, tx, ty } = viewTransRef.current;
    const wx = (e.clientX - rect.left - tx) / scale;
    const wy = (e.clientY - rect.top  - ty) / scale;
    dragRef.current = { id, ox: b.x - wx, oy: b.y - wy, moves: 0 };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent, id: string) => {
    if (dragRef.current.id !== id) return;
    dragRef.current.moves++;
    const b = physicsRef.current.bubbles.find(x => x.id === id);
    if (!b) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const { scale, tx, ty } = viewTransRef.current;
    b.x = (e.clientX - rect.left - tx) / scale + dragRef.current.ox;
    b.y = (e.clientY - rect.top  - ty) / scale + dragRef.current.oy;
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent, id: string) => {
    if (dragRef.current.id !== id) return;
    (e.currentTarget as HTMLElement).style.cursor = 'grab';
    (e.currentTarget as HTMLElement).style.zIndex = '';
    const b = physicsRef.current.bubbles.find(x => x.id === id);
    if (b) { b.isDragging = false; b.vx = 0; b.vy = 0; }
    const wasDrag = dragRef.current.moves > 4;
    dragRef.current = { id: null, ox: 0, oy: 0, moves: 0 };
    if (!wasDrag) navigate(`/forum/${id}`);
  }, [navigate]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-dvh-nav" style={{ display: 'flex', flexDirection: 'column', background: '#060b18', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        background: 'rgba(6,11,24,0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '10px 20px', display: 'flex', alignItems: 'center',
        gap: 12, flexShrink: 0, flexWrap: 'wrap', zIndex: 10,
      }}>
        <h1 style={{ color: '#e2e8f0', fontSize: 17, fontWeight: 700, margin: 0, letterSpacing: '-0.4px', flexShrink: 0, textShadow: '0 0 20px rgba(99,102,241,0.4)' }}>
          Essensgruppe Forum
        </h1>
        <form onSubmit={e => { e.preventDefault(); setSearch(searchInput); }} style={{ display: 'flex', gap: 6, flex: 1, minWidth: 180 }}>
          <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Suchen..."
            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0', padding: '7px 12px', fontSize: 13, outline: 'none' }} />
          {search && (
            <button type="button" onClick={() => { setSearch(''); setSearchInput(''); }}
              style={{ background: 'rgba(244,63,94,0.18)', border: '1px solid rgba(244,63,94,0.35)', borderRadius: 8, color: '#fda4af', padding: '7px 10px', cursor: 'pointer', fontSize: 12 }}>✕</button>
          )}
        </form>
        <div style={{ display: 'flex', gap: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 3 }}>
          {(['hot', 'new', 'top'] as SortMode[]).map(mode => {
            const labels: Record<SortMode, string> = { hot: 'Beliebt', new: 'Neu', top: 'Top' };
            return (
            <button key={mode} onClick={() => setSort(mode)} style={{
              padding: '5px 13px', borderRadius: 6, border: 'none',
              background: sort === mode ? 'rgba(99,102,241,0.4)' : 'transparent',
              color: sort === mode ? '#a5b4fc' : 'rgba(255,255,255,0.45)',
              fontSize: 12, fontWeight: sort === mode ? 600 : 400,
              cursor: 'pointer', transition: 'all 0.15s',
            }}>{labels[mode]}</button>);
          })}
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowCreateModal(true)}
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 8, color: '#fff', padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, boxShadow: '0 0 18px rgba(99,102,241,0.45)' }}>
          <span style={{ fontSize: 17, lineHeight: 1, marginTop: -1 }}>+</span> Neuer Post
        </motion.button>
      </div>

      {/* Canvas */}
      <div ref={canvasRef} style={{
        flex: 1, position: 'relative', overflow: 'hidden', touchAction: 'none',
        background: ['radial-gradient(ellipse 60% 50% at 20% 30%,rgba(99,102,241,0.06) 0%,transparent 70%)', 'radial-gradient(ellipse 50% 60% at 80% 70%,rgba(6,182,212,0.06) 0%,transparent 70%)', '#060b18'].join(','),
      }}>

        {/* UI overlays — outside viewport so they don't scale */}
        {error && (
          <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.4)', borderRadius: 10, color: '#fda4af', padding: '10px 20px', fontSize: 13, zIndex: 30 }}>{error}</div>
        )}
        {isLoading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, zIndex: 30 }}>
            {[90,115,70,100,80].map((size, i) => (
              <motion.div key={i} animate={{ opacity: [0.2,0.55,0.2], scale: [1,1.05,1] }}
                transition={{ duration: 1.6, repeat: Infinity, delay: i*0.18 }}
                style={{ width: size, height: size, borderRadius: '50%', background: `rgba(${['99,102,241','6,182,212','16,185,129','168,85,247','245,158,11'][i]},0.1)`, border: `2px solid rgba(${['99,102,241','6,182,212','16,185,129','168,85,247','245,158,11'][i]},0.25)` }} />
            ))}
          </div>
        )}
        {!isLoading && posts.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, zIndex: 30 }}>
            <motion.button animate={{ scale: [1,1.05,1], boxShadow: ['0 0 24px rgba(99,102,241,0.2)','0 0 40px rgba(99,102,241,0.4)','0 0 24px rgba(99,102,241,0.2)'] }}
              transition={{ duration: 2.5, repeat: Infinity }} onClick={() => setShowCreateModal(true)}
              style={{ width: 160, height: 160, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', border: '2px solid rgba(99,102,241,0.45)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{ fontSize: 36 }}>💬</span>
              <span style={{ color: '#a5b4fc', fontSize: 12, fontWeight: 600 }}>{search ? 'Keine Posts' : 'Erster Post!'}</span>
            </motion.button>
            {!search && <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13, margin: 0 }}>Klicke die Blase um zu beginnen</p>}
          </div>
        )}

        {/* Zoom buttons */}
        <div className="bottom-safe-4" style={{ position: 'absolute', right: 16, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 30 }}>
          {[
            { label: '+', title: 'Vergrößern',  action: () => zoomBy(1.25) },
            { label: '−', title: 'Verkleinern', action: () => zoomBy(0.8)  },
            { label: '⊡', title: 'Alles zeigen',  action: fitToScreen         },
          ].map(btn => (
            <button key={btn.label} onClick={btn.action} title={btn.title} style={{
              width: 36, height: 36, borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(6,11,24,0.85)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
              color: 'rgba(255,255,255,0.7)', fontSize: btn.label === '⊡' ? 14 : 18,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}>{btn.label}</button>
          ))}
        </div>

        {/* Viewport — everything inside here is zoomed + panned */}
        <div
          ref={viewportRef}
          style={{ position: 'absolute', inset: 0, transformOrigin: '0 0' }}
        >
          {/* Dot grid */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle,rgba(255,255,255,0.025) 1px,transparent 1px)', backgroundSize: '44px 44px', pointerEvents: 'none' }} />

          {/* Pan background — sits behind bubbles, initiates pan on drag */}
          <div
            style={{ position: 'absolute', inset: 0, zIndex: 0, cursor: isPanningRef.current ? 'grabbing' : 'default' }}
            onPointerDown={e => {
              isPanningRef.current = true;
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              panStartRef.current = { x: e.clientX, y: e.clientY, tx: viewTransRef.current.tx, ty: viewTransRef.current.ty };
            }}
            onPointerMove={e => {
              if (!isPanningRef.current) return;
              viewTransRef.current.tx = panStartRef.current.tx + (e.clientX - panStartRef.current.x);
              viewTransRef.current.ty = panStartRef.current.ty + (e.clientY - panStartRef.current.y);
              applyViewport();
            }}
            onPointerUp={() => { isPanningRef.current = false; }}
          />

          {!isLoading && posts.length > 0 && (<>
            {/* SVG connection lines */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible', zIndex: 1 }}>
              {layout.flatMap(b =>
                Array.from({ length: b.numSats }, (_, i) => (
                  <line key={`${b.post.id}-l${i}`}
                    ref={el => {
                      if (!lineElRefs.current.has(b.post.id)) lineElRefs.current.set(b.post.id, []);
                      if (el) lineElRefs.current.get(b.post.id)![i] = el;
                    }}
                    stroke={b.theme.border} strokeWidth={1} strokeOpacity={0.28} strokeDasharray="3 3"
                  />
                ))
              )}
            </svg>

            {/* Satellite nodes */}
            {layout.flatMap(b =>
              Array.from({ length: b.numSats }, (_, i) => {
                const angle = (i / Math.max(b.numSats, 1)) * Math.PI * 2 - Math.PI / 2;
                const restLen = b.r + 30;
                return (
                  <div key={`${b.post.id}-s${i}`}
                    ref={el => {
                      if (!satElRefs.current.has(b.post.id)) satElRefs.current.set(b.post.id, []);
                      if (el) satElRefs.current.get(b.post.id)![i] = el;
                    }}
                    style={{
                      position: 'absolute',
                      left: b.x + Math.cos(angle) * restLen - SAT_R,
                      top:  b.y + Math.sin(angle) * restLen - SAT_R,
                      width: SAT_R * 2, height: SAT_R * 2, borderRadius: '50%',
                      background: b.theme.bg, border: `1.5px solid ${b.theme.border}`,
                      boxShadow: `0 0 6px ${b.theme.glow}`, pointerEvents: 'none', zIndex: 2,
                    }}
                  />
                );
              })
            )}

            {/* Bubble containers */}
            <AnimatePresence>
              {layout.map(b => (
                <motion.div key={b.post.id}
                  ref={el => {
                    if (el) bubbleElRefs.current.set(b.post.id, el as HTMLDivElement);
                    else bubbleElRefs.current.delete(b.post.id);
                  }}
                  initial={{ opacity: 0, scale: 0.15 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.15 }}
                  transition={{ type: 'spring', stiffness: 240, damping: 22, delay: b.enterDelay }}
                  style={{ position: 'absolute', left: b.x - b.r, top: b.y - b.r, width: b.r*2, height: b.r*2, cursor: 'grab', zIndex: 3, touchAction: 'none' }}
                  onPointerDown={e => onPointerDown(e, b.post.id)}
                  onPointerMove={e => onPointerMove(e, b.post.id)}
                  onPointerUp={e => onPointerUp(e, b.post.id)}
                >
                  <BubbleContent post={b.post} r={b.r} theme={b.theme} />
                </motion.div>
              ))}
            </AnimatePresence>
          </>)}
        </div>
      </div>

      <AnimatePresence>
        {showCreateModal && (
          <CreatePostModal onClose={() => setShowCreateModal(false)} onCreated={p => { setPosts(prev => [p, ...prev]); setShowCreateModal(false); }} />
        )}
      </AnimatePresence>
    </div>
  );
};

// ── CreatePostModal ───────────────────────────────────────────────────────────
const CreatePostModal = ({ onClose, onCreated }: { onClose: () => void; onCreated: (p: Post) => void }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<'ALL' | 'ESSENSGRUPPE_ONLY'>('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const canSetVisibility = user?.role === 'ESSENSGRUPPE_MITGLIED' || user?.role === 'ADMIN';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setIsSubmitting(true); setError('');
    try {
      onCreated((await ApiService.createPost({ title: title.trim(), content: content.trim(), visibility })) as Post);
    } catch (err: any) { setError(err.message); }
    finally { setIsSubmitting(false); }
  };

  const inp: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#e2e8f0', padding: '10px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }} onClick={e => e.stopPropagation()}
        style={{ background: 'rgba(10,15,35,0.98)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, boxShadow: '0 0 60px rgba(99,102,241,0.2),0 24px 60px rgba(0,0,0,0.6)', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ color: '#e2e8f0', fontSize: 20, fontWeight: 700, margin: 0 }}>Neuer Post</h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 8, color: 'rgba(255,255,255,0.5)', width: 32, height: 32, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
        {error && <div style={{ background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.35)', borderRadius: 8, color: '#fda4af', padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 600, marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Titel</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ein interessanter Titel..." maxLength={200} required style={inp} />
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, margin: '4px 0 0', textAlign: 'right' }}>{title.length}/200</p>
          </div>
          <div>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 600, marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Inhalt</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Was beschäftigt dich?" maxLength={10000} required rows={6} style={{ ...inp, resize: 'vertical', minHeight: 140 }} />
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, margin: '4px 0 0', textAlign: 'right' }}>{content.length}/10000</p>
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
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: 'rgba(255,255,255,0.6)', padding: '9px 20px', fontSize: 14, cursor: 'pointer' }}>Abbrechen</button>
            <motion.button type="submit" disabled={isSubmitting || !title.trim() || !content.trim()} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 10, color: '#fff', padding: '9px 24px', fontSize: 14, fontWeight: 600, cursor: isSubmitting || !title.trim() || !content.trim() ? 'not-allowed' : 'pointer', opacity: isSubmitting || !title.trim() || !content.trim() ? 0.5 : 1, boxShadow: '0 0 18px rgba(99,102,241,0.4)' }}>
              {isSubmitting ? 'Posten...' : 'Posten'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
