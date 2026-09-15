import { describe, it, expect } from "vitest";
import { baseOf, mergeShipped } from "./autosave";
import type { Doc, SceneDoc, SubnetDoc } from "./types";

const scene = (name: string, seed = 1): SceneDoc => ({
  name,
  seed,
  transition: null,
  graph: { nodes: {}, output: "" },
});
const fn = (label: string): SubnetDoc => ({
  label,
  params: {},
  graph: { nodes: {}, output: "" },
});
const doc = (scenes: SceneDoc[], lib: Record<string, SubnetDoc> = {}): Doc => ({
  scenes: Object.fromEntries(scenes.map((s) => [s.name, s])),
  lib,
});

describe("mergeShipped", () => {
  const v1 = doc([scene("main"), scene("jelly")], { water: fn("Water") });
  const base = baseOf(v1);

  it("an unedited copy follows the shipped project", () => {
    const v2 = doc([scene("main", 2), scene("jelly", 3), scene("owl")], {
      water: fn("Water 2"),
      owl: fn("Owl"),
    });
    const out = mergeShipped(structuredClone(v1), base, v2);
    expect(out).toEqual(v2);
  });

  it("an edited scene is kept; new shipped scenes are added", () => {
    const saved = structuredClone(v1);
    saved.scenes.jelly.seed = 42;
    const v2 = doc([scene("main", 2), scene("jelly", 3), scene("owl")]);
    const out = mergeShipped(saved, base, v2);
    expect(out.scenes.jelly.seed).toBe(42);
    expect(out.scenes.main.seed).toBe(2);
    expect(out.scenes.owl).toBeDefined();
  });

  it("a deleted scene stays deleted; the user's own scenes stay", () => {
    const saved = structuredClone(v1);
    delete saved.scenes.jelly;
    saved.scenes.mine = scene("mine");
    const v2 = doc([scene("main"), scene("jelly", 3)]);
    const out = mergeShipped(saved, base, v2);
    expect(out.scenes.jelly).toBeUndefined();
    expect(out.scenes.mine).toBeDefined();
  });

  it("a scene removed from the shipped project goes, unless it was edited", () => {
    const v2 = doc([scene("main")]);
    expect(
      mergeShipped(structuredClone(v1), base, v2).scenes.jelly,
    ).toBeUndefined();
    const saved = structuredClone(v1);
    saved.scenes.jelly.seed = 9;
    expect(mergeShipped(saved, base, v2).scenes.jelly.seed).toBe(9);
  });

  it("a user scene with the name of a new shipped scene is kept", () => {
    const saved = structuredClone(v1);
    saved.scenes.owl = scene("owl", 7);
    const v2 = doc([scene("main"), scene("jelly"), scene("owl", 1)]);
    expect(mergeShipped(saved, base, v2).scenes.owl.seed).toBe(7);
  });
});
