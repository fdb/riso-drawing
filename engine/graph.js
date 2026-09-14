import { TAU, mulberry32, clamp01, dist, makeNoise } from './riso.js';

// graph.js — the modeling layer. A scene is a graph of small nodes.
//
// Three value types flow between nodes:
//   geo    { prims: [ { pts: [[x,y]…], closed, attrs: {…}, pw: [w…]|null, pa: {name: […]}|null } ] }
//   field  { sample(x, y) → tone 0..1 }
//   marks  [ { kind, ink, mode, tone, geo, w, field, cell, angle, clip: [geo…], dyn, sig } ]
//
// Every param may be a number or an expression string. Expressions see:
//   t, u, iris          time since start, time since the iris opened, iris scale 0..1
//   $name               a subnet parameter or a `let` value
//   @name               an attribute of the current point, primitive or copy (x y v i n u px py a w pw …)
//   rand(k)             stable random 0..1 for this graph path (and point / copy) and key k
//   noise(x,y,scale,seed) radial(x,y,cx,cy,r) dist(x,y,x2,y2) clamp(v) ease(v)
//   f                   frame index
//   sin cos abs min max pow sqrt floor round PI TAU

// ---------------- expressions ----------------
const EXPR_ARGS = ['A', 'V', 'T', 'rand', 'noise', 'radial', 'dist', 'clamp', 'ease',
  'sin', 'cos', 'abs', 'min', 'max', 'pow', 'sqrt', 'floor', 'round', 'PI', 'TAU'];
const EXPR_FN = {};
export function compileExpr(src) {
  if (!EXPR_FN[src]) {
    // time reads go through T so the evaluator can see which values depend on time
    const js = String(src).replace(/@([A-Za-z_]\w*)/g, 'A.$1').replace(/\$([A-Za-z_]\w*)/g, 'V.$1').replace(/(?<![\w.$@])(t|u|f|iris)(?![\w])/g, 'T.$1');
    EXPR_FN[src] = new Function(...EXPR_ARGS, `return (${js});`);
  }
  return EXPR_FN[src];
}
const DYN_RE = /\b(t|u|iris|f)\b/;
// static check, only for expressions evaluated lazily (fields, pixels)
export const exprIsDynamic = src => typeof src === 'string' && DYN_RE.test(src.replace(/[@$][A-Za-z_]\w*/g, ''));
// a time tracker: reading t/u/f/iris sets `used`
function timeTracker(t, u, f, iris) {
  const T = { used: false };
  Object.defineProperties(T, { t: { get() { T.used = true; return t; } }, u: { get() { T.used = true; return u; } }, f: { get() { T.used = true; return f; } }, iris: { get() { T.used = true; return iris; } } });
  return T;
}
export const easeOutCubic = x => 1 - Math.pow(1 - clamp01(x), 3);

