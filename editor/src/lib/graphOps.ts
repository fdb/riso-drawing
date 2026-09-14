// Pure operations on graph documents. They mutate the graph they are given; the store hands them
// a fresh clone inside a history commit.
import type { Doc, GraphDoc, GraphPathStep, NodeDoc } from "./types";
import { CORE_FUNCTIONS } from "./engine";

const MULTI = ["list", "marks"];

/**
 * The graph a view path points at. Core functions resolve read-only unless `fork` is set, which
 * copies the function into the project first so the edit is the project's.
 */
export function resolveGraph(
  doc: Doc,
  path: GraphPathStep[],
  fork = false,
): GraphDoc | null {
  let g: GraphDoc | undefined;
  for (const step of path) {
    if (step.kind === "scene") g = doc.scenes[step.name]?.graph;
    else if (step.kind === "lib") {
      if (!doc.lib[step.type] && CORE_FUNCTIONS[step.type] && fork)
        doc.lib[step.type] = structuredClone(CORE_FUNCTIONS[step.type]);
      g = (doc.lib[step.type] ?? CORE_FUNCTIONS[step.type])?.graph;
    } else g = g?.nodes[step.node]?.template;
    if (!g) return null;
  }
  return g ?? null;
}

export function uniqueId(graph: GraphDoc, base: string): string {
  if (!graph.nodes[base]) return base;
  let n = 2;
  while (graph.nodes[`${base}${n}`]) n++;
  return `${base}${n}`;
}

export function addNode(
  graph: GraphDoc,
  type: string,
  pos: [number, number],
  id?: string,
): string {
  const nid = uniqueId(graph, id ?? type);
  const node: NodeDoc = { type, params: {}, pos };
  if (type === "copy") node.template = { nodes: {}, output: "" };
  if (type === "attr") node.attrs = {};
  graph.nodes[nid] = node;
  if (!graph.output) graph.output = nid;
  return nid;
}

export function removeNode(graph: GraphDoc, id: string): void {
  delete graph.nodes[id];
  for (const n of Object.values(graph.nodes)) {
    if (!n.in) continue;
    for (const port of Object.keys(n.in)) {
      const v = n.in[port];
      if (Array.isArray(v)) n.in[port] = v.filter((r) => r !== id);
      else if (v === id) delete n.in[port];
    }
  }
  if (graph.output === id) graph.output = "";
}

/** Connect `from` into `to`'s input `port`. Multi ports append; single ports replace. */
export function connect(
  graph: GraphDoc,
  from: string,
  to: string,
  port: string,
): boolean {
  if (from === to || !graph.nodes[from] || !graph.nodes[to]) return false;
  if (reaches(graph, from, to)) return false; // would create a cycle
  const n = graph.nodes[to];
  n.in = n.in ?? {};
  if (MULTI.includes(port)) {
    const cur = n.in[port];
    const list = Array.isArray(cur) ? cur : cur ? [cur] : [];
    if (list.includes(from)) return false;
    n.in[port] = [...list, from];
  } else n.in[port] = from;
  return true;
}

export function disconnect(
  graph: GraphDoc,
  to: string,
  port: string,
  from?: string,
): void {
  const n = graph.nodes[to];
  if (!n?.in) return;
  const v = n.in[port];
  if (Array.isArray(v)) n.in[port] = from ? v.filter((r) => r !== from) : [];
  else delete n.in[port];
}

/** true when `to` is upstream of `from` (so from→to would close a loop) */
function reaches(graph: GraphDoc, from: string, to: string): boolean {
  const seen = new Set<string>();
  const stack = [from];
  while (stack.length) {
    const id = stack.pop()!;
    if (id === to) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    const n = graph.nodes[id];
    for (const v of Object.values(n?.in ?? {}))
      (Array.isArray(v) ? v : [v]).forEach((r) => stack.push(r));
  }
  return false;
}

export function renameNode(
  graph: GraphDoc,
  oldId: string,
  newId: string,
): boolean {
  newId = newId.trim();
  if (!newId || newId === oldId || graph.nodes[newId] || !graph.nodes[oldId])
    return false;
  const nodes: Record<string, NodeDoc> = {};
  for (const [k, v] of Object.entries(graph.nodes))
    nodes[k === oldId ? newId : k] = v;
  graph.nodes = nodes;
  for (const n of Object.values(graph.nodes)) {
    if (!n.in) continue;
    for (const port of Object.keys(n.in)) {
      const v = n.in[port];
      if (Array.isArray(v))
        n.in[port] = v.map((r) => (r === oldId ? newId : r));
      else if (v === oldId) n.in[port] = newId;
    }
  }
  if (graph.output === oldId) graph.output = newId;
  return true;
}

export interface Edge {
  from: string;
  to: string;
  port: string;
}
export function edgesOf(graph: GraphDoc): Edge[] {
  const out: Edge[] = [];
  for (const [to, n] of Object.entries(graph.nodes)) {
    for (const [port, v] of Object.entries(n.in ?? {})) {
      (Array.isArray(v) ? v : [v]).forEach((from) => {
        if (graph.nodes[from]) out.push({ from, to, port });
      });
    }
  }
  return out;
}

export function duplicateNode(graph: GraphDoc, id: string): string | null {
  const src = graph.nodes[id];
  if (!src) return null;
  const copy = structuredClone(src);
  copy.pos = [(src.pos?.[0] ?? 0) + 30, (src.pos?.[1] ?? 0) + 30];
  const nid = uniqueId(graph, id);
  graph.nodes[nid] = copy;
  return nid;
}

/** move one entry of a list input earlier (-1) or later (+1); order is draw order and clip order */
export function moveInList(
  graph: GraphDoc,
  id: string,
  port: string,
  from: string,
  dir: -1 | 1,
): void {
  const v = graph.nodes[id]?.in?.[port];
  if (!Array.isArray(v)) return;
  const k = v.indexOf(from);
  const j = k + dir;
  if (k < 0 || j < 0 || j >= v.length) return;
  [v[k], v[j]] = [v[j], v[k]];
}
