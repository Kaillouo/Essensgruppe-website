# Landing Page Redesign — "The Hallway"

**Status:** V2 DONE (2026-03-06). Tunnel grid + photo rooms complete. V3 polish possible.
**Branch:** main (landing changes are in LandingPage.tsx + components/landing/)

---

## Vision Summary

User scrolls through an immersive experience. Every animation is scroll-synced (no time-based auto-play):

1. Full-screen video with giant "ABI 27" text
2. Text fades/shrinks, video pulls back into a "window" at the end of a circular space
3. **Persistent tunnel grid** — canvas-based concentric squares fly outward from bright center as you scroll (Star Wars tunnel effect)
4. Camera reveals 5 themed "rooms" one by one, each showcasing a section of the site
5. Each room: flying text toward camera → room scene → description → exit to next room
6. Clicking a room navigates to its page (auth check)
7. Final CTA section

---

## What's Built (V2 — Current State)

**Installed libs:** `gsap`, `@gsap/react`, `lenis`

**Files:**
```
frontend/src/
  hooks/useLenis.ts                          ← Lenis smooth scroll + GSAP sync
  pages/LandingPage.tsx                      ← Main orchestrator
  components/landing/
    HeroSection.tsx                          ← Video + "ABI 27" + zoom-out on scroll
    FlyingText.tsx                           ← Text scaling from far → close → past
    TunnelGrid.tsx                           ← Canvas: concentric squares + corner dots + diagonals
    RoomContainer.tsx                        ← Reusable scroll-pinned room wrapper
    ForumRoom.tsx                            ← Parliament bg + philosopher statues + columns
    LinksRoom.tsx                            ← Portal image + text
    EventsRoom.tsx                           ← Dark school + mastermind + blueprint
    CasinoRoom.tsx                           ← Casino bg + big poker chips + neon sign
    MinecraftRoom.tsx                        ← MC screenshot + parallax clouds + pixel players
    LandingCTA.tsx                           ← Final CTA section
```

**Images used (frontend/public/images/):**
- `parliament.png` — Greek temple cutout (ForumRoom bg)
- `philosoph1.png` — Socrates statue cutout (ForumRoom left)
- `philosoph2.png` — Two debating philosophers cutout (ForumRoom right)
- `portal.png` — Glowing portal ring (LinksRoom)
- `school.png` — Dark classroom (EventsRoom bg)
- `mastermind.png` — Puppet master silhouette (EventsRoom)
- `casino.png` — Casino interior (CasinoRoom bg)
- `coins for casino.png` — Flying poker chips cutout (CasinoRoom sides)
- `minecraftbg.png` — Minecraft build screenshot (MinecraftRoom bg)

---

## TunnelGrid Details

- **Canvas-based** (60fps requestAnimationFrame)
- 45 concentric squares visible at once, flowing outward from center
- Exponential depth mapping (pow 2.2) — bunched near center, accelerate outward
- 4 static diagonal lines from corners to center
- Corner dots + midpoint dots at intersections
- Bright square tunnel end at center (layered glow + sharp border + core)
- Scroll-synced: 12 squares pass on desktop, 18 on mobile across full page scroll
- `scrub: 0.3` for fast response

---

## V3 Ideas (Not Started)

- Room backgrounds slide/parallax with scroll (not just static)
- WebGL particle effects in tunnel
- Custom cursor changes per room
- Sound effects on hover/click
- More images: cut out photos for each room theme
- Room transition: color tint shifts on body background
- Forum graph/bubble view integration