const NOISES = {};
function noiseAt(x, y, scale, seed = 0) {
  const k = seed | 0;
  if (!NOISES[k]) NOISES[k] = makeNoise(32, mulberry32(1000 + k * 7919));
  return NOISES[k](x / scale, y / scale);
}
const radialAt = (x, y, cx, cy, r) => clamp01(1 - Math.hypot(x - cx, y - cy) / r);
function hash32(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export const hrand = (seed, path, k) => mulberry32(hash32(seed + '|' + path + '|' + k))();

// ctx: { t, u, iris, seed, cell, angle, V, A, path, memo, dyn }
export function evalExpr(v, ctx, A = ctx.A, path = ctx.path) {
  if (typeof v !== 'string' || v === '') return v;
  const rand = k => hrand(ctx.seed, path, k);
  return compileExpr(v)(A, ctx.V, ctx.T, rand, noiseAt, radialAt, dist, clamp01, easeOutCubic,
    Math.sin, Math.cos, Math.abs, Math.min, Math.max, Math.pow, Math.sqrt, Math.floor, Math.round, Math.PI, TAU);
}
// evaluate all scalar params; objects (templates, attr maps) pass through untouched
export function evalParams(schema, params, ctx) {
  const p = {};
  for (const k in schema) p[k] = schema[k].def;
  for (const k in params) p[k] = params[k];
  for (const k in p) {
    const kind = schema[k] && schema[k].kind;
    // literal kinds (ink, mode, colour, text) stay as written unless they reference a $value
    if ((kind === 'ink' || kind === 'mode' || kind === 'color' || kind === 'text') && !(typeof p[k] === 'string' && p[k].startsWith('$'))) continue;
    if (typeof p[k] === 'string' || typeof p[k] === 'number' || typeof p[k] === 'boolean') p[k] = evalExpr(p[k], ctx);
  }
  return p;
}

// ---------------- geometry ----------------
export const prim = (pts, closed = false, attrs = {}) => ({ pts, closed, attrs, pw: null, pa: null });
export const geo = (prims, sig = '') => ({ prims, sig });
const EMPTY_GEO = () => geo([]);
function clonePrim(pr) {
  return { pts: pr.pts.map(p => [p[0], p[1]]), closed: pr.closed, attrs: { ...pr.attrs }, pw: pr.pw ? pr.pw.slice() : null,
    pa: pr.pa ? Object.fromEntries(Object.entries(pr.pa).map(([k, v]) => [k, v.slice()])) : null };
}
function pointAttrs(pr, k, stamps) {
  const n = pr.pts.length, A = Object.assign({}, stamps, pr.attrs);
  A.x = pr.pts[k][0]; A.y = pr.pts[k][1]; A.i = k; A.n = n; A.v = n > 1 ? k / (n - 1) : (A.v !== undefined ? A.v : 0);
  A.pw = pr.pw ? pr.pw[k] : (pr.attrs.w !== undefined ? pr.attrs.w : 0);
  if (pr.pa) for (const key in pr.pa) A[key] = pr.pa[key][k];
  return A;
}
export function geoBounds(g) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const pr of g.prims) for (const [x, y] of pr.pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return [x0, y0, x1, y1];
}
// matrix { a b c d e f, s (uniform scale), r (rotation) }
export function mat(x, y, rot = 0, sx = 1, sy = sx) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return { a: sx * c, b: sx * s, c: -sy * s, d: sy * c, e: x, f: y, s: Math.sqrt(Math.abs(sx * sy)), r: rot };
}
const apply = (M, x, y) => [M.a * x + M.c * y + M.e, M.b * x + M.d * y + M.f];
function invert(M) {
  const det = M.a * M.d - M.b * M.c;
  return { a: M.d / det, b: -M.b / det, c: -M.c / det, d: M.a / det, e: (M.c * M.f - M.d * M.e) / det, f: (M.b * M.e - M.a * M.f) / det };
}
export function transformGeo(g, M) {
  return geo(g.prims.map(pr => {
    const q = clonePrim(pr);
    q.pts = q.pts.map(([x, y]) => apply(M, x, y));
    if (q.pw) q.pw = q.pw.map(w => w * M.s);
    if (q.attrs.w !== undefined) q.attrs.w *= M.s;
    if (q.pa && q.pa.a) q.pa.a = q.pa.a.map(a => a + M.r);
    return q;
  }), g.sig);
}
function transformField(f, M) { const I = invert(M); return { sample: (x, y) => { const [px, py] = apply(I, x, y); return f.sample(px, py); }, sig: f.sig }; }
function transformMarks(marks, M) {
  return marks.map(m => {
    const q = { ...m };
    if (m.geo) q.geo = transformGeo(m.geo, M);
    if (m.clip) q.clip = m.clip.map(c => transformGeo(c, M));
    if (m.field) q.field = transformField(m.field, M);
    if (m.w !== undefined) q.w *= M.s;
    if (m.cell !== undefined) q.cell *= M.s;
    if (m.angle !== undefined) q.angle += M.r;
    return q;
  });
}
function transformOut(out, M) {
  if (Array.isArray(out)) return transformMarks(out, M);
  if (out.prims) return transformGeo(out, M);
  if (out.sample) return transformField(out, M);
  return out;
}
export const pathOf = g => c => { for (const pr of g.prims) { pr.pts.forEach((p, k) => k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); if (pr.closed) c.closePath(); } };
function flatPoints(g) {
  const out = [];
  for (const pr of g.prims) pr.pts.forEach((p, k) => out.push({ x: p[0], y: p[1], attrs: pointAttrs(pr, k, {}) }));
  return out;
}

// ---------------- catalog ----------------
export const CAT = {};
export const MULTI_INPUTS = ['list', 'marks'];
const N = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const E = (def, label) => ({ def, label, kind: 'expr' });
const INK = (def = 'pink') => ({ def, kind: 'ink' });
const MODE = (def = 'add') => ({ def, kind: 'mode' });
export function def(type, spec) { spec.type = type; spec.inputs = spec.inputs || []; CAT[type] = spec; }

