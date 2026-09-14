// Positions for a graph view. Nodes keep their stored `pos`; the rest are laid out by depth.
import type { GraphDoc } from "./types";
import { inputsOf } from "./engine";

export const NODE_W = 172;
export const HEAD_H = 24;
export const ROW_H = 16;
export const COL_GAP = 230;
export const ROW_GAP = 22;

export function nodeHeight(type: string): number {
  return HEAD_H + 14 + Math.max(1, inputsOf(type).length) * ROW_H;
}

export function layoutPositions(
  graph: GraphDoc,
): Record<string, [number, number]> {
  const ids = Object.keys(graph.nodes);
  const depth = new Map<string, number>();
  const visiting = new Set<string>();
  const depthOf = (id: string): number => {
    if (depth.has(id)) return depth.get(id)!;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    let d = 0;
    for (const v of Object.values(graph.nodes[id]?.in ?? {})) {
      for (const r of Array.isArray(v) ? v : [v])
        if (graph.nodes[r]) d = Math.max(d, depthOf(r) + 1);
    }
    visiting.delete(id);
    depth.set(id, d);
    return d;
  };
  ids.forEach(depthOf);
  const pos: Record<string, [number, number]> = {};
  const colY = new Map<number, number>();
  for (const id of ids) {
    const n = graph.nodes[id];
    if (n.pos) {
      pos[id] = n.pos;
      continue;
    }
    const d = depthOf(id);
    const y = colY.get(d) ?? 40;
    pos[id] = [40 + d * COL_GAP, y];
    colY.set(d, y + nodeHeight(n.type) + ROW_GAP);
  }
  return pos;
}
