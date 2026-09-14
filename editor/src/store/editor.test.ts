import { describe, it, expect, beforeEach } from "vitest";
import { useEditor } from "./editor";
import {
  addNode,
  connect,
  removeNode,
  renameNode,
  edgesOf,
  resolveGraph,
} from "../lib/graphOps";
import type { GraphDoc } from "../lib/types";

describe("history", () => {
  beforeEach(() => useEditor.getState().reset());

  it("commit / undo / redo restore the document", () => {
    const s = useEditor.getState;
    const before = s().doc.scene.seed;
    s().commit((d) => (d.scene.seed = 42));
    expect(s().doc.scene.seed).toBe(42);
    s().undo();
    expect(s().doc.scene.seed).toBe(before);
    s().redo();
    expect(s().doc.scene.seed).toBe(42);
  });

  it("a drag is one undo step", () => {
    const s = useEditor.getState;
    s().beginDrag();
    s().drag((d) => (d.scene.seed = 10));
    s().drag((d) => (d.scene.seed = 11));
    s().drag((d) => (d.scene.seed = 12));
    s().endDrag();
    expect(s().doc.scene.seed).toBe(12);
    expect(s().past.length).toBe(1);
    s().undo();
    expect(s().doc.scene.seed).toBe(5);
  });

  it("a new commit clears redo", () => {
    const s = useEditor.getState;
    s().commit((d) => (d.scene.seed = 1));
    s().undo();
    s().commit((d) => (d.scene.seed = 2));
    expect(s().future.length).toBe(0);
  });
});

describe("graph ops", () => {
  it("add, connect, rename, remove keep references consistent", () => {
    const doc = useEditor.getState().doc;
    const g = structuredClone(resolveGraph(doc, [{ kind: "scene" }])!);
    const c = addNode(g, "circle", [0, 0]);
    const f = addNode(g, "fill", [200, 0]);
    expect(connect(g, c, f, "geo")).toBe(true);
    expect(connect(g, f, c, "geo")).toBe(false); // circle has no geo input, and it would loop
    expect(edgesOf(g).some((e) => e.from === c && e.to === f)).toBe(true);
    expect(renameNode(g, c, "ring2")).toBe(true);
    expect(g.nodes[f].in?.geo).toBe("ring2");
    removeNode(g, "ring2");
    expect(g.nodes[f].in?.geo).toBeUndefined();
  });

  it("multi ports append, single ports replace", () => {
    const g: GraphDoc = { nodes: {}, output: "" };
    const a = addNode(g, "circle", [0, 0]);
    const b = addNode(g, "circle", [0, 0]);
    const m = addNode(g, "merge", [0, 0]);
    connect(g, a, m, "list");
    connect(g, b, m, "list");
    expect(g.nodes[m].in?.list).toEqual([a, b]);
    const t = addNode(g, "transform", [0, 0]);
    connect(g, a, t, "geo");
    connect(g, b, t, "geo");
    expect(g.nodes[t].in?.geo).toBe(b);
  });

  it("subnet and template paths resolve", () => {
    const doc = useEditor.getState().doc;
    expect(
      resolveGraph(doc, [{ kind: "lib", type: "jellyfish" }])?.output,
    ).toBe("out");
    expect(
      resolveGraph(doc, [
        { kind: "lib", type: "jellyfish" },
        { kind: "template", node: "tent" },
      ])?.output,
    ).toBe("wv");
  });
});