// ---- generators ----
def('circle', { label: 'Circle', cat: 'geo', out: 'geo',
  params: { x: N(540, 0, 1080, 1), y: N(540, 0, 1080, 1), r: N(100, 0, 600, 0.5), n: N(64, 3, 360, 1) },
  fn: (i, p) => arcPrim(p.x, p.y, p.r, p.r, 0, 0, 360, p.n) });
def('ellipse', { label: 'Ellipse / arc', cat: 'geo', out: 'geo',
  params: { x: N(0, -1080, 1080, 1), y: N(0, -1080, 1080, 1), rx: N(100, 0, 600, 0.5), ry: N(60, 0, 600, 0.5), rot: N(0, -3.2, 3.2, 0.01),
    a0: N(0, -360, 720, 1), a1: N(360, -360, 720, 1), n: N(64, 2, 360, 1) },
  fn: (i, p) => arcPrim(p.x, p.y, p.rx, p.ry, p.rot, p.a0, p.a1, p.n) });
function arcPrim(x, y, rx, ry, rot, a0, a1, n) {
  const full = Math.abs(a1 - a0) >= 360, m = Math.round(n), pts = [], pa = { a: [] };
  const c = Math.cos(rot), s = Math.sin(rot), cnt = full ? m : m + 1;
  for (let k = 0; k < cnt; k++) {
    const a = (a0 + (a1 - a0) * k / m) * Math.PI / 180, ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
    pts.push([x + ex * c - ey * s, y + ex * s + ey * c]); pa.a.push(a + rot);
  }
  const pr = prim(pts, full); pr.pa = pa; return geo([pr]);
}
def('rect', { label: 'Rectangle', cat: 'geo', out: 'geo',
  params: { x: N(0, -1080, 1080, 1), y: N(0, -1080, 1080, 1), w: N(100, 0, 1080, 1), h: N(100, 0, 1080, 1) },
  fn: (i, p) => geo([prim([[p.x, p.y], [p.x + p.w, p.y], [p.x + p.w, p.y + p.h], [p.x, p.y + p.h]], true)]) });
def('line', { label: 'Line', cat: 'geo', out: 'geo',
  params: { x0: N(0, -1080, 1080, 1), y0: N(0, -1080, 1080, 1), x1: N(100, -1080, 1080, 1), y1: N(0, -1080, 1080, 1), n: N(2, 2, 400, 1) },
  fn: (i, p) => { const m = Math.round(p.n), pts = []; for (let k = 0; k < m; k++) { const v = k / (m - 1); pts.push([p.x0 + (p.x1 - p.x0) * v, p.y0 + (p.y1 - p.y0) * v]); } return geo([prim(pts)]); } });
def('wave', { label: 'Wave', cat: 'geo', out: 'geo',
  params: { x0: N(-100, -1080, 1080, 1), x1: N(100, -1080, 1080, 1), y: N(0, -1080, 1080, 1), bumps: N(5, 0, 40, 1), amp: N(10, -200, 200, 0.5), n: N(60, 2, 400, 1), abs: N(1, 0, 1, 1, 'absolute (scallops)') },
  fn: (i, p) => { const m = Math.round(p.n), pts = []; for (let k = 0; k <= m; k++) { const v = k / m, s = Math.sin(v * p.bumps * Math.PI); pts.push([p.x0 + (p.x1 - p.x0) * v, p.y + (p.abs ? Math.abs(s) : s) * p.amp]); } return geo([prim(pts)]); } });
def('rays', { label: 'Rays', cat: 'geo', out: 'geo',
  params: { x: N(0, -1080, 1080, 1), y: N(0, -1080, 1080, 1), a0: N(-160, -360, 360, 1), a1: N(-20, -360, 360, 1), count: N(7, 1, 60, 1), r0: N(10, 0, 600, 0.5), r1: N(100, 0, 600, 0.5) },
  fn: (i, p) => { const n = Math.round(p.count), prims = []; for (let k = 0; k < n; k++) { const a = (p.a0 + (n > 1 ? (p.a1 - p.a0) * k / (n - 1) : 0)) * Math.PI / 180; prims.push(prim([[p.x + Math.cos(a) * p.r0, p.y + Math.sin(a) * p.r0], [p.x + Math.cos(a) * p.r1, p.y + Math.sin(a) * p.r1]], false, { i: k, a })); } return geo(prims); } });
