# Spec: offset, soft cut, stripes

Status: proposed, not started.

Three additions that the world builders asked for while they built the film. Each section says
what the addition does, where it lives, its interface, how it runs on the CPU and the GPU, and
how to test it. The last section lists the decisions that are still open.

## The rule that decides where each one lives

From `DSL.md`:

- A **block** is code in `engine/`. It earns its place only when it cannot be composed from
  existing blocks and more than one case needs it.
- A **graph function** is data made of blocks. It lives in a project until a second project needs
  it; then it moves to `engine/functions.js`.
- A mode that changes the algorithm is a separate node. A mode that changes only the meaning of
  the same kernel is a parameter.

Result:

| Addition | Kind | Where |
|---|---|---|
| Offset | new geometry block `offset` | `engine/graph.js`, plus a polygon kernel |
| Soft cut | a `mode` parameter on the `tint` block | `engine/graph.js`, `engine/riso.js`, `engine/gpu-raster.js` |
| Stripes | graph function `stripes` | `projects/film/functions/stripes.js` |

## Evidence from the builders

The evidence is weaker than a count of worlds suggests. Build each one against the two worlds
named in its "Prove it" step, and stop if it does not simplify them.

| Addition | Asked for by | Worlds |
|---|---|---|
| Offset | three builders | frog (moon rim), telephone (cup echoes), radio (edge-coloured brush strokes); a "polygon offset block" without a world |
| Soft cut | two builders | cat (lamp glow on a dark wall), kettle (steam edge); a "field-driven halftone cut for soft fog" without a world |
| Stripes | one builder, plus a reading of the worlds | bats (cliff strata); balloons, bell and rain are candidates |

---

## 1. Offset

### What it does

Moves an outline outward or inward by a fixed distance, measured at a right angle to the
outline at every point. A negative distance insets.

Today builders scale a copy of the shape. That is correct only for circles about their centre.
On any other shape the gap is uneven, and an inset of a concave shape crosses itself.

### Interface

```js
def('offset', { label: 'Offset outline', cat: 'geo', out: 'geo', inputs: ['geo'],
  params: {
    d:     N(8, -200, 200, 0.5, 'distance (px); negative insets'),
    join:  { def: 'round', kind: 'text', label: 'round | miter | square' },
    miter: N(2, 1, 10, 0.1, 'miter limit, in multiples of d'),
    step:  N(2, 0.25, 20, 0.25, 'max segment length on round joins (px)'),
  } });
```

`join` is a parameter, not three nodes: the kernel is the same, only the corner shape differs.

### Behaviour

- **Closed primitives.** All closed primitives of the input form one shape under the nonzero
  rule, the same rule `fill` paints with. The block offsets that shape as a whole. So holes shrink
  when the shape grows, touching parts merge, and thin parts that an inset removes disappear. The
  output can have more or fewer primitives than the input.
- **Open primitives.** Each open primitive becomes one parallel curve at distance `d`. Positive
  `d` is on the side the `@nx @ny` normal points to after `resample`: `(−ty, tx)`, so for a line
  drawn left to right, positive `d` is below it (larger y). Self-crossings of a parallel curve are not removed.
- **Orientation.** Output closed primitives are counter-clockwise for outer boundaries and
  clockwise for holes, so a later `offset` or `fill` reads them the same way.
- **Attributes.** Primitive attributes are copied to every output primitive that comes from
  them. When outputs merge, the first input primitive wins. Point attributes and per-point
  widths (`pw`) are dropped, because output points do not match input points. Run `resample`
  after `offset` to get `@u @tx @ty @nx @ny` again.
- **`d = 0`.** Returns the input unchanged.
- **Per-copy distance.** `d` is an ordinary parameter, so inside a `copy` template it can read
  `@i` or `rand()`.

### Implementation

A correct inset needs polygon boolean operations: offset every edge, then take the union under
the nonzero rule to remove the parts that folded over. There is no boolean kernel in the engine.

Two ways, see the open questions:

1. **Vendor a polygon clipping library** as one ES module in `engine/vendor/`. Clipper2 has an
   offset operation built on its union. The engine has no build step and loads from `file://`,
   so the module must be plain ESM with no imports.
