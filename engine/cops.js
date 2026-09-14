import { def, paintMarks, compileExpr, hrand } from './graph.js';
import { Stencils, INKS, U, TAU, mulberry32, makeNoise, hexRgb, clamp01, makeCanvas } from './riso.js';

// cops.js — the compositing layer. Pixel nodes on square rasters at the render resolution.
//
//   image     { w, ch: 1 | 3, data: Float32Array }   1 channel = coverage or tone, 3 = RGB
//   stencils  { blue, pink, yellow }                  three 1-channel images from painted marks
//
// Parameters are in scene units (1080 px) like the geometry nodes; kernels convert with ctx.res / U.
// Static rasters (paper, screens, noise) are cached across frames by their signature.

const img = (w, ch, data) => ({ w, ch, data: data || new Float32Array(w * w * ch), kind: 'image' });
const same = (a) => (a.gpu ? { ...a } : img(a.w, a.ch, a.data));
const flatMarks = v => (Array.isArray(v) && v.length && Array.isArray(v[0]) ? [].concat(...v) : v) || [];

// reuse a raster while its signature holds; on the GPU, kept textures survive the frame
function cached(ctx, id, sig, make) {
  const key = ctx.path + '/' + id, hit = ctx.cache.get(key);
  if (hit && hit.sig === sig) return hit.value;
  if (hit && hit.value && hit.value.gpu && ctx.gpu) ctx.gpu.release(hit.value);
  const value = make(); if (value && value.gpu && ctx.gpu) ctx.gpu.keep(value);
  ctx.cache.set(key, { sig, value }); return value;
}
const staticSig = (ctx, p) => ctx.res + JSON.stringify(p);
// pixel nodes with static inputs are computed once
function memoPixel(ctx, id, p, inputs, make) {
  const list = [].concat(...Object.values(inputs).map(v => (Array.isArray(v) ? v : [v]))).filter(Boolean);
  if (list.some(v => v.dyn)) return make();
  return cached(ctx, id, ctx.res + JSON.stringify(p) + list.map(v => v.sig).join('|'), make);
}
const C = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });

// ---- sources ----
def('rasterize', { label: 'Rasterize marks', cat: 'cop', out: 'stencils', inputs: ['marks'], params: {},
  fn(i, p, ctx, node, id) {
    const key = ctx.path + '/' + id;
    const marks = flatMarks(i.marks);
    let k = 0; while (k < marks.length && !marks[k].dyn) k++;
    const sig = JSON.stringify([ctx.res, marks.slice(0, k).map(m => m.sig)]);
    const out = { kind: 'stencils', dyn: marks.some(m => m.dyn) };
    if (ctx.gpu && ctx.gpu.rasterize) {   // marks become textures directly; the static prefix stays on the GPU
      let st = ctx.cache.get(key); if (!st || st.gpuState === undefined) { st = { gpuState: {} }; ctx.cache.set(key, st); }
      st.gpuState.staticCount = k; st.gpuState.staticKey = sig;
      const r = ctx.gpu.rasterize(marks, ctx.res, st.gpuState);
      for (const ink of INKS) out[ink] = r[ink];
      return out;
    }
    let st = ctx.cache.get(key);
    if (!st || st.res !== ctx.res) { st = { res: ctx.res, S: new Stencils(ctx.res), staticKey: null }; ctx.cache.set(key, st); }
    if (sig !== st.staticKey) { st.S.clearAll(); paintMarks(st.S, marks.slice(0, k)); st.S.snapshotAll(); st.staticKey = sig; }
    else st.S.restoreAll();
    paintMarks(st.S, marks.slice(k));
    for (const ink of INKS) out[ink] = ctx.gpu ? ctx.gpu.fromCanvas(st.S.S[ink].cv, ctx.res) : img(ctx.res, 1, st.S.read(ink));
    return out;
  } });
def('stencil', { label: 'Pick stencil', cat: 'cop', out: 'image', inputs: ['stencils'], params: { ink: { def: 'blue', kind: 'ink' } },
  fn: (i, p) => (i.stencils && i.stencils[p.ink] ? { ...same(i.stencils[p.ink]), dyn: i.stencils.dyn } : img(4, 1)) });