def('walk', { label: 'Walk (turtle)', cat: 'geo', out: 'geo',
  params: { x: N(0, -1080, 1080, 1), y: N(0, -1080, 1080, 1), heading: N(1.5708, -6.3, 6.3, 0.01), step: N(5, 0.1, 100, 0.1), n: N(40, 1, 500, 1), turn: E('0', 'turn per step (rad), sees @k @v') },
  fn: (i, p, ctx, node) => {
    let x = p.x, y = p.y, h = p.heading; const n = Math.round(p.n), pts = [[x, y]];
    for (let k = 0; k < n; k++) { h += evalExpr(node.params.turn !== undefined ? node.params.turn : '0', ctx, { ...ctx.A, k, v: k / n }); x += Math.cos(h) * p.step; y += Math.sin(h) * p.step; pts.push([x, y]); }
    return geo([prim(pts)]);
  } });
def('lens', { label: 'Lens', cat: 'geo', out: 'geo',
  params: { len: N(20, 0, 300, 0.5), wid: N(5, 0, 100, 0.5), n: N(12, 2, 60, 1) },
  fn: (i, p) => { const m = Math.round(p.n), pts = []; for (let k = 0; k < m; k++) { const v = k / m, x = -p.len + 2 * p.len * v; pts.push([x, -p.wid * 4 * v * (1 - v) / 2]); } for (let k = m; k > 0; k--) { const v = k / m, x = -p.len + 2 * p.len * v; pts.push([x, p.wid * 4 * v * (1 - v) / 2]); } return geo([prim(pts, true)]); } });
def('scatter', { label: 'Scatter in disc', cat: 'geo', out: 'geo',
  params: { x: N(540, 0, 1080, 1), y: N(540, 0, 1080, 1), r: N(300, 0, 800, 1), count: N(100, 0, 2000, 1) },
  fn: (i, p, ctx, node, id) => { const n = Math.round(p.count), prims = []; for (let k = 0; k < n; k++) { const a = hrand(ctx.seed, ctx.path + '/' + id, k * 2) * TAU, d = Math.sqrt(hrand(ctx.seed, ctx.path + '/' + id, k * 2 + 1)) * p.r; prims.push(prim([[p.x + Math.cos(a) * d, p.y + Math.sin(a) * d]], false, { i: k })); } return geo(prims); } });
def('point', { label: 'Point', cat: 'geo', out: 'geo', params: { x: N(0, -1080, 1080, 1), y: N(0, -1080, 1080, 1) }, fn: (i, p) => geo([prim([[p.x, p.y]])]) });

// ---- operators ----
def('transform', { label: 'Transform', cat: 'geo', out: 'geo', inputs: ['geo'],
  params: { x: N(0, -1080, 1080, 1), y: N(0, -1080, 1080, 1), rot: N(0, -6.3, 6.3, 0.01), sx: N(1, -5, 5, 0.01), sy: N(1, -5, 5, 0.01) },
  fn: (i, p) => transformGeo(i.geo, mat(p.x, p.y, p.rot, p.sx, p.sy)) });
def('wrangle', { label: 'Point wrangle', cat: 'geo', out: 'geo', inputs: ['geo'],
  params: { x: E('@x', 'new x'), y: E('@y', 'new y'), w: E('', 'width per point (empty = keep)') },
  fn: (i, p, ctx, node, id) => geo(i.geo.prims.map((pr, pi) => {
    const q = clonePrim(pr), path = ctx.path + '/' + id + '#' + pi, ex = node.params.x, ey = node.params.y, ew = node.params.w;
    if (ew) q.pw = new Array(q.pts.length);
    for (let k = 0; k < pr.pts.length; k++) {
      const A = pointAttrs(pr, k, ctx.A), pp = path + '.' + k;
      q.pts[k] = [ex !== undefined ? evalExpr(ex, ctx, A, pp) : A.x, ey !== undefined ? evalExpr(ey, ctx, A, pp) : A.y];
      if (ew) q.pw[k] = evalExpr(ew, ctx, A, pp);
    }
    return q;
  })) });
def('attr', { label: 'Primitive attributes', cat: 'geo', out: 'geo', inputs: ['geo'], params: {},
  fn: (i, p, ctx, node, id) => geo(i.geo.prims.map((pr, pi) => {
    const q = clonePrim(pr), A = { ...ctx.A, ...q.attrs, n: pr.pts.length }, path = ctx.path + '/' + id + '#' + pi;
    for (const k in node.attrs || {}) { A[k] = evalExpr(node.attrs[k], ctx, A, path); q.attrs[k] = A[k]; }
    return q;
  })) });