2. **Write the kernel.** Edge offset with joins, then a nonzero union by sweep-line. This is more
   code to maintain and to get robust on degenerate input.

Either way the kernel also gives an `intersect` block (shape ∩ shape), which is on the wish list.
Build `offset` first; add `intersect` as its own block when a world needs it.

Coordinates: scale to integers before the union (for example ×100) and back after, so collinear
and touching edges resolve the same way on every run.

GPU: none. `offset` is a geometry block; its output reaches the GPU as ordinary marks.

### Tests

Geometry tests run in Node on `evalScene` with a probe on the `offset` node:

- A 100×100 square inset by 10 is an 80×80 square with the same centre.
- A circle of radius 50 offset by 10 has an area within 1% of π·60².
- A five-point star inset until its arms vanish returns only the centre part, and no output
  primitive crosses itself.
- Two squares 10 px apart, each offset by 6, return one primitive.
- An annulus (outer circle, inner reversed circle) offset by 5 has a larger outer radius and a
  smaller inner radius.
- A horizontal open line from left to right, offset by 10, lies 10 px below it (larger y).
- `d = 0` returns geometry equal to the input.
- The same input gives the same output twice.

### Prove it

Rebuild two worlds with `offset` and compare renders:

- **frog:** the moon's paper rim as `offset` of the moon disc with a negative `d`.
- **telephone:** the broken echo arcs around the cups as `offset` of the cup outline.

The block stays only if both graphs get smaller and both renders look the same or better.

---

## 2. Soft cut

### What it does

Knocks ink back to paper with a strength that varies over the shape, as a halftone of paper dots.
Full strength is a hard cut. Zero strength leaves the ink.

Today a cut is all or nothing. A `tint` can fade, but only adds ink. A glow on a dark ground or a
steam edge that dissolves has to be faked with scattered dots.

### Interface

`tint` gets a `mode` parameter, and its `ink` accepts `all`:

```js
def('tint', { label: 'Halftone tint', cat: 'mark', out: 'marks', inputs: ['geo', 'field'],
  params: { ink: INK('blue'), mode: MODE('add'), cell: E('cell.blue'), angle: E('angle.blue') } });
```

- `mode: 'add'` is the current behaviour, unchanged.
- `mode: 'cut'` punches the same dot grid out of the ink, or out of every ink with `ink: 'all'`.
- `mode: 'solid'` is not supported for tints. The editor offers `add` and `cut` only.

This is a parameter, not a new node: the kernel (a dot grid sized by the field, clipped to the
shape) is the same; only the operation on the stencil changes.

### Behaviour

- Dot placement, size and the full-coverage threshold are exactly those of `tint` today: a dot at
  every grid cell with tone above 0.03, radius `cell·√(t/π)·1.06`, and radius `cell·0.75` at tone
  0.97 or more, so a full field closes into a solid knockout.
- The dots are clipped to the input shape, like `tint` today.
- `cell` and `angle` default to the blue screen. For a knockout that sits calmly over all three
  inks, choose a cell and angle that differ from all three print screens, or the dot grid will
  beat against one of them. Document this on the parameter.
- Order matters as with every mark: a soft cut removes ink painted before it and not ink painted
  after it.

### Implementation

- **graph.js:** `tint` passes `mode` into the mark.
- **CPU (`engine/riso.js`, `Sep.tint`):** for `cut`, draw the same dot path with black instead of
  white under `source-over`, as `Sep.cut` does. `paintMarks` calls it through `eachInk` so
  `ink: 'all'` reaches every stencil.
- **GPU (`engine/gpu-raster.js`, `planTint`):** return `ops` from the shared `opsFor(m)` instead
  of `{ [m.ink]: 'add' }`. The coverage path already composites `cut` ops with
  `dst·(1 − src)`, so no new shader or pipeline is needed.

### Tests

- `raster-test.html` gets a scene with soft cuts on one ink and on `all`, clipped and unclipped.
  GPU matches CPU under the existing threshold.
