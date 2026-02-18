# Forum Graph View - Technical Specification

## Overview
Replace the standard Reddit-style forum list with an **Obsidian-style force-directed graph view**. Every post appears as a bubble/node on an infinite canvas, with comments as smaller connected nodes. Users can drag, zoom, pan, and explore the forum visually.

---

## Visual Concept

```
                    ○ comment
                   /
    ○ comment — ● POST A ——— ● POST B — ○ comment
                   \            \
                    ○ comment    ○ comment
                                  \
                                   ○ reply

    ● = Post node (large, colored)
    ○ = Comment node (small, muted)
    — = Connection line
```

- **Infinite canvas** with no background limits
- **Gravity toward center** - nodes drift inward when idle (like Obsidian graph)
- **Repulsion between nodes** - they don't overlap
- **Drag any node** to reposition it temporarily
- **Zoom in/out** with scroll wheel or pinch
- **Pan** by clicking and dragging the background
- **Click a post bubble** to open the thread view

---

## Technology Choice

### Primary: `react-force-graph-2d`
- **Package:** `react-force-graph-2d` (npm)
- **Underlying engine:** `force-graph` which uses `d3-force` for physics + HTML Canvas for rendering
- **Why this library:**
  - Purpose-built for force-directed graphs in React
  - Canvas-based rendering (handles hundreds of nodes smoothly)
  - Built-in: drag, zoom, pan, click events, hover
  - Node/link customization via Canvas drawing callbacks
  - Actively maintained, good documentation
  - Small bundle size (~50KB gzipped)

### Alternative considered:
- **D3.js raw** - too much boilerplate for the same result
- **react-force-graph-3d** - 3D is overkill and harder to read
- **Cytoscape.js** - heavier, more for data analysis than interactive UIs
- **Sigma.js** - good but less React-friendly

---

## Data Model (Graph Format)

The API already returns posts and nested comments. Transform them into graph format:

```typescript
interface GraphNode {
  id: string;               // post or comment UUID
  type: 'post' | 'comment'; // determines size, color, behavior
  title?: string;           // post title (posts only)
  content: string;          // preview text
  author: string;           // username
  avatarUrl?: string;       // user avatar
  voteScore: number;        // affects node size
  commentCount?: number;    // posts only - affects connections
  createdAt: string;        // for "hot" sorting
  // Force-graph internal props (managed by library):
  x?: number;
  y?: number;
  fx?: number;              // fixed x (when user drags)
  fy?: number;              // fixed y (when user drags)
}

interface GraphLink {
  source: string;  // parent node id
  target: string;  // child node id (comment → post, reply → comment)
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}
```

### Data Transformation

```typescript
function postsToGraph(posts: PostDetail[]): GraphData {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  for (const post of posts) {
    // Add post as node
    nodes.push({
      id: post.id,
      type: 'post',
      title: post.title,
      content: post.content.substring(0, 100),
      author: post.user.username,
      avatarUrl: post.user.avatarUrl,
      voteScore: post.voteScore,
      commentCount: post.commentCount,
      createdAt: post.createdAt,
    });

    // Recursively add comments
    function addComments(comments: Comment[], parentId: string) {
      for (const comment of comments) {
        nodes.push({
          id: comment.id,
          type: 'comment',
          content: comment.content.substring(0, 60),
          author: comment.user.username,
          avatarUrl: comment.user.avatarUrl,
          voteScore: comment.voteScore,
          createdAt: comment.createdAt,
        });
        links.push({ source: parentId, target: comment.id });

        if (comment.replies?.length) {
          addComments(comment.replies, comment.id);
        }
      }
    }

    // Need a new API endpoint that returns posts WITH their comments
    // for the graph view, or fetch comments separately
  }

  return { nodes, links };
}
```

---

## New API Endpoint Needed

### `GET /api/posts/graph`

Returns all posts with their top-level comments (not deeply nested) for the graph view. Deep nesting is not useful in the graph - just show 1-2 levels.