def('filter', { label: 'Filter primitives', cat: 'geo', out: 'geo', inputs: ['geo'], params: { expr: E('1', 'keep when true') },
  fn: (i, p, ctx, node, id) => geo(i.geo.prims.filter((pr, pi) => evalExpr(node.params.expr, ctx, { ...ctx.A, ...pr.attrs }, ctx.path + '/' + id + '#' + pi))) });
def('join', { label: 'Join into one', cat: 'geo', out: 'geo', inputs: ['list'], params: { close: N(0, 0, 1, 1) },
  fn: (i, p) => {
    const src = [].concat(...i.list.map(g => g.prims)); if (!src.length) return EMPTY_GEO();
    const q = prim([].concat(...src.map(pr => pr.pts)), !!p.close, { ...src[0].attrs });
    if (src.every(pr => pr.pw)) q.pw = [].concat(...src.map(pr => pr.pw));
    return geo([q]);
  } });
def('reverse', { label: 'Reverse', cat: 'geo', out: 'geo', inputs: ['geo'], params: {},
  fn: i => geo(i.geo.prims.map(pr => { const q = clonePrim(pr); q.pts.reverse(); if (q.pw) q.pw.reverse(); if (q.pa) for (const k in q.pa) q.pa[k].reverse(); return q; })) });
def('slice', { label: 'Slice points', cat: 'geo', out: 'geo', inputs: ['geo'], params: { start: N(0, 0, 400, 1), end: N(0, -400, 400, 1, 'end (0 = all)') },
  fn: (i, p) => geo(i.geo.prims.map(pr => { const q = clonePrim(pr), e = p.end ? p.end : undefined; q.pts = q.pts.slice(p.start, e); if (q.pw) q.pw = q.pw.slice(p.start, e); if (q.pa) for (const k in q.pa) q.pa[k] = q.pa[k].slice(p.start, e); return q; })) });
def('merge', { label: 'Merge', cat: 'util', out: 'any', inputs: ['list'], params: {},
  fn: i => { const L = i.list.filter(Boolean); if (!L.length) return []; if (Array.isArray(L[0])) return [].concat(...L); return geo([].concat(...L.map(g => g.prims))); } });
def('pointsAlong', { label: 'Points along', cat: 'geo', out: 'geo', inputs: ['geo'],
  params: { start: E('0', 'first index'), step: E('5', 'index step, sees @k'), margin: N(0, 0, 100, 1, 'skip at end') },
  fn: (i, p, ctx, node, id) => {
    const prims = [];
    i.geo.prims.forEach((pr, pi) => {
      const path = ctx.path + '/' + id + '#' + pi, n = pr.pts.length, A = { ...ctx.A, ...pr.attrs };
      let k = Math.round(evalExpr(node.params.start !== undefined ? node.params.start : '0', ctx, A, path)), h = 0;
      while (k < n - p.margin && k < n - 1) {
        const [x, y] = pr.pts[k], [x2, y2] = pr.pts[Math.min(k + 2, n - 1)];
        const q = prim([[x, y]], false, { ...pr.attrs, v: k / (n - 1), k: h, pw: pr.pw ? pr.pw[k] : 0 });
        q.pa = { a: [Math.atan2(y2 - y, x2 - x)] }; prims.push(q);
        k += Math.max(1, Math.round(evalExpr(node.params.step !== undefined ? node.params.step : '5', ctx, { ...A, k: h }, path + '.' + h))); h++;
      }
    });
    return geo(prims);
  } });
