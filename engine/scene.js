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
  constructor(res, scene, scenes = null) { this.res = res; this.scene = scene; this.scenes = scenes; this.cache = new Map(); }
  // display: { path, id } shows that node's value instead of the graph output
  render(ctx, time, frame, { loopHold = false, display = null } = {}) {
    const sc = this.scene;
    const iris = irisScale(time, sc.transition, loopHold);
    const cyc = cycleLength(sc.transition), u = ((time % cyc) + cyc) % cyc;
    const probe = display ? { path: display.path, id: display.id, result: undefined } : null;
    let value = evalScene(sc, { t: time, u, iris, f: frame, res: this.res, cache: this.cache, probe, scenes: this.scenes });
    if (probe) {
      if (probe.result === undefined && display.path === '') value = evalScene(sc, { t: time, u, iris, f: frame, res: this.res, cache: this.cache, node: display.id, scenes: this.scenes });
      else if (probe.result !== undefined) value = probe.result;
    }
    drawValue(ctx, value, this.res);
    return { iris, kind: Array.isArray(value) ? 'marks' : value && value.kind ? value.kind : value && value.prims ? 'geo' : value && value.sample ? 'field' : 'none' };
  }
}
