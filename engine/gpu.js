// gpu.js — the compositing kernels of cops.js on WebGPU.
//
// Every image lives in an rgba32float storage texture of size w×w. A 1-channel image keeps its
// value replicated in r, g and b, so mixing 1- and 3-channel inputs needs no special case in the
// shaders; `ch` on the GpuImage says how many channels are meaningful. Kernels are 8×8 compute
// passes recorded into one command encoder; `flush()`, `present()` and `readback()` submit it.
//
// Lifetime: `gpu.beginFrame()` … `gpu.endFrame()` recycles every image allocated in between that
// was not marked with `gpu.keep(img)`. `gpu.release(img)` returns one image early. Images made
// outside a frame stay allocated until released.

import { mulberry32 } from './riso.js';

const SLOT = 256;            // bytes per uniform slot (dynamic offset alignment)
const SLOTS = 4096;
const WG = 8;

// noise() and random() take the node's seed parameter and derive the RNG seed as cops.js does
const seedRandom = seed => Math.round(seed) * 2654435761 >>> 0;
const seedNoise = seed => 1000 + Math.round(seed) * 7919;

// ---------------- WGSL ----------------
// Each kernel gets the same bindings: uniforms, the output texture, then its input textures.
function kernelSource(nIn, uniforms, body) {
  let s = `struct P { ${uniforms} }\n@group(0) @binding(0) var<uniform> p: P;\n@group(0) @binding(1) var out: texture_storage_2d<rgba32float, write>;\n`;
  for (let k = 0; k < nIn; k++) s += `@group(0) @binding(${2 + k}) var t${k}: texture_2d<f32>;\n`;
  s += `@compute @workgroup_size(${WG}, ${WG}) fn main(@builtin(global_invocation_id) id: vec3u) {
  let W = i32(textureDimensions(out).x);
  let x = i32(id.x); let y = i32(id.y);
  if (x >= W || y >= W) { return; }
  let q = vec2i(x, y);
${body}
}`;
  return s;
}
const ld = (t, at = 'q') => `textureLoad(${t}, ${at}, 0)`;