def('copy', { label: 'Copy template', cat: 'geo', out: 'geo', inputs: ['points'],
  params: { n: N(1, 0, 200, 1, 'copies (when no points)'), orient: N(1, 0, 1, 1, 'rotate to @a'), dx: E('0'), dy: E('0') },
  fn: (i, p, ctx, node, id) => {
    const tpl = node.template; if (!tpl || !tpl.nodes || !tpl.nodes[tpl.output]) return EMPTY_GEO();
    const pts = node.in && node.in.points ? flatPoints(i.points) : null, n = pts ? pts.length : Math.round(p.n), prims = [];
    for (let k = 0; k < n; k++) {
      const A = { ...ctx.A, i: k, n, u: (k + 0.5) / n - 0.5 };
      if (pts) Object.assign(A, pts[k].attrs, { px: pts[k].x, py: pts[k].y });
      const c2 = { ...ctx, A, V: Object.create(ctx.V), path: ctx.path + '/' + id + '#' + k };
      ctx.T.used = false; applyLet(tpl, c2); c2.dyn = ctx.dyn || ctx.T.used;
      let g = evalNode(tpl, tpl.output, c2);
      if (pts) {
        const dx = evalExpr(node.params.dx !== undefined ? node.params.dx : 0, c2), dy = evalExpr(node.params.dy !== undefined ? node.params.dy : 0, c2);
        g = transformGeo(g, mat(pts[k].x + dx, pts[k].y + dy, p.orient ? (A.a || 0) : 0));
      }
      prims.push(...g.prims);
    }
    return geo(prims);
  } });

// ---- fields ----
def('field', { label: 'Field', cat: 'field', out: 'field', params: { expr: E('1', 'tone at @x @y') },
  fn: (i, p, ctx, node) => { const src = node.params.expr !== undefined ? node.params.expr : '1'; const f = compileExpr(src); const rand = k => hrand(ctx.seed, ctx.path, k);
    return { sample: (x, y) => f({ ...ctx.A, x, y }, ctx.V, ctx.T, rand, noiseAt, radialAt, dist, clamp01, easeOutCubic, Math.sin, Math.cos, Math.abs, Math.min, Math.max, Math.pow, Math.sqrt, Math.floor, Math.round, Math.PI, TAU), dyn: exprIsDynamic(src) }; } });

// ---- marks ----
const mk = (kind, props) => ({ kind, clip: [], ...props });
def('fill', { label: 'Fill', cat: 'mark', out: 'marks', inputs: ['geo'], params: { ink: INK(), mode: MODE(), tone: N(1, 0, 1, 0.01) },
  fn: (i, p) => [mk('fill', { ink: p.ink, mode: p.mode, tone: p.tone, geo: i.geo })] });
def('stroke', { label: 'Stroke', cat: 'mark', out: 'marks', inputs: ['geo'], params: { ink: INK(), mode: MODE(), w: N(4, 0.2, 60, 0.1), tone: N(1, 0, 1, 0.01) },
  fn: (i, p) => [mk('stroke', { ink: p.ink, mode: p.mode, tone: p.tone, w: p.w, geo: i.geo })] });
def('tint', { label: 'Halftone tint', cat: 'mark', out: 'marks', inputs: ['geo', 'field'], params: { ink: INK('blue'), cell: E('cell.blue'), angle: E('angle.blue') },
  fn: (i, p) => [mk('tint', { ink: p.ink, geo: i.geo, field: i.field, cell: p.cell, angle: p.angle })] });
def('dots', { label: 'Dots at points', cat: 'mark', out: 'marks', inputs: ['geo'], params: { ink: INK('all'), mode: MODE('cut'), tone: N(1, 0, 1, 0.01), r: E('@pw', 'radius per point') },
  fn: (i, p, ctx, node, id) => [mk('dots', { ink: p.ink, mode: p.mode, tone: p.tone, geo: radiiGeo(i.geo, node.params.r !== undefined ? node.params.r : '@pw', ctx, id) })] });
def('glow', { label: 'Glow at points', cat: 'mark', out: 'marks', inputs: ['geo'], params: { ink: INK('yellow'), tone: N(0.8, 0, 1, 0.01), r: E('10', 'radius per point') },
  fn: (i, p, ctx, node, id) => [mk('glow', { ink: p.ink, tone: p.tone, geo: radiiGeo(i.geo, node.params.r !== undefined ? node.params.r : '10', ctx, id) })] });
function radiiGeo(g, expr, ctx, id) {
  return geo(g.prims.map((pr, pi) => { const q = clonePrim(pr); q.pw = pr.pts.map((_, k) => evalExpr(expr, ctx, pointAttrs(pr, k, ctx.A), ctx.path + '/' + id + '#' + pi + '.' + k)); return q; }));
}
def('mask', { label: 'Mask (keep inside)', cat: 'mark', out: 'marks', inputs: ['geo'], params: {}, fn: i => [mk('mask', { geo: i.geo })] });
def('clip', { label: 'Clip marks', cat: 'mark', out: 'marks', inputs: ['marks', 'geo'], params: {},
  fn: i => flatMarks(i.marks).map(m => ({ ...m, clip: [...m.clip, i.geo] })) });