```typescript
// Response shape
{
  posts: [
    {
      id: string,
      title: string,
      content: string,       // truncated
      voteScore: number,
      commentCount: number,
      user: { id, username, avatarUrl },
      createdAt: string,
      comments: [             // top-level only, max 10 per post
        {
          id: string,
          content: string,    // truncated
          voteScore: number,
          user: { id, username, avatarUrl },
          replyCount: number, // how many nested replies (shown as label)
        }
      ]
    }
  ]
}
```

**Why a separate endpoint:** The graph view needs lightweight data for ALL posts at once (titles, scores, comment counts) rather than full content for one post at a time. Loading full thread data for every post would be too heavy.

---

## React Component Architecture

```
ForumPage.tsx
├── GraphView.tsx              ← NEW: The main graph canvas
│   ├── ForceGraph2D           ← from react-force-graph-2d
│   ├── GraphOverlay.tsx       ← NEW: Top-right filter/control panel
│   └── NodeTooltip.tsx        ← NEW: Hover tooltip showing preview
├── ThreadPage.tsx             ← EXISTING: Opened when clicking a post node
└── CreatePostModal.tsx        ← EXISTING: Triggered from graph overlay button
```

### GraphView.tsx - Main Component

```tsx
import ForceGraph2D from 'react-force-graph-2d';
import { useCallback, useRef, useState, useEffect } from 'react';

export default function GraphView() {
  const graphRef = useRef();
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [showComments, setShowComments] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sort, setSort] = useState<'new' | 'hot' | 'top'>('hot');

  useEffect(() => {
    // Fetch graph data from API
    api.getPostsGraph(sort, searchTerm).then(data => {
      setGraphData(transformToGraph(data, showComments));
    });
  }, [sort, searchTerm, showComments]);

  // Custom node rendering on Canvas
  const paintNode = useCallback((node, ctx, globalScale) => {
    const isPost = node.type === 'post';
    const radius = isPost
      ? Math.max(8, Math.min(25, 8 + node.voteScore * 2)) // size by votes
      : 4;

    // Draw circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = isPost
      ? getColorBySort(node, sort) // e.g., hot = warm colors, new = cool
      : '#94a3b8';                  // muted gray for comments
    ctx.fill();

    // Draw border
    ctx.strokeStyle = isPost ? '#1e293b' : '#cbd5e1';
    ctx.lineWidth = isPost ? 2 : 0.5;
    ctx.stroke();

    // Draw title label for posts (only when zoomed in enough)
    if (isPost && globalScale > 0.7) {
      ctx.font = `${Math.max(10, 14 / globalScale)}px Inter, sans-serif`;
      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';
      ctx.fillText(
        node.title.length > 30 ? node.title.slice(0, 30) + '...' : node.title,
        node.x,
        node.y + radius + 12
      );
    }

    // Draw vote badge on posts
    if (isPost && globalScale > 0.5) {
      ctx.font = `bold ${10 / globalScale}px Inter`;
      ctx.fillStyle = node.voteScore > 0 ? '#22c55e' : '#ef4444';
      ctx.fillText(`${node.voteScore > 0 ? '+' : ''}${node.voteScore}`, node.x, node.y - radius - 5);
    }
  }, [sort]);

  return (
    <div className="relative w-full h-[calc(100vh-64px)]">
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        nodeCanvasObject={paintNode}
        nodePointerAreaPaint={(node, color, ctx) => {
          // Hit area for mouse events
          const r = node.type === 'post' ? 25 : 6;
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        }}
        onNodeClick={(node) => {
          if (node.type === 'post') {
            navigate(`/forum/${node.id}`);
          }
        }}
        onNodeHover={(node) => setHoveredNode(node)}
        linkColor={() => 'rgba(148, 163, 184, 0.3)'}
        linkWidth={1}
        backgroundColor="#0f172a"
        // Physics settings (Obsidian-like behavior):
        d3AlphaDecay={0.02}       // slow decay = nodes keep moving longer
        d3VelocityDecay={0.3}     // friction
        cooldownTime={5000}       // simulation runs for 5 seconds
        warmupTicks={50}          // initial positioning iterations
        // Force configuration:
        dagMode={null}            // no hierarchy, free-form
        enableNodeDrag={true}
        enableZoomPanInteraction={true}
      />

      {/* Overlay Controls */}
      <GraphOverlay
        search={searchTerm}
        onSearchChange={setSearchTerm}
        sort={sort}
        onSortChange={setSort}
        showComments={showComments}
        onToggleComments={() => setShowComments(!showComments)}
        onCenter={() => graphRef.current?.centerAt(0, 0, 1000)}
        onNewPost={() => setShowCreateModal(true)}
      />

      {/* Hover Tooltip */}
      {hoveredNode && <NodeTooltip node={hoveredNode} />}
    </div>
  );
}
```

