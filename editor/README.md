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

The engine is imported from `../engine/` so the headless render page and the editor share it.

## Layout

- **Toolbar**: undo / redo, play / pause / step / rewind, hold-only loop, speed, render size, the
  displayed node, export / import JSON, reset, theme.
- **Viewport**: the root scene, re-rendered every frame while playing. Paused frames re-render on
  any document change. The HUD shows time, phase, iris, frame cost, mark count and cache hits.
- **Inspector**: the selected node (id, enabled, `when`, parameters with ƒ expression toggles,
  attributes, wired inputs) or, with nothing selected, the current graph (output, `let` values,
  scene seed and iris timing, subnet label and transform).
- **Print**: the `risoPrint` node's parameters. Open the subnet in the graph to see the halftone
  built from pixel nodes.
- **Graph**: the node graph. Drag nodes, drag an output port onto an input port to wire, click an
  edge to select it, double-click a subnet or copy node to dive in, breadcrumbs to go back. The
  small circle at a node's bottom right is its display flag: the viewport shows that node's value.

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

The document is `{ scene, lib }`. Every change goes through `commit(fn)` on a structured
clone, which is one undo step. Slider drags use `beginDrag / drag / endDrag` so a whole drag is
one step. The document autosaves to localStorage.

Not used from the stack: Hono, D1, TanStack Query. The editor has no server state.
