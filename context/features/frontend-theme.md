# Essensgruppe.de — Frontend Theme & Animation Vision

## Visual References Studied

### Lando Norris (landonorris.com) — PRIMARY REFERENCE
Inspected live. Key findings:

**Exact colors used:**
- Background: `#282C20` (dark olive-black — NOT pure black, has a warm organic undertone)
- Near-black surface: `#111112`
- Accent neon: `#D2FF00` (neon yellow-lime — this exact color)
- Secondary accent: `#B2C73A` (muted olive-lime, used for secondary highlights)
- Text primary: `#F4F4ED` (warm off-white/cream, not pure white)
- Text muted: `#B4B8A5` (desaturated olive grey)

**Exact fonts used:**
- Display/headings: `Brier` (bold, condensed — heavy weight)
- UI/body: `Mona Sans Variable` (clean variable-width sans)

**Exact easing used (pulled from CSS):**
- Primary: `cubic-bezier(0.65, 0.05, 0, 1)` over `0.75s` — expo-out, feels snappy then smooth
- Secondary: `cubic-bezier(0.19, 1, 0.22, 1)` — extreme expo-out for elastic feel
- Marquee: `30s linear infinite` — constant speed, no easing

**Animation techniques on LN site:**
- `clip-path` transitions (elements wipe in behind a moving mask)
- `transform` slide-ins with the expo-out easing above
- `opacity` fades
- Color transitions on hover (0.75s, same easing)
- Horizontal marquee strip between sections (paused by default, plays on scroll)

### Bruno Simon (bruno-simon.com)
Full-screen WebGL scene as entire background. Dark grid floor in 3D perspective, glowing neon cross/dot particles at multiple Z depths. Mouse moves camera subtly. The whole page IS the 3D scene — content floats above it. Very impressive depth.

### Mercedes AMG F1
Dark atmospheric cinema. Deep blacks, one strong accent color (teal). Dark overlays on imagery. Cinematic hero sections with full-bleed photos fading into black.

---

## Overall Mood

**Premium · Dark · Cinematic · Energetic · Youthful**

Not corporate, not generic. Feels like a curated experience. The aesthetic says "we're a tight group, this was made with taste."

---

## Color Palette

Inspired by LN but adapted for Essensgruppe's identity:

```
--bg-base:        #0C0D0A   /* main background — near-black, slight olive warmth */
--bg-surface:     #141510   /* cards, panels */
--bg-border:      rgba(255, 255, 255, 0.06)  /* hairline borders */

--accent:         #D2FF00   /* neon lime — main accent (LN-exact) */
--accent-dim:     #B2C73A   /* muted olive lime — secondary highlights */
--accent-cyan:    #00E5FF   /* electric cyan — interactive states, hover */

--text-primary:   #F4F4ED   /* warm cream (LN-exact) */
--text-muted:     #B4B8A5   /* desaturated olive (LN-exact) */
--text-faint:     #535450   /* barely visible — labels, metadata */
```

**Per-section accent color shifts** (CSS `--accent` variable updates as sections enter viewport):
| Section | Accent | Mood |
|---|---|---|
| Landing hero | `#D2FF00` neon lime | electric, sharp |
| Forum | `#00E5FF` cyan | cool, digital |
| Events | `#FF6B35` orange | warm, social |
| Games | `#FF2D55` red-pink | hot, risky |
| MC / Minecraft | `#00FF94` mint-green | playful |
| CTA / join | `#D2FF00` lime | back to brand |

Transition: when a section enters the viewport, update `--accent` on `<body>` with `transition: color 600ms ease`.

---

## Typography

```css
/* Display — big section headers, hero headline */
font-family: 'Brier', 'Anton', 'Bebas Neue', sans-serif;
font-weight: 900;
letter-spacing: -0.02em;
text-transform: uppercase;

/* UI — body text, nav, labels */
font-family: 'Mona Sans', 'Inter Variable', sans-serif;
font-weight: 400-600;

/* Code / stats / counters */
font-family: 'JetBrains Mono', monospace;
```

