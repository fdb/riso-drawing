# Riso scene DSL

A 2D procedural graph for building every world in the film as data, in the spirit of Houdini
SOPs and COPs, or vvvv. Small nodes build geometry, fields and ink marks; marks are rasterized
into three stencils; pixel nodes halftone, register and ink them over paper. One graph goes from
the first circle to the finished print. Subnets bundle graphs into reusable parts.

## Granularity

One rule for the whole library, so that geometry and pixels feel like one language:

- **A base node is one kernel over one element type with a flat parameter schema.** The element
  types are points, primitives, marks and pixels. `wave` bends points, `filter` keeps primitives,
  `stroke` turns primitives into a mark, `compare` maps two pixels to one.
- **A mode that selects a different algorithm is a separate node.** `add`, `multiply`, `max` and
  `min` are four nodes, not one node with an operator parameter.
- **A mode that only changes the meaning of the same kernel is a parameter.** Which ink a mark
  goes to, whether it adds, cuts, or knocks the other inks out, which stencil to pick.
- **Anything made of base nodes is a subnet, in data.** `jellyfish` is 45 geometry nodes.
  `risoInk` is 27 pixel nodes. `risoPrint` is paper and three `risoInk` instances multiplied.
  A subnet has a parameter schema, optional inputs, optional `let` values and a transform.
- **Each element type has one expression escape hatch.** `wrangle` for points, `attr` for
  primitives, `field` for a function of x and y, `pixel` for pixels. Everything else is a fixed
  kernel with sliders.
- **Special cases are nodes too.** The fused compositor used to skip empty pixels and keep solid
  areas solid inside one loop. In the graph these are a `compare` gate and a `max` with a
  `constant`, visible and editable.

| File | Role |
|---|---|
| `engine/riso.js` | Print engine. Three ink stencils, halftone, registration, grain, multiply over paper. |
| `engine/graph.js` | The DSL: value types, expressions, geometry and mark catalog, evaluator, mark painter. |
| `engine/cops.js` | The pixel layer: image values, the pixel catalog, previews of any value. |
| `engine/library.js` | Subnets as pure data: `water`, `stars`, `bubble`, `jellyfish`, `risoInk`, `risoPrint`. |
| `engine/scenes.js` | The `jelly` scene graph and the print defaults. |
| `engine/scene.js` | Runtime: iris timing, static-prefix cache, one call per frame. |
| `editor/` | The node-based editor app (see `editor/README.md`). |
| `jelly.html` | Headless still. `?f=` frame at 24 fps, `?s=` seed, `?res=`, `?hold`. |
| `render.sh`, `render-anim.sh` | One frame to PNG, or a frame sequence to mp4. |

## Values

Three value types flow between nodes.

**Geometry.** A list of primitives. Each primitive is a polyline or polygon with per-primitive
attributes, optional per-point widths, and optional per-point attributes such as the angle along
a circle or the tangent at a sampled point.

```
{ prims: [ { pts: [[x,y]…], closed, attrs: {…}, pw: [w…] | null, pa: { a: […] } | null } ] }
```

**Field.** A scalar function of position, `sample(x, y) → 0..1`. Used for halftone tints.

**Marks.** An ordered list of ink instructions. Order is draw order.

```
{ kind: fill | stroke | tint | dots | glow | mask, ink, mode, tone, geo, w, field, cell, angle, clip: [geo…] }
```

`ink` is `blue`, `pink`, `yellow` or `all`. `mode` is `add` (ink on top), `solid` (knock the other
inks out first, then print), or `cut` (remove ink down to paper).

**Stencils.** Three one-channel images, the painted marks: `{ blue, pink, yellow }`.

**Image.** A square raster at the render resolution, one channel (coverage or tone) or three
(RGB): `{ w, ch, data: Float32Array }`. Parameters of pixel nodes are in scene units like
everything else; kernels convert.

## Expressions

Any parameter can be a number or an expression string. Expressions see:

| Symbol | Meaning |
|---|---|
| `t` `u` `f` `iris` | seconds since start, seconds since this shot's iris opened, frame index, iris scale 0..1 |
| `$name` | a subnet parameter or a `let` value |
| `@name` | an attribute of the current point, primitive or copy: `x y v i n u px py a w pw k` and anything set by `attr` |
| `rand(k)` | stable random 0..1 for the current graph path, copy and point, keyed by `k` |
| `noise(x,y,scale,seed)` `radial(x,y,cx,cy,r)` `dist(…)` `clamp(v)` `ease(v)` | field helpers |
| `cell.blue` `angle.blue` | the print screens, so tints can follow the halftone settings |

Randomness is a hash of the node path, not a sequence. Changing one parameter never reshuffles
another node's random choices.

## Node catalog

Generators make geometry: `circle`, `ellipse` (also arcs), `rect`, `line`, `wave` (sine or
scallops), `rays`, `walk` (a turtle with a turn expression), `lens`, `scatter`, `point`.

Operators reshape it: `transform`, `wrangle` (per-point expressions for x, y and width), `attr`
(per-primitive attributes from expressions), `filter`, `join`, `reverse`, `slice`, `pointsAlong`
(sample points with tangents along a curve), `copy` (evaluate a template graph once per copy or
once per input point, with `@i @n @u @px @py @a`), `merge`.

`field` builds a field from an expression of `@x @y`.

Mark nodes turn geometry into ink: `fill`, `stroke` (uses per-point widths when present), `tint`
(dot screen of a field inside a shape), `dots` and `glow` (at points, radius per point), `mask`
(keep inside), `clip` (restrict a list of marks to a shape).

Pixel nodes (the compositing layer). Sources: `rasterize` (marks → stencils), `stencil` (pick
one), `paper`, `screen` (the halftone threshold pattern for a cell and angle), `noise`, `random`
(grain, with a block size), `constant`. Operators: `shift` (registration: offset and rotation),
`remap` (0..1 → lo..hi), `add`, `multiply`, `max`, `min` (n-ary, 1 and 3 channels mix), `compare`
(soft step of a against b), `ink` (coverage → RGB transmittance of an ink colour), `pixel`
(an expression of `@a @b @x @y`). Any node's value can be shown in the viewport: a 1-channel image
draws as black on white, a 3-channel image as is, stencils and marks as a flat proof, geometry as
outlines, a field as a sampled grid.

The halftone, as data, in `risoInk`: `stencil → shift → multiply(noise tone) → add(grain edge) →
compare(screen) → max(solid where the stencil is nearly full) → multiply(gate, density, mottle,
grain, speckle) → ink`. `risoPrint` multiplies paper with three of these.

Every node also accepts `when` (an expression; falsy gives empty output) and `enabled`.

## Subnets

A subnet is a graph with a parameter schema, optional `let` values, and an optional transform.
It is used as a node type. The library is pure JSON, editable in the lab.

```js
LIB.jellyfish = {
  params: { x, y, r, rot, tentacles, length, thick, curl, glow, sway, swaySpeed, pulse, bob },
  xf: { x: '$x', y: '$y + $bob*sin(t*1.1+$ph0)', rot: '$rot + 0.01*sin(t*0.7+$ph0)' },
  graph: {
    let: { ph0: 'rand(0)*TAU', ry: '$r*0.78*(1+$pulse*sin(t*3+$ph0))', … },
    nodes: {
      tent: { type: 'copy', params: { n: '$tentacles' }, template: { … line → attr → wrangle … } },
      thin: { type: 'filter', in: { geo: 'tent' }, params: { expr: '!@thick' } },
      thinS: { type: 'stroke', in: { geo: 'thin' }, params: { ink: 'pink', mode: 'solid' } },
      …
      out: { type: 'merge', in: { list: [ … draw order … ] } },
    },
    output: 'out',
  },
};
```