def('paper', { label: 'Paper', cat: 'cop', out: 'image',
  params: { color: { def: '#f3efe6', kind: 'color' }, fibres: C(1, 0, 3, 0.1), seed: C(31, 0, 999, 1) },
  fn: (i, p, ctx, node, id) => cached(ctx, id, staticSig(ctx, p), () => {
    const W = ctx.res, Z = W / U, cv = makeCanvas(W, W);
    const g = cv.getContext('2d'); g.fillStyle = p.color; g.fillRect(0, 0, W, W); g.scale(Z, Z);
    const rng = mulberry32(p.seed), nf = Math.round(900 * p.fibres), ns = Math.round(500 * p.fibres);
    for (let k = 0; k < nf; k++) {
      const x = rng() * U, y = rng() * U, l = 6 + rng() * 18, a = rng() * TAU;
      g.strokeStyle = `rgba(110,100,80,${0.025 + rng() * 0.04})`; g.lineWidth = 0.6 + rng() * 0.6;
      g.beginPath(); g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a + 0.25) * l * 0.5, y + Math.sin(a + 0.25) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
    for (let k = 0; k < ns; k++) { g.fillStyle = `rgba(90,80,60,${0.03 + rng() * 0.05})`; g.beginPath(); g.arc(rng() * U, rng() * U, 0.6 + rng() * 1.8, 0, TAU); g.fill(); }
    if (ctx.gpu) return ctx.gpu.fromCanvasRgb(cv, W);
    const d = g.getImageData(0, 0, W, W).data, out = img(W, 3);
    for (let k = 0; k < W * W; k++) { out.data[k * 3] = d[k * 4] / 255; out.data[k * 3 + 1] = d[k * 4 + 1] / 255; out.data[k * 3 + 2] = d[k * 4 + 2] / 255; }
    return out;
  }) });
def('screen', { label: 'Halftone screen', cat: 'cop', out: 'image',
  params: { cell: C(5.6, 1, 30, 0.1, 'cell (scene px)'), angle: C(15, 0, 90, 1, 'angle (deg)') },
  fn: (i, p, ctx, node, id) => cached(ctx, id, staticSig(ctx, p), () => {
    const W = ctx.res, cell = p.cell * W / U, a = p.angle * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a);
    if (ctx.gpu) return ctx.gpu.screen(W, cell, a);
    const out = img(W, 1);
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      const xr = (x * c + y * sn) / cell, yr = (-x * sn + y * c) / cell;
      const u = xr - Math.floor(xr) - 0.5, v = yr - Math.floor(yr) - 0.5;
      out.data[y * W + x] = Math.PI * (u * u + v * v) / 0.9;   // a round dot grows past 1 at the cell corners
    }
    return out;
  }) });
def('noise', { label: 'Value noise', cat: 'cop', out: 'image',
  params: { scale: C(110, 4, 600, 1, 'scale (scene px)'), seed: C(7, 0, 999, 1) },
  fn: (i, p, ctx, node, id) => cached(ctx, id, staticSig(ctx, p), () => {
    const W = ctx.res, sc = p.scale * W / U;
    if (ctx.gpu) return ctx.gpu.noise(W, sc, p.seed);
    const nz = makeNoise(32, mulberry32(1000 + Math.round(p.seed) * 7919)), out = img(W, 1);
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) out.data[y * W + x] = nz(x / sc, y / sc);
    return out;
  }) });
def('random', { label: 'White noise', cat: 'cop', out: 'image',
  params: { size: C(1, 1, 8, 1, 'grain size (px)'), seed: C(7, 0, 9999, 1) },
  fn: (i, p, ctx, node, id) => cached(ctx, id, staticSig(ctx, p), () => {
    const W = ctx.res, s = Math.max(1, Math.round(p.size));
    if (ctx.gpu) return ctx.gpu.random(W, s, p.seed);
    const out = img(W, 1), rng = mulberry32(Math.round(p.seed) * 2654435761 >>> 0);
    if (s === 1) { for (let k = 0; k < W * W; k++) out.data[k] = rng(); return out; }
    const cells = Math.ceil(W / s), grid = new Float32Array(cells * cells);
    for (let k = 0; k < grid.length; k++) grid[k] = rng();
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) out.data[y * W + x] = grid[((y / s) | 0) * cells + ((x / s) | 0)];
    return out;
  }) });