// {name: [inputCount, uniforms, body]}. Uniforms are laid out as the JS side packs them (see the methods).
const KERNELS = {
  constant: [0, 'v: f32,', `  textureStore(out, q, vec4f(p.v, p.v, p.v, 1.0));`],
  screen: [0, 'cell: f32, c: f32, sn: f32,', `
  let xr = (f32(x) * p.c + f32(y) * p.sn) / p.cell;
  let yr = (-f32(x) * p.sn + f32(y) * p.c) / p.cell;
  let u = xr - floor(xr) - 0.5; let v = yr - floor(yr) - 0.5;
  let o = 3.141592653589793 * (u * u + v * v) / 0.9;
  textureStore(out, q, vec4f(o, o, o, 1.0));`],
  // t0 is the 32×32 value grid; smoothstep interpolation, tiling
  noise: [1, 'sc: f32,', `
  let fx0 = f32(x) / p.sc; let fy0 = f32(y) / p.sc;
  let xi = i32(floor(fx0)); let yi = i32(floor(fy0));
  let fx = fx0 - f32(xi); let fy = fy0 - f32(yi);
  let sx = fx * fx * (3.0 - 2.0 * fx); let sy = fy * fy * (3.0 - 2.0 * fy);
  let i0 = ((xi % 32) + 32) % 32; let i1 = (i0 + 1) % 32;
  let j0 = ((yi % 32) + 32) % 32; let j1 = (j0 + 1) % 32;
  let a = textureLoad(t0, vec2i(i0, j0), 0).r; let b = textureLoad(t0, vec2i(i1, j0), 0).r;
  let c = textureLoad(t0, vec2i(i0, j1), 0).r; let d = textureLoad(t0, vec2i(i1, j1), 0).r;
  let o = (a + (b - a) * sx) * (1.0 - sy) + (c + (d - c) * sx) * sy;
  textureStore(out, q, vec4f(o, o, o, 1.0));`],
  // mulberry32 state after k calls is seed + k*0x6D2B79F5, so the k-th value is a pure function of k
  random: [0, 'seed: u32, size: u32, cells: u32,', `
  let k = (u32(y) / p.size) * p.cells + u32(x) / p.size;
  var a = p.seed + (k + 1u) * 0x6D2B79F5u;
  var t = (a ^ (a >> 15u)) * (1u | a);
  t = (t + (t ^ (t >> 7u)) * (61u | t)) ^ t;
  let o = f32(t ^ (t >> 14u)) / 4294967296.0;
  textureStore(out, q, vec4f(o, o, o, 1.0));`],
  convert1: [1, 'pad: f32,', `  let v = ${ld('t0')}.r; textureStore(out, q, vec4f(v, v, v, 1.0));`],
  convert3: [1, 'pad: f32,', `  textureStore(out, q, vec4f(${ld('t0')}.rgb, 1.0));`],
  // bilinear resample about the centre; samples whose 2×2 footprint leaves the raster stay 0
  shift: [1, 'dx: f32, dy: f32, c: f32, s: f32,', `
  let h = f32(W) / 2.0;
  let px = f32(x) - p.dx - h; let py = f32(y) - p.dy - h;
  let sx = px * p.c - py * p.s + h; let sy = px * p.s + py * p.c + h;
  let x0 = i32(floor(sx)); let y0 = i32(floor(sy));
  var o = vec4f(0.0, 0.0, 0.0, 1.0);
  if (x0 >= 0 && y0 >= 0 && x0 < W - 1 && y0 < W - 1) {
    let fx = sx - f32(x0); let fy = sy - f32(y0);
    let r00 = ${ld('t0', 'vec2i(x0, y0)')}; let r10 = ${ld('t0', 'vec2i(x0 + 1, y0)')};
    let r01 = ${ld('t0', 'vec2i(x0, y0 + 1)')}; let r11 = ${ld('t0', 'vec2i(x0 + 1, y0 + 1)')};
    o = (r00 * (1.0 - fx) + r10 * fx) * (1.0 - fy) + (r01 * (1.0 - fx) + r11 * fx) * fy;
    o.a = 1.0;
  }
  textureStore(out, q, o);`],
  remap: [1, 'lo: f32, hi: f32,', `  let v = ${ld('t0')}; textureStore(out, q, vec4f(p.lo + v.rgb * (p.hi - p.lo), 1.0));`],
  add: [2, 'pad: f32,', `  textureStore(out, q, vec4f(${ld('t0')}.rgb + ${ld('t1')}.rgb, 1.0));`],
  multiply: [2, 'pad: f32,', `  textureStore(out, q, vec4f(${ld('t0')}.rgb * ${ld('t1')}.rgb, 1.0));`],
  max: [2, 'pad: f32,', `  textureStore(out, q, vec4f(max(${ld('t0')}.rgb, ${ld('t1')}.rgb), 1.0));`],
  min: [2, 'pad: f32,', `  textureStore(out, q, vec4f(min(${ld('t0')}.rgb, ${ld('t1')}.rgb), 1.0));`],
  compare: [2, 'inv: f32,', `
  let v = clamp((${ld('t0')}.r - ${ld('t1')}.r) * p.inv + 0.5, 0.0, 1.0);
  textureStore(out, q, vec4f(v, v, v, 1.0));`],
  ink: [1, 'r: f32, g: f32, b: f32,', `
  let v = ${ld('t0')}.r;
  textureStore(out, q, vec4f(1.0 - v * (1.0 - vec3f(p.r, p.g, p.b)), 1.0));`],
};

// fullscreen triangle; the fragment maps canvas pixels onto the image (nearest)
const PRESENT_WGSL = `
struct P { w: f32, ch: f32, cw: f32, chh: f32, }
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var img: texture_2d<f32>;
@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let xy = vec2f(f32((i << 1u) & 2u), f32(i & 2u));
  return vec4f(xy * 2.0 - 1.0, 0.0, 1.0);
}
@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let q = vec2i(pos.xy * vec2f(p.w / p.cw, p.w / p.chh));
  let v = textureLoad(img, clamp(q, vec2i(0), vec2i(i32(p.w) - 1)), 0);
  if (p.ch < 2.0) { let g = 1.0 - clamp(v.r, 0.0, 1.0); return vec4f(g, g, g, 1.0); }
  return vec4f(v.rgb, 1.0);
}`;

export async function createGpu() {
  if (typeof navigator === 'undefined' || !navigator.gpu) return null;
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return null;
    const device = await adapter.requestDevice();
    return new Gpu(device);
  } catch (e) { console.warn('WebGPU unavailable:', e); return null; }
}

