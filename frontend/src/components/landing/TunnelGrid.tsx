import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Persistent tunnel grid — squares fly OUT from a bright center point.
 * The "end of the tunnel" stays fixed at screen center.
 * Grid squares spawn from the center and rush outward as you scroll.
 * Near the center they appear slow/dense, at edges they accelerate past you.
 */
export function TunnelGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollOffsetRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // Scroll drives how many squares have "passed" you
    const st = ScrollTrigger.create({
      trigger: 'body',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.3,
      onUpdate: (self) => {
        const isMobile = window.innerWidth < 768;
        // Total squares that pass across the full page scroll
        const totalSquares = isMobile ? 18 : 12;
        scrollOffsetRef.current = self.progress * totalSquares;
      },
    });

    const NUM_VISIBLE = 45; // how many squares visible at once

    function draw() {
      if (!ctx) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const cx = w / 2;
      const cy = h / 2;
      const maxRadius = Math.max(w, h) * 0.85;
      const offset = scrollOffsetRef.current;

      ctx.clearRect(0, 0, w, h);

      // --- 4 diagonal lines from corners to center (always visible) ---
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(cx, cy);
      ctx.moveTo(w, 0); ctx.lineTo(cx, cy);
      ctx.moveTo(0, h); ctx.lineTo(cx, cy);
      ctx.moveTo(w, h); ctx.lineTo(cx, cy);
      ctx.stroke();

      // --- Grid squares flying outward from center ---
      for (let i = 0; i < NUM_VISIBLE; i++) {
        // Each square has a "depth" that cycles: 0 = at center, 1 = at edges
        // offset shifts them so they appear to flow outward as you scroll
        let depth = ((i / NUM_VISIBLE) + (offset % 1)) % 1;

        // Exponential mapping: squares bunch up near center, spread out at edges
        // This creates the perspective acceleration effect
        const t = Math.pow(depth, 2.2);

        // Size of this square (from tiny at center to huge at edges)
        const halfSize = t * maxRadius;

        if (halfSize < 2) continue; // too small to see

        // Opacity: fade in from center, bright in middle zone, fade out at edges
        let alpha;
        if (depth < 0.08) {
          alpha = depth / 0.08 * 0.12; // fade in
        } else if (depth > 0.85) {
          alpha = (1 - depth) / 0.15 * 0.12; // fade out at edges
        } else {
          alpha = 0.05 + (1 - Math.abs(depth - 0.5) * 2) * 0.09;
        }

        // Draw square
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.lineWidth = 0.5 + t * 0.8;
        ctx.beginPath();
        ctx.rect(cx - halfSize, cy - halfSize, halfSize * 2, halfSize * 2);
        ctx.stroke();

        // Corner dots — bigger and brighter for outer squares
        const dotAlpha = alpha * 2.2;
        const dotRadius = 0.8 + t * 2.5;
        ctx.fillStyle = `rgba(255,255,255,${Math.min(dotAlpha, 0.4)})`;
        const corners: [number, number][] = [
          [cx - halfSize, cy - halfSize],
          [cx + halfSize, cy - halfSize],
          [cx - halfSize, cy + halfSize],
          [cx + halfSize, cy + halfSize],
        ];
        for (const [dx, dy] of corners) {
          ctx.beginPath();
          ctx.arc(dx, dy, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Midpoint dots on edges
        if (depth > 0.15) {
          const midDotR = 0.5 + t * 1.5;
          ctx.fillStyle = `rgba(255,255,255,${Math.min(dotAlpha * 0.4, 0.15)})`;
          const mids: [number, number][] = [
            [cx, cy - halfSize], [cx, cy + halfSize],
            [cx - halfSize, cy], [cx + halfSize, cy],
          ];
          for (const [mx, my] of mids) {
            ctx.beginPath();
            ctx.arc(mx, my, midDotR, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // --- Bright square tunnel end (fixed at center) ---
      // Outer glow
      const outerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 90);
      outerGlow.addColorStop(0, 'rgba(255,255,255,0.3)');
      outerGlow.addColorStop(0.3, 'rgba(255,255,255,0.08)');
      outerGlow.addColorStop(0.6, 'rgba(255,255,255,0.02)');
      outerGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = outerGlow;
      ctx.fillRect(cx - 90, cy - 90, 180, 180);

      // Inner bright square
      const innerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40);
      innerGlow.addColorStop(0, 'rgba(255,255,255,0.45)');
      innerGlow.addColorStop(0.5, 'rgba(255,255,255,0.15)');
      innerGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = innerGlow;
      ctx.fillRect(cx - 30, cy - 30, 60, 60);

      // Sharp square border
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 16, cy - 16, 32, 32);

      // Bright core
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(cx - 5, cy - 5, 10, 10);

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      st.kill();
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.85 }}
    />
  );
}