---

## Physics Configuration (Obsidian-like Behavior)

The key to making it feel like Obsidian's graph view is in the D3 force configuration:

```typescript
// After the ForceGraph2D mounts, configure forces:
useEffect(() => {
  const fg = graphRef.current;
  if (!fg) return;

  // Center gravity - pulls everything toward (0,0)
  fg.d3Force('center', d3.forceCenter(0, 0).strength(0.05));

  // Node repulsion - prevents overlap
  fg.d3Force('charge', d3.forceManyBody()
    .strength(node => node.type === 'post' ? -150 : -30)
    .distanceMax(300)
  );

  // Link spring force - keeps connected nodes close
  fg.d3Force('link', d3.forceLink()
    .distance(link => {
      // Posts to comments: short distance
      return 40;
    })
    .strength(0.5)
  );

  // Collision prevention
  fg.d3Force('collision', d3.forceCollide()
    .radius(node => node.type === 'post' ? 30 : 8)
    .strength(0.7)
  );
}, [graphData]);
```

### Key Physics Parameters Explained:

| Parameter | Value | Effect |
|-----------|-------|--------|
| `center.strength` | 0.05 | Gentle pull to center (nodes drift back slowly) |
| `charge.strength` | -150 (posts) / -30 (comments) | How much nodes repel each other |
| `charge.distanceMax` | 300 | Repulsion only within this radius |
| `link.distance` | 40 | Desired distance between connected nodes |
| `d3AlphaDecay` | 0.02 | How fast simulation settles (lower = longer movement) |
| `d3VelocityDecay` | 0.3 | Friction (lower = more floaty, higher = more snappy) |
| `collision.radius` | 30/8 | Prevents nodes from overlapping |

---

## GraphOverlay.tsx - Control Panel

Positioned top-right, semi-transparent, like Obsidian's graph controls:

