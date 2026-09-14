// Positions for a graph view. Nodes keep their stored `pos`; the rest are laid out top to bottom
// by depth, ordered within a row by the mean x of their inputs to keep wires short.
import type { GraphDoc } from "./types";
import { inputsOf } from "./engine";

export const NODE_W = 150;
export const NODE_H = 44;
export const PORT_GAP = 22;
export const COL_GAP = 34;
export const ROW_GAP = 120;

export function nodeHeight(): number {
  return NODE_H;
}
/** x of input port i, from the node's left edge */
export function portX(i: number): number {
  return 18 + i * PORT_GAP;
}
export function inputIndex(type: string, port: string): number {
  return Math.max(0, inputsOf(type).indexOf(port));
}

export function layoutPositions(
  graph: GraphDoc,
): Record<string, [number, number]> {
  const ids = Object.keys(graph.nodes);
  const depth = new Map<string, number>();
  const visiting = new Set<string>();
  const parents = (id: string): string[] => {
    const out: string[] = [];
    for (const v of Object.values(graph.nodes[id]?.in ?? {}))
      for (const r of Array.isArray(v) ? v : [v])
        if (graph.nodes[r]) out.push(r);
    return out;
  };
  const depthOf = (id: string): number => {
    if (depth.has(id)) return depth.get(id)!;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    let d = 0;
    for (const r of parents(id)) d = Math.max(d, depthOf(r) + 1);
    visiting.delete(id);
    depth.set(id, d);
    return d;
  };
  ids.forEach(depthOf);
  const pos: Record<string, [number, number]> = {};
  const rows = new Map<number, string[]>();
  for (const id of ids) {
    const n = graph.nodes[id];
    if (n.pos) pos[id] = n.pos;
    else {
      const d = depthOf(id);
      rows.set(d, [...(rows.get(d) ?? []), id]);
    }
  }
  const depths = [...rows.keys()].sort((a, b) => a - b);
  for (const d of depths) {
    const row = rows.get(d)!;
    const bary = (id: string) => {
      const xs = parents(id)
        .map((p) => pos[p]?.[0])
        .filter((x): x is number => x !== undefined);
      return xs.length
        ? xs.reduce((a, b) => a + b, 0) / xs.length
        : Number.POSITIVE_INFINITY;
    };
    const order = row
      .map((id, k) => ({ id, k, b: bary(id) }))
      .sort((a, b) => a.b - b.b || a.k - b.k);
    // long rows wrap into sub-rows so the graph stays readable
    const perRow = 7;
    order.forEach((o, k) => {
      pos[o.id] = [
        40 + (k % perRow) * (NODE_W + COL_GAP),
        40 + d * ROW_GAP + Math.floor(k / perRow) * (NODE_H + 14),
      ];
    });
  }
  return pos;
}