class Gpu {
  constructor(device) {
    this.device = device;
    this.pool = new Map();           // w -> free GPUTexture[] (rgba32float)
    this.pool8 = new Map();          // w -> free GPUTexture[] (rgba8unorm canvas staging)
    this.staged = [];                // rgba8 textures in use until the next submit
    this.frame = new Set();          // images allocated since beginFrame, recycled at endFrame
    this.grids = new Map();          // noise seed -> 32×32 r32float grid texture
    this.layouts = new Map();        // input count -> GPUBindGroupLayout
    this.pipelines = new Map();      // kernel name -> GPUComputePipeline
    this.configured = new WeakSet(); // canvas contexts we configured
    this.uniforms = device.createBuffer({ size: SLOT * SLOTS, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.slot = 0;
    this.encoder = null;
    this.presentPipeline = null;
  }

  // ---- lifetime ----
  image(w, ch) {
    const free = this.pool.get(w);
    const tex = free && free.length ? free.pop() : this.device.createTexture({
      size: [w, w], format: 'rgba32float',
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST,
    });
    const img = { kind: 'image', gpu: true, w, ch, tex };
    this.frame.add(img);
    return img;
  }
  release(img) {
    if (!img || !img.tex) return;
    this.frame.delete(img);
    if (!this.pool.has(img.w)) this.pool.set(img.w, []);
    this.pool.get(img.w).push(img.tex);
    img.tex = null;
  }
  keep(img) { this.frame.delete(img); return img; }
  beginFrame() { this.frame.clear(); }
  endFrame() { for (const img of [...this.frame]) this.release(img); }

  // ---- command recording ----
  enc() { return this.encoder || (this.encoder = this.device.createCommandEncoder()); }
  flush() {
    if (this.encoder) { this.device.queue.submit([this.encoder.finish()]); this.encoder = null; }
    for (const t of this.staged) { if (!this.pool8.has(t.width)) this.pool8.set(t.width, []); this.pool8.get(t.width).push(t); }
    this.staged = [];
    this.slot = 0;
  }
  layout(nIn) {
    if (this.layouts.has(nIn)) return this.layouts.get(nIn);
    const entries = [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform', hasDynamicOffset: true, minBindingSize: 0 } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: 'write-only', format: 'rgba32float' } },
    ];
    for (let k = 0; k < nIn; k++) entries.push({ binding: 2 + k, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: 'unfilterable-float' } });
    const l = this.device.createBindGroupLayout({ entries }); this.layouts.set(nIn, l); return l;
  }
  pipeline(name) {
    if (this.pipelines.has(name)) return this.pipelines.get(name);
    const [nIn, uniforms, body] = KERNELS[name];
    const pl = this.device.createComputePipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.layout(nIn)] }),
      compute: { module: this.device.createShaderModule({ code: kernelSource(nIn, uniforms, body) }), entryPoint: 'main' },
    });
    this.pipelines.set(name, pl); return pl;
  }
  // one compute pass: write `data` (an ArrayBuffer view, ≤ SLOT bytes) to a uniform slot and dispatch over out
  run(name, inputs, out, data) {
    if (this.slot >= SLOTS) this.flush();
    const off = this.slot++ * SLOT;
    this.device.queue.writeBuffer(this.uniforms, off, data.buffer, data.byteOffset, data.byteLength);
    const entries = [{ binding: 0, resource: { buffer: this.uniforms, offset: 0, size: SLOT } }, { binding: 1, resource: out.tex.createView() }];
    inputs.forEach((t, k) => entries.push({ binding: 2 + k, resource: (t.tex || t).createView() }));
    const bg = this.device.createBindGroup({ layout: this.layout(inputs.length), entries });
    const pass = this.enc().beginComputePass();
    pass.setPipeline(this.pipeline(name)); pass.setBindGroup(0, bg, [off]);
    const n = Math.ceil(out.w / WG); pass.dispatchWorkgroups(n, n); pass.end();
    return out;
  }
  f32(...v) { return new Float32Array(v); }

  // ---- sources ----
  constant(w, value) { return this.run('constant', [], this.image(w, 1), this.f32(value)); }
  screen(w, cell, angle) { return this.run('screen', [], this.image(w, 1), this.f32(cell, Math.cos(angle), Math.sin(angle))); }
  noise(w, scale, seed) {
    const s = seedNoise(seed); let grid = this.grids.get(s);
    if (!grid) {
      const rng = mulberry32(s), g = new Float32Array(32 * 32);
      for (let i = 0; i < g.length; i++) g[i] = rng();
      grid = this.device.createTexture({ size: [32, 32], format: 'r32float', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
      this.device.queue.writeTexture({ texture: grid }, g, { bytesPerRow: 32 * 4 }, [32, 32]);
      this.grids.set(s, grid);
    }
    return this.run('noise', [grid], this.image(w, 1), this.f32(scale));
  }
  random(w, size, seed) {
    const s = Math.max(1, Math.round(size)), cells = Math.ceil(w / s);
    return this.run('random', [], this.image(w, 1), new Uint32Array([seedRandom(seed), s, cells]));
  }
  // a CPU image {w, ch, data} onto the GPU
  upload(im) {
    const w = im.w, out = this.image(w, im.ch), d = im.data, rgba = new Float32Array(w * w * 4);
    for (let k = 0; k < w * w; k++) {
      if (im.ch === 3) { rgba[k * 4] = d[k * 3]; rgba[k * 4 + 1] = d[k * 3 + 1]; rgba[k * 4 + 2] = d[k * 3 + 2]; }
      else { rgba[k * 4] = rgba[k * 4 + 1] = rgba[k * 4 + 2] = d[k]; }
      rgba[k * 4 + 3] = 1;
    }
    this.device.queue.writeTexture({ texture: out.tex }, rgba, { bytesPerRow: w * 16 }, [w, w]);
    return out;
  }
  stage(canvas, w) {
    if (canvas.width !== w || canvas.height !== w) throw new Error(`fromCanvas: canvas is ${canvas.width}×${canvas.height}, expected ${w}×${w}`);
    const free = this.pool8.get(w);
    const tex = free && free.length ? free.pop() : this.device.createTexture({
      size: [w, w], format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.device.queue.copyExternalImageToTexture({ source: canvas }, { texture: tex }, [w, w]);
    this.staged.push(tex);
    return tex;
  }
  fromCanvas(canvas, w) { return this.run('convert1', [this.stage(canvas, w)], this.image(w, 1), this.f32(0)); }
  fromCanvasRgb(canvas, w) { return this.run('convert3', [this.stage(canvas, w)], this.image(w, 3), this.f32(0)); }

  // ---- per-pixel operators ----
  shift(img, dx, dy, rot) {
    if (!dx && !dy && !rot) return img;
    return this.run('shift', [img], this.image(img.w, img.ch), this.f32(dx, dy, Math.cos(-rot), Math.sin(-rot)));
  }
  remap(img, lo, hi) { return this.run('remap', [img], this.image(img.w, img.ch), this.f32(lo, hi)); }
  nary(name, list) {
    const L = list.filter(v => v && v.tex);
    if (!L.length) return this.constant(4, 0);
    const ch = L.some(v => v.ch === 3) ? 3 : 1;
    let acc = L[0];
    for (let j = 1; j < L.length; j++) acc = this.run(name, [acc, L[j]], this.image(acc.w, ch), this.f32(0));
    return acc;
  }
  add(list) { return this.nary('add', list); }
  multiply(list) { return this.nary('multiply', list); }
  max(list) { return this.nary('max', list); }
  min(list) { return this.nary('min', list); }
  compare(a, b, softness) { return this.run('compare', [a, b], this.image(a.w, 1), this.f32(1 / softness)); }
  ink(img, [r, g, b]) { return this.run('ink', [img], this.image(img.w, 3), this.f32(r, g, b)); }

  // ---- output ----
  present(img, context) {
    const dev = this.device, canvas = context.canvas;
    if (!this.configured.has(context)) { context.configure({ device: dev, format: navigator.gpu.getPreferredCanvasFormat(), alphaMode: 'opaque' }); this.configured.add(context); }
    if (!this.presentPipeline) {
      const module = dev.createShaderModule({ code: PRESENT_WGSL });
      this.presentLayout = dev.createBindGroupLayout({ entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform', hasDynamicOffset: true } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float' } },
      ] });
      this.presentPipeline = dev.createRenderPipeline({
        layout: dev.createPipelineLayout({ bindGroupLayouts: [this.presentLayout] }),
        vertex: { module, entryPoint: 'vs' }, fragment: { module, entryPoint: 'fs', targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }] },
        primitive: { topology: 'triangle-list' },
      });
    }
    if (this.slot >= SLOTS) this.flush();
    const off = this.slot++ * SLOT;
    dev.queue.writeBuffer(this.uniforms, off, this.f32(img.w, img.ch, canvas.width, canvas.height));
    const bg = dev.createBindGroup({ layout: this.presentLayout, entries: [
      { binding: 0, resource: { buffer: this.uniforms, offset: 0, size: SLOT } }, { binding: 1, resource: img.tex.createView() }] });
    const pass = this.enc().beginRenderPass({ colorAttachments: [{ view: context.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store', clearValue: [1, 1, 1, 1] }] });
    pass.setPipeline(this.presentPipeline); pass.setBindGroup(0, bg, [off]); pass.draw(3); pass.end();
    this.flush();
  }
  async toImageBitmap(img) {
    const cv = new OffscreenCanvas(img.w, img.w), context = cv.getContext('webgpu');
    this.present(img, context);
    return cv.transferToImageBitmap();
  }
  async readback(img) {
    const w = img.w, row = Math.ceil(w * 16 / 256) * 256;
    const buf = this.device.createBuffer({ size: row * w, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    this.enc().copyTextureToBuffer({ texture: img.tex }, { buffer: buf, bytesPerRow: row }, [w, w]);
    this.flush();
    await buf.mapAsync(GPUMapMode.READ);
    const src = new Float32Array(buf.getMappedRange()), out = new Float32Array(w * w * img.ch), stride = row / 4;
    for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
      const s = y * stride + x * 4, k = y * w + x;
      if (img.ch === 3) { out[k * 3] = src[s]; out[k * 3 + 1] = src[s + 1]; out[k * 3 + 2] = src[s + 2]; }
      else out[k] = src[s];
    }
    buf.unmap(); buf.destroy();
    return out;
  }
}