```tsx
function GraphOverlay({ search, onSearchChange, sort, onSortChange, showComments, onToggleComments, onCenter, onNewPost }) {
  return (
    <div className="absolute top-4 right-4 w-64 bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-700/50 p-4 space-y-3 z-10">
      {/* Search */}
      <input
        type="text"
        placeholder="Search posts..."
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        className="w-full bg-slate-800/60 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-400 border border-slate-600/50 focus:border-primary-500 outline-none"
      />

      {/* Sort Tabs */}
      <div className="flex gap-1">
        {['hot', 'new', 'top'].map(s => (
          <button
            key={s}
            onClick={() => onSortChange(s)}
            className={`flex-1 text-xs py-1.5 rounded-md capitalize ${
              sort === s ? 'bg-primary-600 text-white' : 'bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Toggles */}
      <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
        <input
          type="checkbox"
          checked={showComments}
          onChange={onToggleComments}
          className="rounded bg-slate-800 border-slate-600"
        />
        Show comments
      </label>

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={onCenter} className="flex-1 text-xs py-1.5 rounded-md bg-slate-800/60 text-slate-400 hover:text-white">
          Center View
        </button>
        <button onClick={onNewPost} className="flex-1 text-xs py-1.5 rounded-md bg-primary-600 text-white hover:bg-primary-500">
          + New Post
        </button>
      </div>

      {/* Stats */}
      <div className="text-xs text-slate-500 pt-1 border-t border-slate-700/50">
        {nodeCount} nodes · {linkCount} connections
      </div>
    </div>
  );
}
```

---

## Node Interactions

### Hover (NodeTooltip)
When hovering over a node, show a floating tooltip:
- **Post:** Title, author, vote score, comment count, creation date, content preview
- **Comment:** Author, content preview, vote score

### Click
- **Post node:** Navigate to `/forum/:id` (existing ThreadPage)
- **Comment node:** Navigate to `/forum/:postId` and scroll to that comment

### Drag
- Grab any node and move it around
- Node stays where you drop it (fixed position)
- Other nodes adjust via physics simulation
- Double-click a node to release it back to physics control

### Right-Click (optional future)
- Context menu: "Open in new tab", "View author profile", "Copy link"

---

## Performance Considerations

### For <100 posts (current scale): No issues
- Canvas rendering handles hundreds of nodes easily
- All data can be fetched in one API call

### For 100-500 posts: Minor optimizations needed
- Limit visible comments to top-voted only
- Implement viewport culling (don't render off-screen nodes)
- Paginate the API response

### For 500+ posts: Major optimizations
- Use WebGL renderer (`react-force-graph-2d` supports it)
- Virtual scrolling of nodes
- Cluster distant nodes into summary bubbles
- Load detail on zoom

**Recommendation:** Build for the simple case first (<100 posts). This is a school class project - you won't hit scale issues.

---

## View Toggle: Graph vs List

Keep the existing Reddit-style list view as an alternative. Add a toggle button:

```
[Graph View 🔮] [List View 📋]
```

- Default: Graph View (the new feature)
- List View: The existing ForumPage layout
- User preference saved to localStorage

---

## Color Scheme for Nodes

### By Sort Mode:
- **Hot:** Warm gradient (red → orange → yellow based on hotness score)
- **New:** Cool gradient (purple → blue → cyan based on recency)
- **Top:** Green gradient (dark green → bright green based on vote score)

### Node States:
- **Default:** Sort-colored fill, dark border
- **Hovered:** Brighter fill, glow effect, slightly larger
- **Own posts:** Golden border ring
- **Searched match:** Pulsing highlight, everything else dims
- **Dragging:** Slight scale up, drop shadow

---

## Implementation Steps

### Step 1: Install dependency
```bash
npm install react-force-graph-2d
```

### Step 2: Create new API endpoint
`GET /api/posts/graph` - returns lightweight post+comment data

### Step 3: Build GraphView component
- Canvas with ForceGraph2D
- Custom node painting
- Physics configuration
- Click/hover handlers

### Step 4: Build GraphOverlay component
- Search, sort, toggles
- Positioned absolute top-right

### Step 5: Build NodeTooltip component
- Floating tooltip on hover

### Step 6: Update ForumPage routing
- Add view toggle (graph/list)
- Default to graph view
- Preserve list view as option

### Step 7: Polish
- Animations on search (dim non-matching nodes)
- Smooth zoom transitions
- Mobile touch support (pinch zoom, drag)
- Loading state (skeleton or spinner while graph computes)

---

## Dependencies to Add

```json
{
  "react-force-graph-2d": "^1.25.0"
}
```

No other new dependencies needed - we already have:
- Framer Motion (for UI transitions in overlay)
- React Router (for navigation on click)
- TailwindCSS (for overlay styling)

---

## Mobile Considerations

- **Touch drag:** Works out of the box with react-force-graph-2d
- **Pinch zoom:** Supported natively
- **Overlay:** Collapse to a floating action button (FAB) on mobile, expand on tap
- **Node labels:** Only show on tap (not hover) on mobile
- **Minimum node size:** 44px touch target for posts, tap anywhere near comment nodes

---

## File Paths (for implementation)

```
frontend/src/
├── pages/
│   ├── ForumPage.tsx          ← MODIFY: add view toggle, import GraphView
│   └── ThreadPage.tsx         ← KEEP: unchanged, reached via node click
├── components/
│   └── forum/
│       ├── GraphView.tsx      ← NEW: main force-graph canvas
│       ├── GraphOverlay.tsx   ← NEW: top-right control panel
│       └── NodeTooltip.tsx    ← NEW: hover preview tooltip
├── services/
│   └── api.service.ts         ← MODIFY: add getPostsGraph() method
└── types/
    └── index.ts               ← MODIFY: add GraphNode, GraphLink types

backend/src/
└── routes/
    └── post.routes.ts         ← MODIFY: add GET /api/posts/graph endpoint
```
