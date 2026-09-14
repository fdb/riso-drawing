// gpu-raster.js — marks painted onto the ink stencils with WebGPU render passes.
//
// One render pass per ink. The target is an r8unorm texture at twice the stencil resolution with
// 4× MSAA (16 samples per stencil pixel, box-averaged at the end) and the blend state does
// what Sep does with canvas composite modes: add = screen, src·(1−dst) + dst; cut = dst·(1−src).
// Polygons use the stencil-buffer nonzero trick: a triangle fan from the first vertex increments
// the stencil count on front faces and decrements it on back faces, then a quad over the bounding
// box paints where the count is nonzero and resets it. Bits 0..6 hold that count; bit 7 marks the
// pixels inside the mark's clip shapes.
// Dots and tint marks are one filled path on the canvas, so their circles must form a union before
// compositing: they are drawn as instanced quads with analytic edge coverage into a scratch rgba8
// texture with additive blending (four marks per texture, one per channel), and a quad then
// composites that coverage into the ink target. Glows composite one by one, as the canvas does.
// At the end of a pass the MSAA target resolves into a single-sample texture that a compute pass
// averages down into an rgba32float GpuImage.
//
// gpu.rasterize(marks, res, state) → { blue, pink, yellow }. `state` is per call site. When the
// caller sets state.staticCount = k and state.staticKey, the stencils after the first k marks are
// kept in state.snapshot and only re-rendered when the key changes; a frame then starts by copying
// the snapshot into the target and paints the marks from k on.

import { INKS, U, TAU } from './riso.js';
import { geoBounds } from './graph.js';

const CLIP = 0x80, WIND = 0x7F, SAMPLES = 4, SS = 2, FORMAT = 'r8unorm', STENCIL = 'stencil8', SCRATCH = 'rgba8unorm';

// WGSL for the y of a packed 9-vertex polyline at ax: vertex k's x is float k, its y float 9 + k
const at = (pack, k) => `${pack}${k >> 2}.${'xyzw'[k & 3]}`;
const piecewise = pack => at(pack, 9) + [...Array(8).keys()].map(k =>
  ` + (${at(pack, 10 + k)} - ${at(pack, 9 + k)}) * clamp((ax - ${at(pack, k)}) / max(${at(pack, k + 1)} - ${at(pack, k)}, 1e-6), 0.0, 1.0)`).join('');