- A soft cut with field `1` over a solid fill matches `fill` with `mode: 'cut'` on the same shape,
  apart from the dot edge at the shape boundary.
- A soft cut with field `0` changes no pixel.
- Every existing scene renders identically before and after, because `add` is the default.
  Compare all 34 worlds at one frame, pixel for pixel.

### Prove it

- **cat:** replace the scattered-dot lamp halos with a radial soft cut on a dark wall.
- **kettle:** replace the hard steam knockout with a hard core plus a soft cut at the edge.

---

## 3. Stripes

### What it does

Fills a shape with parallel strokes at an angle: strata, hatching, rain, gores.

### Why it is a graph function

Every step exists as a block: `line`, `copy`, `transform`, `hand`, `stroke`, `crop`. The builders
wired these by hand each time. One function removes that repetition without new engine code.
It lives in the film project; it moves to `engine/functions.js` when a second project uses it.

### Interface

```js
LIB.stripes = {
  label: 'Stripes',
  inputs: ['geo'],                     // the shape to fill
  params: {
    spacing: Q(12, 2, 200, 0.5, 'distance between stripes (px)'),
    angle:   Q(0, -3.15, 3.15, 0.01, 'direction (rad)'),
    w:       Q(3, 0.2, 60, 0.1, 'stroke width (px)'),
    ink:     { def: 'blue', kind: 'ink' },
    mode:    { def: 'add', kind: 'mode' },
    tone:    Q(1, 0, 1, 0.01),
    wobble:  Q(0, 0, 30, 0.1, 'hand wobble (px), 0 = ruler straight'),
    phase:   Q(0, 0, 1, 0.01, 'shift across stripes, 0..1 of spacing'),
  },
  // output: marks
};
```

### Graph

```
line (-L, 0) → (L, 0), resampled        the template: one long horizontal line
copy n = ceil(2L / spacing)             stamp y = (@i − n/2 + $phase) · $spacing
hand                                    wobble = $wobble (bypassed when 0)
transform x 540, y 540, rot $angle      turn the set about the frame centre
stroke ink, mode, tone, w
crop by the input shape
```

`L` covers the frame diagonal at any angle (about 800 px from the centre). Stripes are cropped at
the mark level, so the output is marks, not geometry.

`transform` rotates about the origin and then translates, so the template is centred on the
origin and the set turns before it moves to the frame centre. Verify while building that a
bypassed `hand` passes geometry through.

### Limits

- Stripes are straight and parallel. Stripes that follow a curved surface (balloon gores) are out
  of scope; build those with `copy` and `wrangle` in the world.
- The output is marks, so a later geometry node cannot use the stripes. When a world needs stripes
  as geometry inside a shape, that is the case for the `intersect` block from section 1.
- Every stripe spans the frame, so a tiny shape still pays for full-length strokes before the
  crop. Accept this until a render shows it matters.

### Tests

- A 200×200 square with spacing 20 and angle 0 shows ten stripes.
- Angle π/2 gives vertical stripes.
- Phase 0.5 moves every stripe by half the spacing.
- GPU matches CPU on a scene that uses it (`frames-test.html`).

### Prove it

- **bats:** the cliff strata as `stripes` with wobble, cropped to the cliff.
- One more of **bell** (hatching), **cat** or **lighthouse** (rain). Check each graph first and
  pick the one where stripes remove the most nodes.

---

## Order of work

1. Soft cut: smallest change, no new kernel, strict regression test on all worlds.
2. Stripes: data only, no engine change.
3. Offset: needs the decision on the polygon kernel.

Each step ends with its tests green, the two proof worlds rebuilt and compared, `DSL.md` updated
(catalog and wish list), and the editor tests passing.

## Open questions

1. **Polygon kernel for offset:** vendor a Clipper2 port as one ES module, or write offset and
   union in the engine? Check the licence and the size of the port before deciding.
2. **Soft cut `solid` mode:** a tint that adds to one ink and punches the same dots from the
   others. No world asks for it yet; leave it out until one does.
3. **Stripes on geometry:** if a world needs stripes as geometry, add `intersect` then, or make
   `stripes` accept an option to return uncropped geometry and leave the crop to the caller.