def('constant', { label: 'Constant', cat: 'cop', out: 'image', params: { value: C(1, -2, 2, 0.01) },
  fn: (i, p, ctx, node, id) => cached(ctx, id, staticSig(ctx, p), () => { if (ctx.gpu) return ctx.gpu.constant(ctx.res, p.value); const out = img(ctx.res, 1); out.data.fill(p.value); return out; }) });

// ---- per-pixel operators ----
def('shift', { label: 'Shift / rotate', cat: 'cop', out: 'image', inputs: ['image'],
  params: { x: C(0, -20, 20, 0.1, 'x (scene px)'), y: C(0, -20, 20, 0.1, 'y (scene px)'), rot: C(0, -0.05, 0.05, 0.0005, 'rotation (rad)') },
  fn: (i, p, ctx, node, id) => memoPixel(ctx, id, p, i, () => {
    const a = i.image, W = a.w, ch = a.ch, Z = W / U;
    if (a.gpu) return ctx.gpu.shift(a, p.x * Z, p.y * Z, p.rot);
    if (!p.x && !p.y && !p.rot) return same(a);
    const out = img(W, ch), c = Math.cos(-p.rot), s = Math.sin(-p.rot), cx = W / 2, cy = W / 2, dx = p.x * Z, dy = p.y * Z, d = a.data, o = out.data;
    for (let y = 0; y < W; y++) {
      const py = y - dy - cy;
      for (let x = 0; x < W; x++) {
        const px = x - dx - cx, sx = px * c - py * s + cx, sy = px * s + py * c + cy;
        const x0 = Math.floor(sx), y0 = Math.floor(sy);
        if (x0 < 0 || y0 < 0 || x0 >= W - 1 || y0 >= W - 1) continue;   // outside stays empty
        const fx = sx - x0, fy = sy - y0, q = (y * W + x) * ch, r0 = (y0 * W + x0) * ch, r1 = r0 + W * ch;
        for (let k = 0; k < ch; k++)
          o[q + k] = (d[r0 + k] * (1 - fx) + d[r0 + ch + k] * fx) * (1 - fy) + (d[r1 + k] * (1 - fx) + d[r1 + ch + k] * fx) * fy;
      }
    }
    return out;
  }) });
def('remap', { label: 'Remap 0..1 → lo..hi', cat: 'cop', out: 'image', inputs: ['image'], params: { lo: C(0, -2, 2), hi: C(1, -2, 2) },
  fn: (i, p, ctx, node, id) => memoPixel(ctx, id, p, i, () => { const a = i.image; if (a.gpu) return ctx.gpu.remap(a, p.lo, p.hi); const out = img(a.w, a.ch); for (let k = 0; k < a.data.length; k++) out.data[k] = p.lo + a.data[k] * (p.hi - p.lo); return out; }) });
const OPS = { add: (a, b) => a + b, multiply: (a, b) => a * b, max: Math.max, min: Math.min };
function nary(list, type, gpu) {
  if (gpu && list.some(v => v && v.gpu)) return gpu[type](list.filter(v => v && v.gpu));
  const L = list.filter(v => v && v.data); if (!L.length) return img(4, 1);
  const W = L[0].w, n = W * W;
  if (L.every(v => v.ch === 1)) {   // the common case: tight loops per operator
    const out = img(W, 1), o = out.data; o.set(L[0].data);
    for (let j = 1; j < L.length; j++) {
      const d = L[j].data;
      if (type === 'add') { for (let k = 0; k < n; k++) o[k] += d[k]; }
      else if (type === 'multiply') { for (let k = 0; k < n; k++) o[k] *= d[k]; }
      else if (type === 'max') { for (let k = 0; k < n; k++) if (d[k] > o[k]) o[k] = d[k]; }
      else { for (let k = 0; k < n; k++) if (d[k] < o[k]) o[k] = d[k]; }
    }
    return out;
  }
  const out = img(W, 3), o = out.data;
  if (type === 'multiply') {
    o.fill(1);
    for (const v of L) { const d = v.data; if (v.ch === 3) { for (let k = 0; k < n * 3; k++) o[k] *= d[k]; } else { for (let px = 0; px < n; px++) { const g = d[px], q = px * 3; o[q] *= g; o[q + 1] *= g; o[q + 2] *= g; } } }
    return out;
  }
  const op = OPS[type];
  for (let px = 0; px < n; px++) for (let k = 0; k < 3; k++) {
    let acc = L[0].ch === 1 ? L[0].data[px] : L[0].data[px * 3 + k];
    for (let j = 1; j < L.length; j++) { const v = L[j]; acc = op(acc, v.ch === 1 ? v.data[px] : v.data[px * 3 + k]); }
    o[px * 3 + k] = acc;
  }
  return out;
}
for (const [type, label] of [['add', 'Add'], ['multiply', 'Multiply'], ['max', 'Max'], ['min', 'Min']])
  def(type, { label, cat: 'cop', out: 'image', inputs: ['list'], params: {}, fn: (i, p, ctx, node, id) => memoPixel(ctx, id, p, i, () => nary(i.list, type, ctx.gpu)) });