const WGSL = `
const SS = ${SS}.0;   // ink target pixels per stencil pixel
struct P { res: f32, }
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var src: texture_2d<f32>;

struct VOut { @builtin(position) pos: vec4f, @location(0) @interpolate(flat) v: f32, }
@vertex fn vsPoly(@location(0) xy: vec2f, @location(1) v: f32) -> VOut {
  var o: VOut; o.pos = vec4f(xy, 0.0, 1.0); o.v = v; return o;
}
@fragment fn fsAdd(i: VOut) -> @location(0) vec4f { return vec4f(i.v, 0.0, 0.0, 1.0); }
@fragment fn fsCut(i: VOut) -> @location(0) vec4f { return vec4f(1.0, 0.0, 0.0, 1.0); }

// Circle coverage the way the canvas rasterizes an arc path (Skia). Each quarter-circle conic
// becomes 2^pow2 quadratic Béziers (tolerance 1/4 px); coordinates truncate to 1/256 px; each
// Bézier is walked top-down as 2^shift line segments (SkEdge diff_to_steps): the start y snaps
// to 1/4 px and that offset carries into the later points, which snap to 1/4 px as well, or to
// whole pixels along the segment slope when a step is 2 px or taller (SkAnalyticQuadraticEdge).
// The vertex stage builds the polylines; the fragment integrates the area between them. QUADS holds the unit
// quarter from angle 0 to 90° for pow2 = 0, 1, 2; both halves of the circle are mirror-symmetric.
var<private> QUADS = array<vec2f, 21>(
  vec2f(1.0, 0.0), vec2f(1.0, 1.0), vec2f(0.0, 1.0),
  vec2f(1.0, 0.0), vec2f(1.0, 0.414214), vec2f(0.707107, 0.707107), vec2f(0.707107, 0.707107), vec2f(0.414214, 1.0), vec2f(0.0, 1.0),
  vec2f(1.0, 0.0), vec2f(1.0, 0.198912), vec2f(0.923880, 0.382683), vec2f(0.923880, 0.382683), vec2f(0.847759, 0.566502), vec2f(0.707107, 0.707107),
  vec2f(0.707107, 0.707107), vec2f(0.566502, 0.847759), vec2f(0.382683, 0.923880), vec2f(0.382683, 0.923880), vec2f(0.198912, 1.0), vec2f(0.0, 1.0));
// polylines of one circle: x relative to the centre, y absolute, n vertices each
var<private> TX: array<f32, 9>; var<private> TY: array<f32, 9>; var<private> BX: array<f32, 9>; var<private> BY: array<f32, 9>;
fn snap(y: f32) -> f32 { return floor(y * 4.0 + 0.5) * 0.25; }
// the right side of the top (apex to side point) or bottom (side point to nadir) half
fn half(r: f32, cy: f32, top: bool, pow2: u32, X: ptr<private, array<f32, 9>>, Y: ptr<private, array<f32, 9>>) -> u32 {
  var m = 0u;
  let nq = 1u << pow2; let base = select(select(0u, 3u, pow2 == 1u), 9u, pow2 == 2u);
  for (var j = 0u; j < nq; j++) {
    var q0 = QUADS[base + j * 3u]; var q1 = QUADS[base + j * 3u + 1u]; var q2 = QUADS[base + j * 3u + 2u];
    if (top) { q0 = vec2f(q0.y, -q0.x); q1 = vec2f(q1.y, -q1.x); q2 = vec2f(q2.y, -q2.x); }
    let p0 = floor((q0 * r + vec2f(0.0, cy)) * 256.0) / 256.0;
    let p1 = floor((q1 * r + vec2f(0.0, cy)) * 256.0) / 256.0;
    let p2 = floor((q2 * r + vec2f(0.0, cy)) * 256.0) / 256.0;
    let dev = abs(2.0 * p1 - p0 - p2) * 64.0; let dx = u32(dev.x); let dy = u32(dev.y);
    let dist = (select(dy + (dx >> 1u), dx + (dy >> 1u), dx > dy) + 16u) >> 5u;
    let shift = clamp((32u - countLeadingZeros(dist)) >> 1u, 1u, 3u - pow2);
    let n = 1u << shift;
    let y0 = snap(p0.y); let d = y0 - p0.y; let yEnd = snap(p2.y);
    (*X)[m] = p0.x; (*Y)[m] = y0; m++;
    var px = p0.x; var py = y0; var sx = p0.x; var sy = y0;   // previous point: carried, and snapped
    for (var k = 1u; k < n; k++) {
      let t = f32(k) / f32(n); let u = 1.0 - t;
      let b = u * u * p0 + 2.0 * t * u * p1 + t * t * p2; let y = b.y + d;
      var ys = min(yEnd, snap(y)); var xs = b.x;
      if (abs(y - py) >= 2.0 && abs(y - py) * 64.0 > abs(b.x - px)) {
        ys = min(yEnd, floor(y + 0.5));
        if (abs(y - sy) > 1.0 / 64.0) { xs = b.x - (b.x - sx) / (y - sy) * (y - ys); }
      }
      (*X)[m] = xs; (*Y)[m] = ys; m++;
      px = b.x; py = y; sx = xs; sy = ys;
    }
    if (j == nq - 1u) { (*X)[m] = p2.x; (*Y)[m] = yEnd; m++; }
  }
  return m;
}
// pad a polyline to 9 vertices with a flat tail, so unused segments add nothing
fn pad(n: u32, X: ptr<private, array<f32, 9>>, Y: ptr<private, array<f32, 9>>) {
  for (var k = n; k < 9u; k++) { (*X)[k] = (*X)[n - 1u] + f32(k - n + 1u) * 1e-3; (*Y)[k] = (*Y)[n - 1u]; }
}
fn reverse(n: u32, X: ptr<private, array<f32, 9>>, Y: ptr<private, array<f32, 9>>) {
  for (var k = 0u; k < n / 2u; k++) {
    let j = n - 1u - k; let x = (*X)[k]; let y = (*Y)[k];
    (*X)[k] = (*X)[j]; (*Y)[k] = (*Y)[j]; (*X)[j] = x; (*Y)[j] = y;
  }
}
// c = (cx, cy, r, value) in pixels; the quad covers the flattened circle (up to 1.06 r) plus a pixel.
// t0..t4 and b0..b4 carry the top and bottom polylines (9 x then 9 y each, x ascending) to the fragment.
struct COut {
  @builtin(position) pos: vec4f, @location(0) @interpolate(flat) c: vec4f,
  @location(1) @interpolate(flat) t0: vec4f, @location(2) @interpolate(flat) t1: vec4f, @location(3) @interpolate(flat) t2: vec4f,
  @location(4) @interpolate(flat) t3: vec4f, @location(5) @interpolate(flat) t4: vec4f,
  @location(6) @interpolate(flat) b0: vec4f, @location(7) @interpolate(flat) b1: vec4f, @location(8) @interpolate(flat) b2: vec4f,
  @location(9) @interpolate(flat) b3: vec4f, @location(10) @interpolate(flat) b4: vec4f,
}
@vertex fn vsCircle(@builtin(vertex_index) vi: u32, @location(0) c: vec4f) -> COut {
  let k = vi % 6u;
  let q = vec2f(f32(k == 1u || k == 3u || k == 4u), f32(k == 2u || k >= 4u)) * 2.0 - 1.0;
  let px = c.xy + q * (c.z * 1.07 + 1.5);
  var o: COut; o.pos = vec4f(px.x / p.res * 2.0 - 1.0, 1.0 - px.y / p.res * 2.0, 0.0, 1.0); o.c = c;
  var pow2 = 0u; var err = 0.06066 * c.z;
  loop { if (err <= 0.25 || pow2 >= 2u) { break; } err *= 0.25; pow2 += 1u; }
  let tn = half(c.z, c.y, true, pow2, &TX, &TY); pad(tn, &TX, &TY);
  let bn = half(c.z, c.y, false, pow2, &BX, &BY); reverse(bn, &BX, &BY); pad(bn, &BX, &BY);
  o.t0 = vec4f(TX[0], TX[1], TX[2], TX[3]); o.t1 = vec4f(TX[4], TX[5], TX[6], TX[7]); o.t2 = vec4f(TX[8], TY[0], TY[1], TY[2]);
  o.t3 = vec4f(TY[3], TY[4], TY[5], TY[6]); o.t4 = vec4f(TY[7], TY[8], 0.0, 0.0);
  o.b0 = vec4f(BX[0], BX[1], BX[2], BX[3]); o.b1 = vec4f(BX[4], BX[5], BX[6], BX[7]); o.b2 = vec4f(BX[8], BY[0], BY[1], BY[2]);
  o.b3 = vec4f(BY[3], BY[4], BY[5], BY[6]); o.b4 = vec4f(BY[7], BY[8], 0.0, 0.0);
  return o;
}
// coverage of the rect [x0, x1] × [y0, y1] (stencil pixels) by the fragment's circle: the area
// between the two polylines, integrated over 8 vertical strips
fn covRect(i: COut, x0: f32, x1: f32, y0: f32, y1: f32) -> f32 {
  var a = 0.0;
  for (var s = 0u; s < 8u; s++) {
    let ax = abs(x0 + (x1 - x0) * (f32(s) + 0.5) / 8.0 - i.c.x);
    let yt = ${piecewise('i.t')};
    let yb = ${piecewise('i.b')};
    a += max(0.0, min(y1, yb) - max(y0, yt));
  }
  return a / 8.0 / (y1 - y0);
}
@fragment fn fsCircle(i: COut) -> @location(0) vec4f {
  let P = floor(i.pos.xy); let c = covRect(i, P.x, P.x + 1.0, P.y, P.y + 1.0); return vec4f(c, c, c, c);
}
@fragment fn fsGlow(i: COut) -> @location(0) vec4f {
  let P = floor(i.pos.xy) / SS; let d = distance(i.pos.xy / SS, i.c.xy);
  return vec4f(i.c.w * max(0.0, 1.0 - d / i.c.z) * covRect(i, P.x, P.x + 1.0 / SS, P.y, P.y + 1.0 / SS), 0.0, 0.0, 1.0);
}

// q = (ndc x, ndc y, tone, channel): composites one channel of the scratch coverage texture
struct QOut { @builtin(position) pos: vec4f, @location(0) @interpolate(flat) q: vec4f, }
@vertex fn vsQuad(@location(0) q: vec4f) -> QOut { var o: QOut; o.pos = vec4f(q.xy, 0.0, 1.0); o.q = q; return o; }
fn covAt(i: QOut) -> f32 {
  let c = textureLoad(src, vec2i(i.pos.xy / SS), 0); let k = u32(i.q.w);
  return select(select(c.r, c.g, k == 1u), select(c.b, c.a, k == 3u), k >= 2u);
}
@fragment fn fsCompAdd(i: QOut) -> @location(0) vec4f { return vec4f(i.q.z * covAt(i), 0.0, 0.0, 1.0); }
@fragment fn fsCompCut(i: QOut) -> @location(0) vec4f { return vec4f(covAt(i), 0.0, 0.0, 1.0); }

@vertex fn vsFull(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let xy = vec2f(f32((i << 1u) & 2u), f32(i & 2u));
  return vec4f(xy * 2.0 - 1.0, 0.0, 1.0);
}
@fragment fn fsRestore(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  return vec4f(textureLoad(src, vec2i(pos.xy), 0).r, 0.0, 0.0, 1.0);
}`;