Hero headline size: `clamp(4rem, 12vw, 11rem)` — fills horizontal space regardless of screen size.

Section headers: `clamp(2.5rem, 6vw, 5.5rem)`.

---

## 3D WebGL Background Layer

Use **Three.js** (or `@react-three/fiber` for React integration).

### What's in the scene:

**Layer 1 — Infinite grid floor:**
- Thin grid lines in 3D perspective, color `rgba(255, 255, 255, 0.04)`
- Extends to horizon with exponential fog fading to background color
- Subtle grid glow where lines cross (tiny points, color `--accent` at 15% opacity)
- Grid moves slowly forward as user scrolls (camera dolly), giving sense of motion through space

**Layer 2 — Floating particles:**
- ~300-500 small points (`THREE.Points`) at varying Z depths (-10 to -300 units)
- Color: mostly white/grey at very low opacity; a few in `--accent` color
- Constant gentle drift (sin/cos offset over time, very slow)
- On mouse move: particles nearest to camera parallax slightly against cursor direction — depth illusion

**Layer 3 — Ambient glow blobs:**
- 2-3 large radial gradient "blobs" positioned off-center
- Colors: `--accent` at 3-6% opacity, very blurred
- Slow drift animation (60s cycle), like auroras
- These subtly shift as mouse moves (much slower than particles — large scale parallax)

### Stacking order:
```
z-0:    WebGL <canvas> — behind everything
z-1:    Dark vignette overlay (radial gradient, pointer-events: none)
z-2+:   All HTML content
z-9999: Custom cursor
```

---

## Mouse-Responsive Effects

### 1. WebGL camera tilt (background parallax)

Track `mousemove` globally. Normalize cursor X/Y to `-1 -> +1` range.

```js
// Target rotation — updates on mousemove
targetRotX = normalizedY * 0.04  // max +/-4deg vertical tilt
targetRotY = normalizedX * 0.03  // max +/-3deg horizontal tilt

// Each frame — smooth lerp toward target
camera.rotation.x += (targetRotX - camera.rotation.x) * 0.05
camera.rotation.y += (targetRotY - camera.rotation.y) * 0.05
```

Result: as you move the mouse, the 3D grid and particles shift slightly like you're looking around a room. It's subtle but deeply impressive.

### 2. Foreground content parallax layers

HTML content elements get different parallax speeds based on their depth class:

```css
.parallax-near   { --speed: 0.02 }   /* moves most with mouse */
.parallax-mid    { --speed: 0.01 }
.parallax-far    { --speed: 0.005 }  /* barely moves */
```

JS applies `transform: translate(mouseX * speed, mouseY * speed)` using RAF + lerp.

### 3. Magnetic buttons

Every `<button>` and `.cta` element has magnetic pull:

- Track distance from cursor center to element center
- If within 80px radius: translate element toward cursor by up to 12px, lerp factor 0.15
- On leave: spring back with slight overshoot (scale briefly to 0.97 then 1.0)
- Easing: `cubic-bezier(0.19, 1, 0.22, 1)` (the LN elastic ease)

### 4. Custom cursor

Replace OS cursor entirely:

```
[inner dot]  8px filled circle, white, no lag
[outer ring] 28px circle, border 1px, white, follows with lerp factor 0.1 (heavy lag)
```

States:
- **Default:** inner dot + outer ring
- **Hover link/button:** outer ring scales to 48px, fills with `--accent` at 20% opacity (smooth 300ms)
- **Hover image:** outer ring becomes a crosshair / expand icon
- **Click/press:** inner dot scales to 0.6, snaps back on release
- **Dragging:** outer ring stretches in direction of movement (scaleX based on velocity)

---

## Scroll-Synced Animations

Use **GSAP + ScrollTrigger** + **Lenis** for smooth scroll.

The LN site easing pulled from CSS: `cubic-bezier(0.65, 0.05, 0, 1)` — use this for all scroll animations.

### Pattern A — Text line slide-in (LN-style)

Split heading into individual lines with GSAP SplitText (or manual span wrapping).

