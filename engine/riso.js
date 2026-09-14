// Ink stencils: three grayscale canvases that marks are painted onto.
// Scene coordinates are always 0..U (1080). The canvas resolution can be lower.

export const TAU = Math.PI * 2;
export const U = 1080;

export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export function makeRng(seed) {
  const R = mulberry32(seed);
  R.range = (a, b) => a + (b - a) * R();
  R.pick = arr => arr[Math.floor(R() * arr.length)];
  return R;
}
export const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
export const dist = (x, y, px, py) => Math.hypot(x - px, y - py);
export const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);

// tiling value noise
export function makeNoise(n, rng) {
  const g = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) g[i] = rng();
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const fx = x - xi, fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const i0 = ((xi % n) + n) % n, i1 = (i0 + 1) % n;
    const j0 = ((yi % n) + n) % n, j1 = (j0 + 1) % n;
    const a = g[j0 * n + i0], b = g[j0 * n + i1], c = g[j1 * n + i0], d = g[j1 * n + i1];
    return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
  };
}

// a 2D canvas on the main thread or in a worker
export function makeCanvas(w, h) {
  if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  return new OffscreenCanvas(w, h);
}

// One ink separation: a grayscale canvas, white = full ink, black = bare paper.
export class Sep {
  constructor(name, res) {
    this.name = name; this.res = res; this.Z = res / U;
    this.cv = makeCanvas(res, res);
    this.g = this.cv.getContext('2d', { willReadFrequently: true });
    this.cache = null;
    this.clear();
  }
  base() { this.g.setTransform(this.Z, 0, 0, this.Z, 0, 0); }
  clear() {
    const g = this.g; g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#000'; g.fillRect(0, 0, this.res, this.res); this.base();
  }
  snapshot() {
    if (!this.cache) this.cache = makeCanvas(this.res, this.res);
    const c = this.cache.getContext('2d'); c.drawImage(this.cv, 0, 0);
  }
  restore() {
    const g = this.g; g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'copy'; g.drawImage(this.cache, 0, 0); g.restore();
  }
  gray(t) { const v = Math.round(clamp01(t) * 255); return `rgb(${v},${v},${v})`; }
  // solid fill; new ink adds to existing ink (screen = 1-(1-a)(1-b))
  fill(path, tone = 1) {
    const g = this.g; g.save(); g.globalCompositeOperation = 'screen';
    g.beginPath(); path(g); g.fillStyle = this.gray(tone); g.fill(); g.restore();
  }
  // knockout to bare paper
  cut(path) {
    const g = this.g; g.save(); g.beginPath(); path(g); g.fillStyle = '#000'; g.fill(); g.restore();
  }
  // remove all ink outside the path
  mask(path) {
    const g = this.g; g.save(); g.beginPath(); g.rect(-2, -2, U + 4, U + 4); path(g);
    g.fillStyle = '#000'; g.fill('evenodd'); g.restore();
  }
  // pw: optional per-point widths. A variable-width line is one filled outline: the left offsets,
  // then the right offsets back, with round caps. One draw call per polyline.
  line(pts, { w = 4, pw = null, tone = 1, cut = false } = {}) {
    const g = this.g; g.save();
    g.globalCompositeOperation = cut ? 'source-over' : 'screen';
    const col = cut ? '#000' : this.gray(tone);
    if (!pw) {
      g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
      pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]));
      g.stroke(); g.restore(); return;
    }
    const n = pts.length; if (n < 2) { g.restore(); return; }
    const L = [], R = [];
    for (let i = 0; i < n; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(n - 1, i + 1)];
      let dx = p1[0] - p0[0], dy = p1[1] - p0[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const h = Math.max(0.3, pw[i]) / 2;
      L.push([pts[i][0] - dy * h, pts[i][1] + dx * h]); R.push([pts[i][0] + dy * h, pts[i][1] - dx * h]);
    }
    g.fillStyle = col; g.beginPath();
    g.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < n; i++) g.lineTo(L[i][0], L[i][1]);
    const e = pts[n - 1], a = pts[n - 2], ae = Math.atan2(e[1] - a[1], e[0] - a[0]);
    g.arc(e[0], e[1], Math.max(0.3, pw[n - 1]) / 2, ae - Math.PI / 2, ae + Math.PI / 2);
    for (let i = n - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
    const s0 = pts[0], s1 = pts[1], as = Math.atan2(s1[1] - s0[1], s1[0] - s0[0]);
    g.arc(s0[0], s0[1], Math.max(0.3, pw[0]) / 2, as + Math.PI / 2, as + 3 * Math.PI / 2);
    g.closePath(); g.fill(); g.restore();
  }
  // soft radial blob; the composite halftones it per pixel
  glow(x, y, r, tone = 1, inner = 0) {
    const g = this.g; g.save(); g.globalCompositeOperation = 'screen';
    const gr = g.createRadialGradient(x, y, r * inner, x, y, r);
    gr.addColorStop(0, this.gray(tone)); gr.addColorStop(1, '#000');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.restore();
  }
  // vector halftone: a rotated dot grid clipped to path, dot area from toneFn(x, y)
  tint(path, toneFn, { cell = 6, angle = 0, bbox }) {
    const g = this.g; g.save();
    g.beginPath(); path(g); g.clip();
    g.globalCompositeOperation = 'screen'; g.fillStyle = '#fff';
    const c = Math.cos(angle), s = Math.sin(angle);
    const [x0, y0, x1, y1] = bbox;
    let imin = 1e9, imax = -1e9, jmin = 1e9, jmax = -1e9;
    for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) {
      const i = (x * c + y * s) / cell, j = (-x * s + y * c) / cell;
      imin = Math.min(imin, i); imax = Math.max(imax, i); jmin = Math.min(jmin, j); jmax = Math.max(jmax, j);
    }
    g.beginPath();
    for (let i = Math.floor(imin); i <= Math.ceil(imax); i++) {
      for (let j = Math.floor(jmin); j <= Math.ceil(jmax); j++) {
        const x = i * cell * c - j * cell * s, y = i * cell * s + j * cell * c;
        if (x < x0 - cell || x > x1 + cell || y < y0 - cell || y > y1 + cell) continue;
        const t = toneFn(x, y);
        if (t <= 0.03) continue;
        const r = t >= 0.97 ? cell * 0.75 : cell * Math.sqrt(t / Math.PI) * 1.06;
        g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU);
      }
    }
    g.fill(); g.restore();
  }
}