// 2×2 box average of the resolved ink target into a 1-channel GpuImage
const DOWN_WGSL = `
@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var out: texture_storage_2d<rgba32float, write>;
@compute @workgroup_size(8, 8) fn main(@builtin(global_invocation_id) id: vec3u) {
  let W = textureDimensions(out).x; if (id.x >= W || id.y >= W) { return; }
  let q = vec2i(id.xy) * ${SS};
  var v = 0.0;
  for (var y = 0; y < ${SS}; y++) { for (var x = 0; x < ${SS}; x++) { v += textureLoad(src, q + vec2i(x, y), 0).r; } }
  v /= ${SS * SS}.0;
  textureStore(out, vec2i(id.xy), vec4f(v, v, v, 1.0));
}`;

const alpha = { srcFactor: 'one', dstFactor: 'zero', operation: 'add' };
const BLEND = {
  add: { color: { srcFactor: 'one-minus-dst', dstFactor: 'one', operation: 'add' }, alpha },
  cut: { color: { srcFactor: 'zero', dstFactor: 'one-minus-src', operation: 'add' }, alpha },
  sum: { color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' }, alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' } },
};
const KEEP = { compare: 'always' };
const INSIDE_CLIP = { compare: 'equal' };   // with readMask CLIP: bit 7 set
// The stencil reference is 0 for unclipped draws and CLIP for clipped ones. Pipelines without
// `scratch` render into the MSAA ink target; the scratch ones accumulate circle coverage.
const SPECS = {
  wind: { shader: 'poly', write: 0, front: { compare: 'always', passOp: 'increment-wrap' }, back: { compare: 'always', passOp: 'decrement-wrap' }, wmask: WIND },
  clipSet: { shader: 'poly', write: 0, front: { compare: 'always', passOp: 'replace' }, wmask: 0xFF },
  // keep bit 7 where the count is nonzero (stored > 0x80), clear everything elsewhere
  clipIsect: { shader: 'poly', write: 0, front: { compare: 'less', passOp: 'replace', failOp: 'zero' }, rmask: 0xFF, wmask: 0xFF },
  coverAdd: { shader: 'poly', fs: 'fsAdd', blend: 'add', front: { compare: 'not-equal', passOp: 'replace' }, rmask: WIND, wmask: WIND },
  coverCut: { shader: 'poly', fs: 'fsCut', blend: 'cut', front: { compare: 'not-equal', passOp: 'replace' }, rmask: WIND, wmask: WIND },
  coverAddClip: { shader: 'poly', fs: 'fsAdd', blend: 'add', front: { compare: 'less', passOp: 'replace' }, rmask: 0xFF, wmask: WIND },
  coverCutClip: { shader: 'poly', fs: 'fsCut', blend: 'cut', front: { compare: 'less', passOp: 'replace' }, rmask: 0xFF, wmask: WIND },
  // mask: cut where the count is zero; both branches reset the count
  mask: { shader: 'poly', fs: 'fsCut', blend: 'cut', front: { compare: 'equal', passOp: 'replace', failOp: 'replace' }, rmask: WIND, wmask: WIND },
  maskClip: { shader: 'poly', fs: 'fsCut', blend: 'cut', front: { compare: 'equal', passOp: 'replace', failOp: 'replace' }, rmask: 0xFF, wmask: WIND },
  glowAdd: { shader: 'circle', fs: 'fsGlow', blend: 'add', front: KEEP },
  glowAddClip: { shader: 'circle', fs: 'fsGlow', blend: 'add', front: INSIDE_CLIP, rmask: CLIP },
  compAdd: { shader: 'quad', fs: 'fsCompAdd', blend: 'add', front: KEEP },
  compCut: { shader: 'quad', fs: 'fsCompCut', blend: 'cut', front: KEEP },
  compAddClip: { shader: 'quad', fs: 'fsCompAdd', blend: 'add', front: INSIDE_CLIP, rmask: CLIP },
  compCutClip: { shader: 'quad', fs: 'fsCompCut', blend: 'cut', front: INSIDE_CLIP, rmask: CLIP },
  restore: { shader: 'full', fs: 'fsRestore', front: KEEP },
  scratch0: { shader: 'circle', fs: 'fsCircle', blend: 'sum', scratch: true, write: 1 },
  scratch1: { shader: 'circle', fs: 'fsCircle', blend: 'sum', scratch: true, write: 2 },
  scratch2: { shader: 'circle', fs: 'fsCircle', blend: 'sum', scratch: true, write: 4 },
  scratch3: { shader: 'circle', fs: 'fsCircle', blend: 'sum', scratch: true, write: 8 },
};
const LAYOUTS = {
  poly: [{ arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' }, { shaderLocation: 1, offset: 8, format: 'float32' }] }],
  circle: [{ arrayStride: 16, stepMode: 'instance', attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x4' }] }],
  quad: [{ arrayStride: 16, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x4' }] }],
  full: [],
};
const VS = { poly: 'vsPoly', circle: 'vsCircle', quad: 'vsQuad', full: 'vsFull' };

export function attachRaster(gpu) {
  if (gpu.raster) return gpu;
  const r = new Raster(gpu);
  gpu.raster = r;
  gpu.rasterize = (marks, res, state) => r.rasterize(marks, res, state);
  const flush = gpu.flush.bind(gpu);
  gpu.flush = () => { flush(); r.recycle(); };
  return gpu;
}

// ---------------- vertex data ----------------
// Two sections for one frame: polygon vertices (ndc x, ndc y, value) and 16-byte records that
// serve both as circle instances (px, py, r, value) and as composite quad vertices (ndc x, ndc y,
// tone, channel).
class Geom {
  constructor(res) {
    this.k = 2 / res;
    this.poly = new Float32Array(1 << 15); this.np = 0;
    this.rec = new Float32Array(1 << 12); this.nr = 0;
    this.x0 = this.y0 = Infinity; this.x1 = this.y1 = -Infinity;
    this.quad(0, 0, res, res, 1);   // vertices 0..5 cover the whole stencil
  }
  vertex(x, y, v) {
    if (this.np + 3 > this.poly.length) { const n = new Float32Array(this.poly.length * 2); n.set(this.poly); this.poly = n; }
    this.poly[this.np++] = x * this.k - 1; this.poly[this.np++] = 1 - y * this.k; this.poly[this.np++] = v;
  }
  pt(x, y, v) { this.bound(x, y); this.vertex(x, y, v); }
  bound(x, y) { if (x < this.x0) this.x0 = x; if (x > this.x1) this.x1 = x; if (y < this.y0) this.y0 = y; if (y > this.y1) this.y1 = y; }
  quad(x0, y0, x1, y1, v) {
    this.vertex(x0, y0, v); this.vertex(x1, y0, v); this.vertex(x1, y1, v);
    this.vertex(x0, y0, v); this.vertex(x1, y1, v); this.vertex(x0, y1, v);
  }
  begin() { this.x0 = this.y0 = Infinity; this.x1 = this.y1 = -Infinity; return this.np / 3; }
  range(first) { return [first, this.np / 3 - first]; }
  // the quad over everything bounded since begin(), padded by pad pixels
  cover(pad, v) {
    const first = this.np / 3;
    if (!isFinite(this.x0)) return [first, 0];
    this.quad(this.x0 - pad, this.y0 - pad, this.x1 + pad, this.y1 + pad, v);
    return [first, 6];
  }
  fan(pts, v) {
    for (let i = 1; i + 1 < pts.length; i++) { this.pt(pts[0][0], pts[0][1], v); this.pt(pts[i][0], pts[i][1], v); this.pt(pts[i + 1][0], pts[i + 1][1], v); }
  }
  // a fan with positive winding, so overlapping pieces add up instead of cancelling
  fanOriented(pts, v) {
    let a = 0;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
    this.fan(a < 0 ? pts.slice().reverse() : pts, v);
  }
  record(a, b, c, d) {
    if (this.nr + 4 > this.rec.length) { const n = new Float32Array(this.rec.length * 2); n.set(this.rec); this.rec = n; }
    this.rec[this.nr++] = a; this.rec[this.nr++] = b; this.rec[this.nr++] = c; this.rec[this.nr++] = d;
  }
  circle(x, y, r, v) { const e = r * 1.07 + 0.5; this.bound(x - e, y - e); this.bound(x + e, y + e); this.record(x, y, r, v); }
  // composite quad over the circles bounded since begin(); returns its first record
  compQuad(tone, chan) {
    const first = this.nr / 4, x0 = this.x0 - 1, y0 = this.y0 - 1, x1 = this.x1 + 1, y1 = this.y1 + 1;
    for (const [x, y] of [[x0, y0], [x1, y0], [x1, y1], [x0, y0], [x1, y1], [x0, y1]]) this.record(x * this.k - 1, 1 - y * this.k, tone, chan);
    return first;
  }
}

const circlePts = (cx, cy, r) => arcPts(cx, cy, r, 0, TAU, true);
// points along an arc, spaced so the chord error stays under 0.05 px
function arcPts(cx, cy, r, a0, a1, open = false) {
  const step = r > 0.05 ? Math.min(Math.PI / 4, Math.max(Math.PI / 64, 2 * Math.acos(1 - 0.05 / r))) : Math.PI / 4;
  const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / step)), out = [];
  for (let k = 0; k <= (open ? n - 1 : n); k++) { const a = a0 + (a1 - a0) * k / n; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return out;
}
const scalePts = (pts, Z) => pts.map(p => [p[0] * Z, p[1] * Z]);

// the mode of a mark on each ink: 'add', 'cut' or null
function opsFor(m) {
  const o = {};
  for (const ink of INKS) {
    const hit = m.ink === 'all' || m.ink === ink;
    if (m.mode === 'cut') o[ink] = hit ? 'cut' : null;
    else if (m.mode === 'solid') o[ink] = m.ink === ink ? 'add' : 'cut';
    else o[ink] = hit ? 'add' : null;
  }
  return o;
}
const sameClip = (a, b) => a && a.length === b.length && a.every((g, i) => g === b[i]);

// ---------------- marks → draw plans ----------------
// plan: { kind: 'poly'|'mask'|'glow'|'cov', ops, clip, clipWind, wind, cover, first, count, slot, quad }
function planFill(m, g, Z) {
  const first = g.begin();
  for (const pr of m.geo.prims) g.fan(scalePts(pr.pts, Z), m.tone);
  const wind = g.range(first); if (!wind[1]) return null;
  return { kind: 'poly', ops: opsFor(m), wind, cover: g.cover(1, m.tone) };
}
function planStroke(m, g, Z) {
  const first = g.begin();
  for (const pr of m.geo.prims) {
    const pts = scalePts(pr.closed ? [...pr.pts, pr.pts[0]] : pr.pts, Z);
    if (pts.length < 2) continue;
    if (pr.pw) outline(g, pts, (pr.closed ? [...pr.pw, pr.pw[0]] : pr.pw).map(w => Math.max(0.3, w) * Z), m.tone);
    else roundStroke(g, pts, m.w * Z / 2, m.tone);
  }
  const wind = g.range(first); if (!wind[1]) return null;
  return { kind: 'poly', ops: opsFor(m), wind, cover: g.cover(1, m.tone) };
}
// constant width with round joins and caps: the union of segment quads and vertex discs
function roundStroke(g, pts, h, v) {
  for (const p of pts) g.fanOriented(circlePts(p[0], p[1], h), v);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
    if (l < 1e-6) continue;
    const nx = -dy / l * h, ny = dx / l * h;
    g.fanOriented([[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]], v);
  }
}
// variable width: the same outline Sep.line builds (left offsets, end cap, right offsets, start cap)
function outline(g, pts, pw, v) {
  const n = pts.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(n - 1, i + 1)];
    let dx = p1[0] - p0[0], dy = p1[1] - p0[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const h = pw[i] / 2;
    L.push([pts[i][0] - dy * h, pts[i][1] + dx * h]); R.push([pts[i][0] + dy * h, pts[i][1] - dx * h]);
  }
  const e = pts[n - 1], a = pts[n - 2], ae = Math.atan2(e[1] - a[1], e[0] - a[0]);
  const s0 = pts[0], s1 = pts[1], as = Math.atan2(s1[1] - s0[1], s1[0] - s0[0]);
  const poly = [...L, ...arcPts(e[0], e[1], pw[n - 1] / 2, ae - Math.PI / 2, ae + Math.PI / 2), ...R.reverse(),
    ...arcPts(s0[0], s0[1], pw[0] / 2, as + Math.PI / 2, as + 3 * Math.PI / 2)];
  g.fan(poly, v);
}
function circlesAt(m, g, Z) {
  for (const pr of m.geo.prims) pr.pts.forEach(([x, y], k) => { const r = pr.pw[k]; if (r > 0) g.circle(x * Z, y * Z, r * Z, m.tone); });
}
function planDots(m, g, Z) {
  g.begin(); const first = g.nr / 4;
  circlesAt(m, g, Z);
  const count = g.nr / 4 - first; if (!count) return null;
  return { kind: 'cov', ops: opsFor(m), first, count, tone: m.tone };
}
function planGlow(m, g, Z) {
  const first = g.nr / 4;
  circlesAt(m, g, Z);
  const count = g.nr / 4 - first; if (!count) return null;
  return { kind: 'glow', ops: { [m.ink]: 'add' }, first, count };
}
// the dot grid of Sep.tint; the shape itself joins the clip list
function planTint(m, g, Z) {
  if (!m.geo.prims.length) return null;
  g.begin(); const first = g.nr / 4, cell = m.cell, c = Math.cos(m.angle), s = Math.sin(m.angle);
  const [x0, y0, x1, y1] = geoBounds(m.geo);
  let imin = 1e9, imax = -1e9, jmin = 1e9, jmax = -1e9;
  for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) {
    const i = (x * c + y * s) / cell, j = (-x * s + y * c) / cell;
    imin = Math.min(imin, i); imax = Math.max(imax, i); jmin = Math.min(jmin, j); jmax = Math.max(jmax, j);
  }
  for (let i = Math.floor(imin); i <= Math.ceil(imax); i++) {
    for (let j = Math.floor(jmin); j <= Math.ceil(jmax); j++) {
      const x = i * cell * c - j * cell * s, y = i * cell * s + j * cell * c;
      if (x < x0 - cell || x > x1 + cell || y < y0 - cell || y > y1 + cell) continue;
      const t = m.field.sample(x, y);
      if (t <= 0.03) continue;
      const r = t >= 0.97 ? cell * 0.75 : cell * Math.sqrt(t / Math.PI) * 1.06;
      g.circle(x * Z, y * Z, r * Z, 1);
    }
  }
  const count = g.nr / 4 - first; if (!count) return null;
  return { kind: 'cov', ops: { [m.ink]: 'add' }, first, count, tone: 1, clip: [...m.clip, m.geo] };
}
function planMask(m, g, Z) {
  const first = g.begin();
  for (const pr of m.geo.prims) g.fan(scalePts(pr.pts, Z), 1);
  return { kind: 'mask', ops: { blue: 'cut', pink: 'cut', yellow: 'cut' }, wind: g.range(first) };
}
const PLAN = { fill: planFill, stroke: planStroke, dots: planDots, glow: planGlow, tint: planTint, mask: planMask };

// `slots` counts the coverage marks of the frame: slot >> 2 is the scratch texture, slot & 3 its channel
function planMarks(marks, g, Z, slots) {
  const out = [];
  for (const m of marks) {
    const fn = PLAN[m.kind]; if (!fn) continue;
    const p = fn(m, g, Z); if (!p) continue;
    if (p.kind === 'cov') { p.slot = slots.n++; p.quad = g.compQuad(p.tone, p.slot & 3); }
    if (!p.clip) p.clip = m.clip;
    p.clipWind = p.clip.map(c => { const first = g.begin(); for (const pr of c.prims) g.fan(scalePts(pr.pts, Z), 1); return g.range(first); });
    out.push(p);
  }
  return out;
}

// ---------------- the rasterizer ----------------
class Raster {
  constructor(gpu) {
    this.gpu = gpu; const dev = this.dev = gpu.device;
    this.module = dev.createShaderModule({ code: WGSL });
    this.bgl = dev.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float' } },
    ] });
    this.layout = dev.createPipelineLayout({ bindGroupLayouts: [this.bgl] });
    this.downBgl = dev.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: 'unfilterable-float' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: 'write-only', format: 'rgba32float' } },
    ] });
    this.down = dev.createComputePipeline({ layout: dev.createPipelineLayout({ bindGroupLayouts: [this.downBgl] }),
      compute: { module: dev.createShaderModule({ code: DOWN_WGSL }), entryPoint: 'main' } });
    this.pipes = new Map();
    this.targets = new Map();   // res -> { msaa, stencil, resolved, ubuf, bg, scratch: [{ tex, bg }] }
    this.free = []; this.inflight = [];   // vertex buffers
  }
  pipe(name) {
    if (this.pipes.has(name)) return this.pipes.get(name);
    const s = SPECS[name];
    const face = f => ({ compare: f.compare, passOp: f.passOp || 'keep', failOp: f.failOp || 'keep', depthFailOp: 'keep' });
    const pl = this.dev.createRenderPipeline({
      layout: this.layout,
      vertex: { module: this.module, entryPoint: VS[s.shader], buffers: LAYOUTS[s.shader] },
      fragment: { module: this.module, entryPoint: s.fs || 'fsCut', targets: [{ format: s.scratch ? SCRATCH : FORMAT, blend: s.blend ? BLEND[s.blend] : undefined, writeMask: s.write ?? GPUColorWrite.ALL }] },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: s.scratch ? undefined : { format: STENCIL, stencilFront: face(s.front), stencilBack: face(s.back || s.front), stencilReadMask: s.rmask ?? 0xFF, stencilWriteMask: s.wmask ?? 0 },
      multisample: { count: s.scratch ? 1 : SAMPLES },
    });
    this.pipes.set(name, pl); return pl;
  }
  target(res) {
    if (this.targets.has(res)) return this.targets.get(res);
    const dev = this.dev, size = [res * SS, res * SS];
    const T = {
      msaa: dev.createTexture({ size, format: FORMAT, sampleCount: SAMPLES, usage: GPUTextureUsage.RENDER_ATTACHMENT }).createView(),
      stencil: dev.createTexture({ size, format: STENCIL, sampleCount: SAMPLES, usage: GPUTextureUsage.RENDER_ATTACHMENT }).createView(),
      resolved: this.plain(res * SS, FORMAT),
      ubuf: dev.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }),
      scratch: [],
    };
    dev.queue.writeBuffer(T.ubuf, 0, new Float32Array([res, 0, 0, 0]));
    T.bg = this.bindGroup(T, this.plain(1, FORMAT));   // a placeholder: the resolve target cannot be bound while it is written
    this.targets.set(res, T); return T;
  }
  plain(res, format) { return this.dev.createTexture({ size: [res, res], format, usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING }); }
  bindGroup(T, tex) { return this.dev.createBindGroup({ layout: this.bgl, entries: [{ binding: 0, resource: { buffer: T.ubuf } }, { binding: 1, resource: tex.createView() }] }); }
  scratch(T, res, i) {
    while (T.scratch.length <= i) { const tex = this.plain(res, SCRATCH); T.scratch.push({ tex, bg: this.bindGroup(T, tex) }); }
    return T.scratch[i];
  }
  // vertex buffers stay in flight until the frame's command buffer is submitted
  buffer(bytes) {
    let i = -1;
    for (let k = 0; k < this.free.length; k++) if (this.free[k].size >= bytes && (i < 0 || this.free[k].size < this.free[i].size)) i = k;
    const buf = i >= 0 ? this.free.splice(i, 1)[0] : this.dev.createBuffer({ size: 1 << Math.ceil(Math.log2(Math.max(bytes, 1 << 12))), usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    this.inflight.push(buf); return buf;
  }
  recycle() { this.free.push(...this.inflight); this.inflight = []; }

  rasterize(marks, res, state) {
    const gpu = this.gpu, T = this.target(res), Z = res / U;
    let k = Math.min(marks.length, state.staticCount | 0);
    const cached = k > 0 && state.staticKey != null, key = cached ? res + '|' + state.staticKey : null;
    const rebuild = cached && key !== state.snapKey, restore = cached && !rebuild;
    if (!cached) k = 0;
    if (rebuild && (!state.snapshot || state.snapshot.res !== res)) {
      const s = state.snapshot = { res };
      for (const ink of INKS) { s[ink] = this.plain(res * SS, FORMAT); s[ink + 'Bg'] = this.bindGroup(T, s[ink]); }
    }
    const g = new Geom(res), slots = { n: 0 };
    const prefix = rebuild ? planMarks(marks.slice(0, k), g, Z, slots) : [];
    const rest = planMarks(marks.slice(k), g, Z, slots);

    const polyBytes = g.np * 4, recOff = Math.ceil(polyBytes / 16) * 16, buf = this.buffer(recOff + g.nr * 4);
    this.dev.queue.writeBuffer(buf, 0, g.poly, 0, g.np);
    if (g.nr) this.dev.queue.writeBuffer(buf, recOff, g.rec, 0, g.nr);
    const V = { buf, recOff, T };

    const enc = gpu.enc(), out = {};
    this.coverage(enc, [...prefix, ...rest], V, res);
    for (const ink of INKS) {
      if (rebuild) {
        const pass = this.beginPass(enc, T, 'clear', state.snapshot[ink]);
        this.draw(pass, prefix, ink, V);
        pass.end();
      }
      const pass = this.beginPass(enc, T, rebuild ? 'load' : 'clear', T.resolved);
      if (restore) { pass.setPipeline(this.pipe('restore')); pass.setBindGroup(0, state.snapshot[ink + 'Bg']); pass.draw(3); }
      this.draw(pass, rest, ink, V);
      pass.end();
      out[ink] = this.convert(enc, T.resolved, gpu.image(res, 1));
    }
    if (rebuild) state.snapKey = key;
    return out;
  }
  // the union coverage of every dots and tint mark, four marks per scratch texture
  coverage(enc, plans, { buf, recOff, T }, res) {
    const cov = plans.filter(p => p.kind === 'cov');
    for (let i = 0; i * 4 < cov.length; i++) {
      const pass = enc.beginRenderPass({ colorAttachments: [{ view: this.scratch(T, res, i).tex.createView(), loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 0] }] });
      pass.setBindGroup(0, T.bg); pass.setVertexBuffer(0, buf, recOff);
      for (const p of cov.slice(i * 4, i * 4 + 4)) { pass.setPipeline(this.pipe('scratch' + (p.slot & 3))); pass.draw(6, p.count, 0, p.first); }
      pass.end();
    }
  }
  convert(enc, src, out) {
    const bg = this.dev.createBindGroup({ layout: this.downBgl, entries: [{ binding: 0, resource: src.createView() }, { binding: 1, resource: out.tex.createView() }] });
    const pass = enc.beginComputePass(); pass.setPipeline(this.down); pass.setBindGroup(0, bg);
    const n = Math.ceil(out.w / 8); pass.dispatchWorkgroups(n, n); pass.end();
    return out;
  }
  beginPass(enc, T, loadOp, resolveTo) {
    return enc.beginRenderPass({
      colorAttachments: [{ view: T.msaa, resolveTarget: resolveTo.createView(), loadOp, storeOp: 'store', clearValue: [0, 0, 0, 1] }],
      depthStencilAttachment: { view: T.stencil, stencilLoadOp: 'clear', stencilStoreOp: 'discard', stencilClearValue: 0 },
    });
  }
  // record the plans that touch `ink`, in order
  draw(pass, plans, ink, { buf, recOff, T }) {
    let pipe = null, section = null, clip = null, bg = null;
    const use = name => { if (pipe !== name) { pass.setPipeline(this.pipe(name)); pipe = name; } };
    const poly = () => { if (section !== 'poly') { pass.setVertexBuffer(0, buf, 0); section = 'poly'; } };
    const rec = () => { if (section !== 'rec') { pass.setVertexBuffer(0, buf, recOff); section = 'rec'; } };
    const bind = b => { if (bg !== b) { pass.setBindGroup(0, b); bg = b; } };
    bind(T.bg);
    for (const p of plans) {
      const op = p.ops[ink]; if (!op) continue;
      const clipped = p.clip.length > 0, suffix = clipped ? 'Clip' : '';
      if (clipped && !sameClip(clip, p.clip)) {
        poly(); pass.setStencilReference(CLIP);
        use('clipSet'); pass.draw(6);
        for (const w of p.clipWind) { use('wind'); pass.draw(w[1], 1, w[0]); use('clipIsect'); pass.draw(6); }
        clip = p.clip;
      }
      pass.setStencilReference(clipped ? CLIP : 0);
      if (p.kind === 'glow') {
        rec(); bind(T.bg); use('glowAdd' + suffix); pass.draw(6, p.count, 0, p.first);
      } else if (p.kind === 'cov') {
        rec(); bind(T.scratch[p.slot >> 2].bg); use((op === 'add' ? 'compAdd' : 'compCut') + suffix); pass.draw(6, 1, p.quad);
      } else {
        poly(); use('wind'); pass.draw(p.wind[1], 1, p.wind[0]);
        if (p.kind === 'mask') { use(clipped ? 'maskClip' : 'mask'); pass.draw(6); }
        else { use((op === 'add' ? 'coverAdd' : 'coverCut') + suffix); pass.draw(p.cover[1], 1, p.cover[0]); }
      }
    }
  }
}