```
Initial: translateY(60px) + opacity(0) + clip-path: inset(0 0 100% 0)
Final:   translateY(0)    + opacity(1) + clip-path: inset(0 0 0% 0)
Easing:  cubic-bezier(0.65, 0.05, 0, 1)
Duration: 0.75s per line
Stagger:  80ms between lines
Trigger:  when element is 20% into viewport
```

Lines appear to push up out of a masked slot — very crisp, editorial feel.

### Pattern B — Image wipe reveal (LN clip-path style)

```
Initial: clip-path: inset(0 100% 0 0)   /* fully hidden, masked from right */
Final:   clip-path: inset(0 0% 0 0)     /* fully visible */
Easing:  cubic-bezier(0.65, 0.05, 0, 1)
Duration: 0.75s
```

Before the image reveals, an accent-colored shutter (`background: --accent`) wipes across first (0-0.4s), then the image wipes in behind it (0.3-0.75s). Same technique used on LN.

### Pattern C — Card grid stagger

Cards in grids and lists:
```
Initial: translateY(40px) + opacity(0)
Final:   translateY(0)    + opacity(1)
Duration: 0.6s
Stagger:  80-120ms between cards
```

### Pattern D — Horizontal marquee strip

Between major sections, a full-width banner of repeating sideways-scrolling text:

```
Content: "ESSENSGRUPPE . ABI 2027 . FORUM . EVENTS . GAMES . MC . "
Speed:   30s linear infinite (matching LN's 30s)
Direction: left by default, right on alternate strips
```

**Scroll velocity sync:** Track scroll delta per frame. Map scroll velocity to playback rate of marquee:
- `animation-play-state: paused` by default
- On scroll: set `animation-duration` shorter (faster marquee when scrolling fast)
- On scroll stop: ease back to 30s over ~500ms

### Pattern E — Hue shift on scroll

Each section registers with ScrollTrigger. When a section reaches 40% of viewport:

```js
document.body.style.setProperty('--accent', sectionAccentColor)
// CSS: body { transition: color 600ms ease } propagates to all var(--accent) usages
```

Sections glow with their own color. The background accent blobs also shift color.

### Pattern F — Scroll velocity distortion

Track `scrollY` delta per animation frame:

```js
// When scrolling fast, apply vertical stretch to hero elements
const velocity = Math.abs(currentScrollY - prevScrollY)
const stretch = 1 + Math.min(velocity * 0.002, 0.06)  // max 6% stretch
heroContent.style.transform = `scaleY(${stretch})`
// Lerp back to 1 on idle
```

Optional: add a CSS `filter: blur(${velocity * 0.05}px)` on fast scroll for motion-blur feel.

---

## Landing Page Hero

### Layout:

```
+-------------------------------------------------+
|  NAVBAR (transparent, fixed, blurs in on scroll) |
+-------------------------------------------------+
|                                                   |
|  [WebGL 3D grid + particles behind everything]    |
|                                                   |
|  ESSENS                    <- huge display font   |
|  GRUPPE.                   <- accent color on last|
|                                                   |
|  ABI 2027 . Private Community                     |
|  ----------------------------------------         |
|  [ Ich bin dabei -> ]       <- magnetic CTA       |
|                                                   |
|        v                   <- scroll indicator    |
|  thin vertical line + moving dot                  |
+-------------------------------------------------+
```

### Page load entrance sequence (ms):

```
t=0     WebGL scene fades in from black (opacity 0->1, 800ms)
t=400   Navbar items slide down from top, staggered 60ms each
t=600   "ESSENS" first line wipes up out of mask
t=750   "GRUPPE." second line wipes up
t=950   Sub-headline fades up + translates from Y+20
t=1150  CTA button fades in + magnetic effect activates
t=1300  Scroll indicator pulses in
```

### Hero scroll behavior:

As user scrolls down from hero:
- Headline scales up slightly AND fades out (parallax zoom-out — feels like zooming past it)
- WebGL camera dollies forward (grid accelerates toward you)
- Navbar background transitions from transparent -> `rgba(12, 13, 10, 0.9)` with backdrop-blur

---

## Inner Pages (Post-Login App)