const flatMarks = v => Array.isArray(v) && v.length && Array.isArray(v[0]) ? [].concat(...v) : v;

// ---- subnet input ----
def('input', { label: 'Subnet input', cat: 'util', out: 'any', params: { name: { def: 'in', kind: 'text' } },
  fn: (i, p, ctx) => (ctx.inputs && ctx.inputs[p.name] !== undefined ? ctx.inputs[p.name] : []) });

// ---------------- evaluation ----------------
export const LIB = {};   // subnets: { name: { label, params, xf, graph: { let, nodes, output } } }
export function setLibrary(lib) { for (const k in LIB) delete LIB[k]; Object.assign(LIB, lib); }
const EMPTY = { geo: EMPTY_GEO, marks: () => [], field: () => ({ sample: () => 0 }), any: () => [] };

function applyLet(graph, ctx) { if (graph.let) for (const k in graph.let) ctx.V[k] = evalExpr(graph.let[k], ctx); }
function inputRefs(node) { const out = []; for (const k in node.in || {}) { const v = node.in[k]; Array.isArray(v) ? out.push(...v) : out.push(v); } return out; }

let GID = 0;
const gid = graph => { if (!graph.__gid) Object.defineProperty(graph, '__gid', { value: ++GID, enumerable: false }); return graph.__gid; };
// geometry, fields, images and stencil bundles carry dynamism into a node; marks (in arrays) carry their own flag
const valDyn = v => !!(v && !Array.isArray(v) && v.dyn && (v.prims || v.sample || v.kind === 'image' || v.kind === 'stencils'));
const probeHit = (ctx, id, out) => { if (ctx.probe && ctx.probe.path === ctx.path && ctx.probe.id === id) ctx.probe.result = out; return out; };

export function evalNode(graph, id, ctx) {
  const key = ctx.path + '/' + gid(graph) + '/' + id;
  if (ctx.memo.has(key)) return probeHit(ctx, id, ctx.memo.get(key));
  const node = graph.nodes[id]; if (!node) return [];
  const spec = CAT[node.type], lib = LIB[node.type];
  if (!spec && !lib) return [];
  const kind = spec ? spec.out : 'marks';
  // inputs first, so their time reads do not count as this node's own
  const inp = {}; let inDyn = ctx.dyn;
  for (const k in node.in || {}) {
    const v = node.in[k]; inp[k] = Array.isArray(v) ? v.map(r => evalNode(graph, r, ctx)) : evalNode(graph, v, ctx);
    (Array.isArray(inp[k]) ? inp[k] : [inp[k]]).forEach(x => { if (valDyn(x)) inDyn = true; });
  }
  const T = ctx.T, outerUsed = T.used; T.used = false;
  let out;
  if (node.enabled === false || (node.when !== undefined && !evalExpr(node.when, ctx))) out = EMPTY[kind]();
  else if (lib) out = evalSubnet(lib, node, id, ctx, inp);
  else {
    const p = evalParams(spec.params, node.params || {}, ctx);
    for (const name of spec.inputs) if (inp[name] === undefined || (Array.isArray(inp[name]) && !inp[name].length && name !== 'list' && name !== 'marks')) inp[name] = defaultInput(name);
    out = spec.fn(inp, p, ctx, node, id, graph);
    const dyn = inDyn || T.used;
    const sig = id + JSON.stringify(p) + inputSig(inp);
    if (Array.isArray(out)) out.forEach((m, k) => { m.dyn = !!(m.dyn || dyn); m.sig = sig + '#' + k + (m.geo ? geoSig(m.geo) : ''); });
    else if (out) { out.sig = sig; out.dyn = !!(dyn || out.dyn); }
  }
  T.used = outerUsed || T.used;
  ctx.memo.set(key, out); return probeHit(ctx, id, out);
}
// an unwired input: empty geometry, a zero field, or an empty list
const defaultInput = name => name === 'field' ? { sample: () => 0 } : (name === 'list' || name === 'marks') ? [] : EMPTY_GEO();
const inputSig = inp => Object.values(inp).map(v => Array.isArray(v) ? v.map(m => m.sig).join() : (v && v.sig) || '').join('|');
const geoSig = g => g.prims.length + ':' + geoBounds(g).map(v => Math.round(v)).join(',');

