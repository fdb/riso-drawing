import { easeOutCubic, evalScene } from './graph.js';
import { drawValue } from './cops.js';

// Scene runtime: iris timing, graph evaluation, static-prefix cache, painting, print.

export function irisScale(time, tr, loopHold) {
  if (loopHold || !tr) return 1;
  const cyc = cycleLength(tr);
  let u = ((time % cyc) + cyc) % cyc;
  if (u < tr.open) return easeOutCubic(u / tr.open);
  u -= tr.open; if (u < tr.hold) return 1;
  u -= tr.hold; if (u < tr.close) { const x = u / tr.close; return 1 - x * x * x; }
  return 0;
}
export const cycleLength = tr => tr ? tr.open + tr.hold + tr.close + tr.gap : 1;
export function phaseName(time, tr, loopHold) {
  if (loopHold || !tr) return 'hold';
  const cyc = cycleLength(tr); let u = ((time % cyc) + cyc) % cyc;
  if (u < tr.open) return 'open'; u -= tr.open;
  if (u < tr.hold) return 'hold'; u -= tr.hold;
  return u < tr.close ? 'close' : 'closed';
}

export class SceneRunner {
  // scenes: registry used by `shot` nodes
  // gpu: a device from createGpu(); when set, render() expects a WebGPU target
  constructor(res, scene, scenes = null, gpu = null) { this.res = res; this.scene = scene; this.scenes = scenes; this.cache = new Map(); this.gpu = gpu; }
  // display: { path, id } shows that node's value instead of the graph output
  // target: a 2D context, or { gpuCtx, scratch } for a WebGPU canvas (scratch: a 2D context of the same size)
  render(target, time, frame, { loopHold = false, display = null } = {}) {
    const sc = this.scene, gpu = this.gpu;
    if (gpu) gpu.beginFrame();
    const T = gpu ? { gpu, gpuCtx: target.gpuCtx, scratch: target.scratch } : { ctx2d: target };
    const iris = irisScale(time, sc.transition, loopHold);
    const cyc = cycleLength(sc.transition), u = ((time % cyc) + cyc) % cyc;
    const probe = display ? { path: display.path, id: display.id, result: undefined } : null;
    let value = evalScene(sc, { t: time, u, iris, f: frame, res: this.res, cache: this.cache, probe, scenes: this.scenes, gpu });
    if (probe) {
      if (probe.result === undefined && display.path === '') value = evalScene(sc, { t: time, u, iris, f: frame, res: this.res, cache: this.cache, node: display.id, scenes: this.scenes, gpu });
      else if (probe.result !== undefined) value = probe.result;
    }
    const kind = Array.isArray(value) ? 'marks' : value && value.kind ? value.kind : value && value.prims ? 'geo' : value && value.sample ? 'field' : 'none';
    let local = null;
    if (kind === 'clip') {   // a clip plays on its own timeline
      local = value.dur > 0 ? ((time % value.dur) + value.dur) % value.dur : 0;
      value = value.at(local, frame);
    }
    drawValue(T, value, this.res);
    if (gpu) gpu.endFrame();
    return { iris, kind, local, loop: this.loopLength(), gpu: !!gpu };
  }
  // the loop length of the scene: its duration, or the length of its marks clip
  loopLength() {
    const sc = this.scene; if (sc.duration) return sc.duration;
    const id = sc.graph.marks || 'marks', n = sc.graph.nodes[id];
    if (!n || (n.type !== 'sequence' && n.type !== 'clip')) return 0;
    const v = evalScene(sc, { res: this.res, cache: this.cache, node: id, scenes: this.scenes });
    return v && v.kind === 'clip' ? v.dur : 0;
  }
}