Animations inside the app are lighter — users are here to DO things, not watch a show. Still feels premium.

**Page transitions:** Content fades out in 150ms, new page fades in + slides up 20px over 200ms. Use Framer Motion `AnimatePresence`.

**Cards:** On hover — `translateY(-4px)` + deepen `box-shadow`. Easing: `cubic-bezier(0.19, 1, 0.22, 1)`, 250ms.

**Active nav item:** Accent left-border slides in from left (clip-path or scaleX from 0->1), 300ms.

**Modals:** Scale from 0.95 -> 1.0 + opacity 0->1 + overlay fades in. Entry from bottom-center, 250ms.

**Toast notifications:** Slide in from top-right (translateX from +120px -> 0), auto-dismiss with thin progress bar at bottom of toast.

**Loading states:** Skeleton screens only (pulsing grey shimmer blocks). No spinners. Use `@keyframes shimmer` that sweeps a highlight across the placeholder.

**Forum bubbles:** On hover, bubble glows with `--accent` color box-shadow, scales to 1.05. Nearby bubbles slightly repel (distance-based transform using JS).

---

## Navbar

**Transparent** on landing hero. On scroll past hero:
- Background: `rgba(12, 13, 10, 0.85)` + `backdrop-filter: blur(20px) saturate(180%)`
- Border bottom: `1px solid rgba(255, 255, 255, 0.06)`
- Transition: 300ms ease

**Logo:** `ESSENSGRUPPE` in display font, left-aligned. Accent dot or `.` after the name in `--accent` color.

**Nav links hover:** Thin underline grows from center (transform scaleX 0->1, `transform-origin: center`), 250ms.

**Balance coin indicator:** Pill shape top-right when logged in. `--accent` colored, pulsing ring animation on balance change.

**Profile avatar:** Circle, subtle `--accent` glow ring on hover (box-shadow spread animation).

---

## Recommended Libraries & Tools

| Purpose | Library | Notes |
|---|---|---|
| 3D WebGL background | `three` + `@react-three/fiber` + `@react-three/drei` | Use R3F for React integration |
| Scroll animations | `gsap` + `ScrollTrigger` | Industry standard, best scroll sync |
| Smooth scroll | `lenis` | Works perfectly with GSAP ScrollTrigger |
| Page transitions | `framer-motion` `AnimatePresence` | Already in project stack |
| Text split animations | `gsap/SplitText` (GSAP Club) or manual `<span>` wrapping | Manual split is free |
| Mouse tracking | Custom hook + `requestAnimationFrame` lerp loop | Don't use library for this — 20 lines of code |
| Particles (alternative) | `tsparticles` | If not using Three.js |

---

## Performance Rules

- WebGL canvas: cap `devicePixelRatio` at `Math.min(window.devicePixelRatio, 2)`
- Reduce particle count on mobile: `isMobile ? 80 : 400`
- Use `will-change: transform` only on actively animating elements; remove after animation ends
- All animations: target 60fps, use `requestAnimationFrame` never `setInterval`
- Respect `prefers-reduced-motion`: disable all scroll/mouse animations, keep only fades
- Lazy-load Three.js + GSAP after initial paint so they don't block first contentful paint
- Lenis smooth scroll: disable on iOS Safari if causing issues (native scroll is fine there)

---

## Mobile Behavior

- **WebGL:** Disable or replace with a static `conic-gradient` / radial gradient background. The 3D grid is too heavy for most mobile GPUs to sustain 60fps
- **Mouse tracking effects:** Fully disabled on touch devices. Replace with slow `@keyframes` idle drift animations instead
- **Magnetic buttons:** Disabled on touch
- **Custom cursor:** Hidden on touch devices (native touch has no cursor)
- **Scroll animations:** Kept — but simpler. Fade-up only (no slide-in from sides, avoids overflow clipping issues on mobile)
- **Marquee strip:** Stays, works perfectly on mobile
- **Hero headline:** Centered, `clamp(2.8rem, 9vw, 4.5rem)`, stacked layout
- **Hue shift:** Keep — it's just CSS variable updates, no performance cost