def('compare', { label: 'Compare a > b', cat: 'cop', out: 'image', inputs: ['a', 'b'], params: { softness: C(0.14, 0.001, 1, 0.001) },
  fn: (i, p, ctx, node, id) => memoPixel(ctx, id, p, i, () => {
    const a = i.a, b = i.b; if (a.gpu || b.gpu) return ctx.gpu.compare(a, b, p.softness);
    const W = a.w, n = W * W, out = img(W, 1), o = out.data, inv = 1 / p.softness;
    const A = a.data, B = b.data, sa = a.ch, sb = b.ch;
    for (let k = 0; k < n; k++) { const v = (A[k * sa] - B[k * sb]) * inv + 0.5; o[k] = v < 0 ? 0 : v > 1 ? 1 : v; }
    return out; }) });
def('ink', { label: 'Ink', cat: 'cop', out: 'image', inputs: ['image'], params: { color: { def: '#ff48b0', kind: 'color' } },
  fn: (i, p, ctx, node, id) => memoPixel(ctx, id, p, i, () => {
    const a = i.image, [r, g, b] = hexRgb(p.color); if (a.gpu) return ctx.gpu.ink(a, [r, g, b]);
    const out = img(a.w, 3), n = a.w * a.w;
    for (let k = 0; k < n; k++) { const v = a.ch === 1 ? a.data[k] : a.data[k * 3]; out.data[k * 3] = 1 - v * (1 - r); out.data[k * 3 + 1] = 1 - v * (1 - g); out.data[k * 3 + 2] = 1 - v * (1 - b); }
    return out;
  }) });
def('pixel', { label: 'Pixel expression', cat: 'cop', out: 'image', inputs: ['a', 'b'], params: { expr: { def: '@a', kind: 'expr', label: 'value at @x @y from @a @b' } },
  fn: (i, p, ctx, node, id) => memoPixel(ctx, id, p, i, () => {
    // expressions run on the CPU; GPU inputs read as 0 (no readback inside a frame)
    const a = i.a && i.a.data ? i.a : null, b = i.b && i.b.data ? i.b : null, W = (a || b || { w: ctx.res }).w, out = img(W, 1);
    const f = compileExpr(node.params.expr !== undefined ? node.params.expr : '@a'), rand = k => hrand(ctx.seed, ctx.path + '/' + id, k), Z = U / W;
    const A = { ...ctx.A };
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      const k = y * W + x; A.x = x * Z; A.y = y * Z; A.a = a ? (a.ch === 1 ? a.data[k] : a.data[k * 3]) : 0; A.b = b ? (b.ch === 1 ? b.data[k] : b.data[k * 3]) : 0;
      out.data[k] = f(A, ctx.V, ctx.T, rand, () => 0, () => 0, () => 0, clamp01, v => v, Math.sin, Math.cos, Math.abs, Math.min, Math.max, Math.pow, Math.sqrt, Math.floor, Math.round, Math.PI, TAU);
    }
    return out;
  }) });