The jellyfish is 45 nodes. Reading it top to bottom is reading how the picture is made: lines
become ribbons through a wrangle, a filter splits thick from thin, points sampled along the thick
ones receive copied lens shapes that cut holes, a dome joins a scalloped wave into the bell, an
inner ellipse holds three tints and a fan of rays, an arc with a sine width cuts the highlight.

## A scene

```js
{
  seed: 5,
  transition: { type: 'iris', open: 0.17, hold: 0.5, close: 0.17, gap: 0.3 },
  graph: {
    nodes: {
      disc:  { type: 'circle', params: { x: 660, y: 535, r: 313 } },
      water: { type: 'water' },
      big:   { type: 'jellyfish', params: { x: 674, y: '358 - 10*u', r: 140, tentacles: 24 } },
      world: { type: 'merge', in: { list: ['water', 'stars', 'small-left', 'small-right', 'big', 'bubble'] } },
      worldClip: { type: 'clip', in: { marks: 'world', geo: 'disc' } },
      irisC: { type: 'circle', params: { x: '540 + iris*120', y: '542 - iris*7', r: 'max(0, iris*318 - 5)' } },
      irisMask: { type: 'mask', in: { geo: 'irisC' } },
      ring:  { type: 'wrangle', in: { geo: 'ringC' }, params: { x: '@x + cos(@a)*(…wobble…)', … } },
      out:   { type: 'merge', in: { list: ['worldClip', 'irisMask', 'ringB', 'ringY'] } },
    },
    output: 'out',
  },
}
```

The iris, the ring and the disc are ordinary nodes. The runtime only supplies `iris` and time.

## Evaluation

- Nodes are evaluated lazily and memoised per frame by graph path.
- Dynamism is measured, not guessed. Reads of `t`, `u`, `f` and `iris` are recorded while a node's
  parameters evaluate; a value is dynamic when its node read time, an input value was dynamic, or
  an enclosing subnet's parameters or `let` values read time. Inputs to a subnet keep their own
  flag and flow through `input` nodes. Static pixel rasters are computed once and kept across
  frames; `rasterize` paints the static prefix of its marks once and restores it. With tremor off,
  the grain seed expression never reads `f`, so the grain stays cached.
- `let` values of enclosing graphs stay visible inside subnets, so the scene's screen cells feed
  both the geometry tints and the print.
- Subnet transforms apply to geometry, widths, tint cells, clip shapes and fields, so a subnet
  renders the same at any position and scale.

## Read from the film

- One blue dot with a pink centre sits at canvas position (540, 540) in every shot. Worlds appear
  around it and transitions scale about it.
- Worlds are shown full bleed, in a disc, or as thumbnails in an index and a blue-only "gather" shot.
- Transitions: iris (measured: 4 frames out, 12 hold, 4 in), ripples of blue arcs, and orbiting
  pink and blue circles.
- Motion inside a world is small: sway, pulse, twinkle, rain, flames.

## Next

Modeling nodes the other worlds need: `text` (hand-drawn polylines), `streaks` (rain, waterfall,
flames as tapered lines with flow), `silhouette` helpers (edge noise on a polygon), `stripes`, and
most of all `world`, which embeds another scene at a position and scale with an ink mapping so the
index and gather shots can be built. Ink mapping needs one engine feature: route one stencil's
calls to another while a map is active.

Film-level data on top: `shots: [{ world, at, in, out }]` with the iris timing per shot.

The compositing layer is the `risoPrint` subnet. A film-level print means one `risoPrint` per
shot with shared parameters through scene `let` values.

## Editor

`editor/` is a React app: a wired node graph view with pan and zoom, drag-to-wire, a search
palette to add any catalog node or subnet, diving into subnets and copy templates with
breadcrumbs, an inspector generated from the parameter schemas, the print tab (the `risoPrint`
node's parameters), a display flag on any node so the viewport shows that value, undo/redo for
every change including slider drags, autosave, and JSON export/import. Next: canvas gizmos for
positions and radii, a timeline strip, a world index.
