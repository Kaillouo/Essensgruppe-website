# Frontend Theme & Animation Vision

**Status:** ASPIRATIONAL — Only the dark theme base was implemented (fix/round2). The advanced animations, WebGL, custom cursor, and scroll effects below are NOT built yet. This file serves as a design reference for future work.

---

## What's Currently Implemented
- Dark theme applied globally (dark backgrounds, light text, accent colors via Tailwind)
- Basic card hover effects and page transitions via Framer Motion

## What's NOT Implemented (Future Vision)

### Color Palette (inspired by landonorris.com)
```
--bg-base:      #0C0D0A   (near-black, olive warmth)
--accent:       #D2FF00   (neon lime)
--accent-cyan:  #00E5FF   (interactive states)
--text-primary: #F4F4ED   (warm cream)
--text-muted:   #B4B8A5   (olive grey)
```
Per-section accent shifts: Landing=#D2FF00, Forum=#00E5FF, Events=#FF6B35, Games=#FF2D55, MC=#00FF94

### Typography
- Display: `Brier` / `Anton` / `Bebas Neue` (uppercase, -0.02em tracking)
- UI: `Mona Sans` / `Inter Variable`
- Hero: `clamp(4rem, 12vw, 11rem)`

### 3D WebGL Background (Three.js / @react-three/fiber)
- Infinite grid floor with fog, floating particles (300-500 points), ambient glow blobs
- Mouse-responsive camera tilt (max +/-4deg), particle parallax

### Scroll Animations (GSAP + ScrollTrigger + Lenis)
- Text line slide-in with clip-path masks (LN-style)
- Image wipe reveal with accent shutter
- Card grid stagger (80-120ms)
- Horizontal marquee strips between sections ("ESSENSGRUPPE . ABI 2027 . FORUM ...")
- Hue shift per section on scroll
- Scroll velocity distortion (vertical stretch + optional motion blur)

### Mouse Effects
- Custom cursor: 8px inner dot + 28px outer ring (lerp 0.1 lag)
- Magnetic buttons: pull toward cursor within 80px radius
- Foreground parallax layers (.parallax-near/mid/far)

### Landing Page Hero Sequence
```
t=0    WebGL fade in (800ms)
t=400  Navbar slide down
t=600  "ESSENS" line wipe up
t=750  "GRUPPE." line wipe up
t=950  Sub-headline fade
t=1150 CTA magnetic button
t=1300 Scroll indicator
```

### Performance Rules
- Cap devicePixelRatio at 2; reduce particles on mobile
- Disable WebGL/mouse effects on touch devices
- Respect `prefers-reduced-motion`
- Lazy-load Three.js + GSAP after initial paint

### Libraries Needed
Three.js + @react-three/fiber + @react-three/drei, GSAP + ScrollTrigger, Lenis (smooth scroll), Framer Motion (already installed)