// ---------------- previews: any value onto a canvas ----------------
const PROOF = { blue: hexRgb('#0078bf'), pink: hexRgb('#ff48b0'), yellow: hexRgb('#ffe800') };
let proofStencils = null;
export function drawImage(ctx2d, im) {
  const W = im.w, out = ctx2d.createImageData(W, W), o = out.data;
  for (let k = 0; k < W * W; k++) {
    if (im.ch === 3) { o[k * 4] = im.data[k * 3] * 255; o[k * 4 + 1] = im.data[k * 3 + 1] * 255; o[k * 4 + 2] = im.data[k * 3 + 2] * 255; }
    else { const v = (1 - clamp01(im.data[k])) * 255; o[k * 4] = v; o[k * 4 + 1] = v; o[k * 4 + 2] = v; }
    o[k * 4 + 3] = 255;
  }
  ctx2d.putImageData(out, 0, 0);
}
function drawStencils(ctx2d, st, res) {
  const out = img(res, 3); out.data.fill(0.95);
  for (const ink of INKS) { const [r, g, b] = PROOF[ink], d = st[ink].data; for (let k = 0; k < res * res; k++) { const v = d[k] * 0.94; out.data[k * 3] *= 1 - v * (1 - r); out.data[k * 3 + 1] *= 1 - v * (1 - g); out.data[k * 3 + 2] *= 1 - v * (1 - b); } }
  drawImage(ctx2d, out);
}
// target: { ctx2d } for a 2D canvas, or { gpu, gpuCtx, scratch } for a WebGPU canvas. On a
// WebGPU target everything is presented as a texture: GPU images directly, anything else via a
// scratch 2D canvas uploaded once.
export function drawValue(target, value, res) {
  const W = res;
  if (!value) return;
  if (target.gpu) {
    if (value.kind === 'image' && value.gpu && value.w === W) return target.gpu.present(value, target.gpuCtx);
    if (value.kind === 'stencils' && value.blue && value.blue.gpu) {
      const [rb, gb, bb] = PROOF.blue, [rp, gp, bp] = PROOF.pink, [ry, gy, by] = PROOF.yellow, g = target.gpu;
      const paper = g.constant(W, 0.95);
      return g.present(g.multiply([paper, g.ink(g.remap(value.blue, 0, 0.94), [rb, gb, bb]), g.ink(g.remap(value.pink, 0, 0.94), [rp, gp, bp]), g.ink(g.remap(value.yellow, 0, 0.94), [ry, gy, by])]), target.gpuCtx);
    }
    if (Array.isArray(value) && target.gpu.rasterize) {
      const st = target.gpu.rasterize(flatMarks(value), W, target.proofState || (target.proofState = {}));
      return drawValue(target, { kind: 'stencils', ...st }, res);
    }
    const sc = target.scratch;
    if (value.kind === 'image' && value.w === W) drawImage(sc, value); else drawValue({ ctx2d: sc }, value, res);
    return target.gpu.present(target.gpu.fromCanvasRgb(sc.canvas, W), target.gpuCtx);
  }
  const ctx2d = target.ctx2d;
  if (value.kind === 'image' && value.w === W) return drawImage(ctx2d, value);
  if (value.kind === 'stencils') return drawStencils(ctx2d, value, W);
  ctx2d.setTransform(1, 0, 0, 1, 0, 0); ctx2d.fillStyle = '#fff'; ctx2d.fillRect(0, 0, W, W);
  if (Array.isArray(value)) {   // marks: paint into scratch stencils and show a flat proof
    if (!proofStencils || proofStencils.res !== W) proofStencils = new Stencils(W);
    proofStencils.clearAll(); paintMarks(proofStencils, flatMarks(value));
    const st = {}; for (const ink of INKS) st[ink] = img(W, 1, proofStencils.read(ink));
    return drawStencils(ctx2d, st, W);
  }
  const Z = W / U; ctx2d.scale(Z, Z);
  if (value.prims) {   // geometry: outlines and points
    ctx2d.strokeStyle = '#1d2340'; ctx2d.fillStyle = '#1d2340'; ctx2d.lineWidth = 1.2 / Z;
    for (const pr of value.prims) {
      if (pr.pts.length === 1) { ctx2d.beginPath(); ctx2d.arc(pr.pts[0][0], pr.pts[0][1], 2.5 / Z, 0, TAU); ctx2d.fill(); continue; }
      ctx2d.beginPath(); pr.pts.forEach((q, k) => (k ? ctx2d.lineTo(q[0], q[1]) : ctx2d.moveTo(q[0], q[1]))); if (pr.closed) ctx2d.closePath(); ctx2d.stroke();
    }
  } else if (value.sample) {   // field: sampled on a grid
    const n = 90, s = U / n;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const v = (1 - clamp01(value.sample((i + 0.5) * s, (j + 0.5) * s))) * 255; ctx2d.fillStyle = `rgb(${v},${v},${v})`; ctx2d.fillRect(i * s, j * s, s + 0.5, s + 0.5); }
  }
  ctx2d.setTransform(1, 0, 0, 1, 0, 0);
}