// Inputs keep their own dynamism and flow through `input` nodes; only params and lets that read time
// make the whole instance dynamic.
function evalSubnet(lib, node, id, ctx, inputs) {
  const T = ctx.T; T.used = false;
  const p = evalParams(lib.params || {}, node.params || {}, ctx);
  const V = Object.assign(Object.create(ctx.V), p);   // $values of enclosing graphs stay visible
  const c2 = { ...ctx, V, A: {}, path: ctx.path + '/' + id, inputs };
  applyLet(lib.graph, c2);
  c2.dyn = ctx.dyn || T.used;
  const own = c2.dyn;
  let out = evalNode(lib.graph, lib.graph.output, c2);
  if (lib.xf) {
    const x = evalExpr(lib.xf.x !== undefined ? lib.xf.x : 0, c2), y = evalExpr(lib.xf.y !== undefined ? lib.xf.y : 0, c2);
    const rot = evalExpr(lib.xf.rot !== undefined ? lib.xf.rot : 0, c2), s = evalExpr(lib.xf.scale !== undefined ? lib.xf.scale : 1, c2);
    out = transformOut(out, mat(x, y, rot, s));
  }
  if (Array.isArray(out)) out = out.map(m => ({ ...m, dyn: !!(m.dyn || own), sig: id + JSON.stringify(p) + m.sig }));
  else if (out) { out.dyn = !!(out.dyn || own); out.sig = id + JSON.stringify(p) + out.sig; }
  return out;
}

// Evaluate a scene graph. Returns the output value; `probe` ({path, id}) captures one node's value on the way.
// `cache` is a Map that survives across frames (stencils, static rasters); `node` evaluates a top-level node instead of the output.
export function evalScene(scene, { t = 0, u = 0, iris = 1, f = 0, res = 1080, cache = new Map(), probe = null, node = null }) {
  const ctx = { t, u, iris, f, res, seed: scene.seed, T: timeTracker(t, u, f, iris), V: {}, A: {}, path: '', memo: new Map(), dyn: false, cache, probe };
  applyLet(scene.graph, ctx); ctx.dyn = ctx.T.used;
  return evalNode(scene.graph, node || scene.graph.output, ctx);
}

// ---------------- painting marks onto the stencils ----------------
export function paintMarks(riso, marks) {
  const S = riso.S;
  const eachInk = (ink, fn) => ink === 'all' ? riso.each(s => fn(s)) : fn(S[ink]);
  for (const m of marks) {
    m.clip.forEach(c => riso.pushClip(pathOf(c)));
    const path = m.geo ? pathOf(m.geo) : null;
    if (m.kind === 'fill') {
      if (m.mode === 'cut') eachInk(m.ink, s => s.cut(path));
      else if (m.mode === 'solid') riso.solid(m.ink, path, m.tone);
      else eachInk(m.ink, s => s.fill(path, m.tone));
    } else if (m.kind === 'stroke') {
      for (const pr of m.geo.prims) {
        const pts = pr.closed ? [...pr.pts, pr.pts[0]] : pr.pts, o = { w: m.w, pw: pr.pw ? (pr.closed ? [...pr.pw, pr.pw[0]] : pr.pw) : null, tone: m.tone };
        if (pts.length < 2) continue;
        if (m.mode === 'cut') eachInk(m.ink, s => s.line(pts, { ...o, cut: true }));
        else if (m.mode === 'solid') riso.solidLine(m.ink, pts, o);
        else eachInk(m.ink, s => s.line(pts, o));
      }
    } else if (m.kind === 'tint') {
      if (m.geo.prims.length) S[m.ink].tint(path, (x, y) => m.field.sample(x, y), { cell: m.cell, angle: m.angle, bbox: geoBounds(m.geo) });
    } else if (m.kind === 'dots') {
      const p = c => { for (const pr of m.geo.prims) pr.pts.forEach(([x, y], k) => { const r = pr.pw[k]; if (r > 0) { c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU); } }); };
      if (m.mode === 'cut') eachInk(m.ink, s => s.cut(p));
      else if (m.mode === 'solid') riso.solid(m.ink, p, m.tone);
      else eachInk(m.ink, s => s.fill(p, m.tone));
    } else if (m.kind === 'glow') {
      for (const pr of m.geo.prims) pr.pts.forEach(([x, y], k) => S[m.ink].glow(x, y, pr.pw[k], m.tone));
    } else if (m.kind === 'mask') {
      riso.each(s => s.mask(path));
    }
    m.clip.forEach(() => riso.popXf());
  }
}