export const INKS = ['blue', 'pink', 'yellow'];

// Three stencils and the helpers marks are painted with. Reading a stencil gives ink coverage 0..1.
export class Stencils {
  constructor(res) {
    this.res = res; this.Z = res / U;
    this.S = {}; INKS.forEach(k => this.S[k] = new Sep(k, res));
    this.ALL = INKS.map(k => this.S[k]);
  }
  each(fn) { this.ALL.forEach(fn); }
  cutAll(path) { this.each(s => s.cut(path)); }
  cutLineAll(pts, o) { this.each(s => s.line(pts, { ...o, cut: true })); }
  // pure ink: knock the other inks out, then print this one
  solid(ink, path, tone = 1) { this.each(s => s.name === ink ? s.fill(path, tone) : s.cut(path)); }
  solidLine(ink, pts, o) { this.each(s => s.line(pts, s.name === ink ? o : { ...o, cut: true })); }
  pushXf(x, y, rot = 0, sc = 1) { this.each(s => { s.g.save(); s.g.translate(x, y); s.g.rotate(rot); s.g.scale(sc, sc); }); }
  popXf() { this.each(s => s.g.restore()); }
  pushClip(path) { this.each(s => { s.g.save(); s.g.beginPath(); path(s.g); s.g.clip(); }); }
  clearAll() { this.each(s => s.clear()); }
  snapshotAll() { this.each(s => s.snapshot()); }
  restoreAll() { this.each(s => s.restore()); }
  read(ink) {
    const W = this.res, d = this.S[ink].g.getImageData(0, 0, W, W).data, out = new Float32Array(W * W);
    for (let i = 0; i < out.length; i++) out[i] = d[i * 4] / 255;
    return out;
  }
}
