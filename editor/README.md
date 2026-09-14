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
- **Viewer**: the open scene, rendered in a worker that owns the canvas, so editing never waits
  for a frame. One frame is in flight at a time. With WebGPU the pixel chain runs on the GPU and
  the HUD says `gpu`; add `?cpu` to the URL to force the CPU path. Compositions loop over their
  sequence's length. Paused frames re-render on
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

## Projects

A project is a folder on disk. The editor opens it with the File System Access API and writes
changes back into it. No server, no account.

```
my-film/
  riso-project.json        { "format": 1, "name": "my-film", "scenes": [...], "functions": [...] }
  scenes/<name>.json       one SceneDoc per scene
  functions/<name>.json    one SubnetDoc per project function
```

Every file is pretty-printed JSON with a trailing newline, so a project folder diffs well and
can live in git. The manifest lists scenes and functions in document order. A file the manifest
does not list is loaded too, after the listed ones. Other files in the folder are left alone.
Names that are not safe file names are percent-encoded (`a/b` → `a%2Fb.json`). The in-app
document stays `{ scenes, lib }`; `src/lib/projectFormat.ts` converts both ways.

The project menu sits above the scene list:

- **Open…** picks a folder and switches to the project in it.
- **New from film…** / **New empty…** pick an empty folder and write a starting project into it:
  the built-in film, or one empty scene. A folder that already holds a project is refused.
- **Autosave**: one second after a change, the files whose content changed are written and the
  files of removed scenes and functions are deleted. The status shows `saved`, `saving…`,
  `unsaved` or `save failed` (with a **Save** button to retry). `not on disk` means no folder is
  open: the document lives in memory and autosaves to localStorage, as before.
- **Reopen on reload**: the folder handle is kept in IndexedDB. Chrome usually needs consent
  again after a reload; the menu then shows **Grant access** (a permission request needs a
  click). Until it is granted the editor shows the in-memory document.
- **Close** (×) forgets the folder. The document stays open in memory.

Export / import JSON in the toolbar still move the whole document as one file. Import into an
open folder writes the imported document into that folder. Reset does the same with the
built-in film.

Browser support: Chrome and Edge (desktop) have `showDirectoryPicker`. Firefox and Safari do
not; the menu says so and disables the folder buttons, and export / import JSON remain the way
to move a project around.
