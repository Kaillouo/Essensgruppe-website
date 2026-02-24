# Forum Graph View — Technical Specification

**Status:** PLANNED (not yet built)

## Overview
Replace the standard Reddit-style forum list with an **Obsidian-style force-directed graph view**. Every post appears as a bubble/node on an infinite canvas, with comments as smaller connected nodes. Users can drag, zoom, pan, and explore the forum visually.

## Visual Concept
```
                    o comment
                   /
    o comment -- * POST A --- * POST B -- o comment
                   \            \
                    o comment    o comment
                                  \
                                   o reply

    * = Post node (large, colored)
    o = Comment node (small, muted)
    -- = Connection line
```

- Infinite canvas, gravity toward center
- Repulsion between nodes (no overlap)
- Drag, zoom (scroll wheel/pinch), pan
- Click post bubble -> opens thread view

## Technology
**Primary:** `react-force-graph-2d` (npm)
- Uses `d3-force` for physics + HTML Canvas for rendering
- Built-in drag, zoom, pan, click, hover
- ~50KB gzipped, actively maintained

**Rejected alternatives:** D3.js raw (too much boilerplate), react-force-graph-3d (overkill), Cytoscape.js (too heavy), Sigma.js (less React-friendly)

## Data Model
Transform existing post/comment data into graph format:
- `GraphNode`: id, type (post/comment), title, content preview, author, voteScore, commentCount
- `GraphLink`: source (parent), target (child)

## New API Endpoint Needed
`GET /api/posts/graph` — returns all posts with top-level comments (lightweight, truncated content). Separate from the full thread endpoint because graph needs overview data for ALL posts at once.

## Component Architecture
```
ForumPage.tsx
  GraphView.tsx           <- Main force-graph canvas (NEW)
    ForceGraph2D          <- from react-force-graph-2d
    GraphOverlay.tsx      <- Top-right filter/control panel (NEW)
    NodeTooltip.tsx       <- Hover tooltip (NEW)
  ThreadPage.tsx          <- Existing, reached via node click
  CreatePostModal.tsx     <- Existing, triggered from overlay
```

## Physics (Obsidian-like)
- Center gravity: strength 0.05
- Node repulsion: -150 (posts) / -30 (comments)
- Link distance: 40
- Collision radius: 30 (posts) / 8 (comments)
- d3AlphaDecay: 0.02, d3VelocityDecay: 0.3

## Node Colors by Sort Mode
- Hot: warm gradient (red -> orange -> yellow)
- New: cool gradient (purple -> blue -> cyan)
- Top: green gradient

## View Toggle
Graph View / List View toggle. Default: Graph. Preference saved to localStorage.

## Implementation Steps
1. `npm install react-force-graph-2d`
2. New endpoint: GET /api/posts/graph
3. Build GraphView + GraphOverlay + NodeTooltip components
4. Add view toggle to ForumPage
5. Polish: search dimming, smooth zoom, mobile touch, loading state

## Files to Modify
- `backend/src/routes/post.routes.ts` — add graph endpoint
- `frontend/src/pages/ForumPage.tsx` — add view toggle
- `frontend/src/services/api.service.ts` — add getPostsGraph()
- `frontend/src/types/index.ts` — add GraphNode, GraphLink types
- NEW: `frontend/src/components/forum/GraphView.tsx`
- NEW: `frontend/src/components/forum/GraphOverlay.tsx`
- NEW: `frontend/src/components/forum/NodeTooltip.tsx`
