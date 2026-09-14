# Riso Editor

A node-based editor for the Riso scene DSL. React 18 + Vite + TypeScript, Zustand for state,
vanilla OKLCH CSS with light and dark themes, Vitest and Playwright.

```
npm install
npm run dev          # http://localhost:5174
npm run typecheck
npm test             # store history and graph operations
npm run test:e2e     # Playwright: render, select, undo/redo, palette, dive into a subnet
npm run build        # static site in dist/ (deployable to Cloudflare Pages)
```

The core is imported from `../engine/`, the project's functions and scenes from `../projects/film/`;
the headless render page uses the same two modules.

## Layout

Three columns: project and parameters on the left, the network in the middle, the viewer on the
right.

- **Project**: the scenes. `main` is the composition (shots of the other scenes); every other
  scene is a world. Add, duplicate, delete. Opening a scene shows it in the viewer and puts its
  graph in the network.
- **Toolbar**: undo / redo, play / pause / step / rewind, hold-only loop, speed, render size, the
  displayed node, export / import JSON, reset, theme.
- **Viewer**: the open scene, re-rendered every frame while playing. Compositions loop over their duration. Paused frames re-render on
  any document change. The HUD shows time, phase, iris, frame cost, mark count and cache hits.
- **Parameters**: the selected node (id, enabled, `when`, parameters with ƒ expression toggles,
  attributes, wired inputs) or, with nothing selected, the scene (about, seed, duration, iris
  timing, a shortcut to the print node) and the graph (marks node, output, `let` values).
- **Network**: the node graph, top to bottom. Inputs sit on a node's top edge, its output at the
  bottom. Drag nodes, drag an output port onto an input port to wire, click an edge to select
  it, double-click a subnet or copy node to dive in, breadcrumbs to go back. Every node has a
  render flag (eye): the viewer shows that node's value. Nodes with an input of their own kind
  also have a bypass flag: the input passes through untouched. Dark theme by default.

## Keys

| Key | Action |
|---|---|
| ⌘Z / ⇧⌘Z | undo / redo |
| Tab | add node (search palette) |
| Delete | remove the selected node or edge |
| ⌘D | duplicate the selected node |
| Space | play / pause |
| Escape | close palette, clear selection |

## Model

The document is `{ scenes, lib }`. Every change goes through `commit(fn)` on a structured
clone, which is one undo step. Slider drags use `beginDrag / drag / endDrag` so a whole drag is
one step. The document autosaves to localStorage.

Not used from the stack: Hono, D1, TanStack Query. The editor has no server state.
