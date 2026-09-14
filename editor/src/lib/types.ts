export type ParamValue = number | string | boolean;

export interface NodeDoc {
  type: string;
  params?: Record<string, ParamValue>;
  in?: Record<string, string | string[]>;
  attrs?: Record<string, string>;
  template?: GraphDoc;
  when?: string | number;
  enabled?: boolean;
  pos?: [number, number];
}

export interface GraphDoc {
  let?: Record<string, string | number>;
  nodes: Record<string, NodeDoc>;
  output: string;
}

export interface Transition {
  type: string;
  open: number;
  hold: number;
  close: number;
  gap: number;
}

export interface SceneDoc {
  name: string;
  about?: string;
  seed: number;
  transition: Transition;
  graph: GraphDoc;
}

export interface ParamSchema {
  def: ParamValue;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  kind?: "expr" | "ink" | "mode" | "color" | "text";
}

export interface SubnetDoc {
  label: string;
  inputs?: string[];
  params: Record<string, ParamSchema>;
  xf?: Record<string, string>;
  graph: GraphDoc;
}

export interface NodeSpec {
  type: string;
  label: string;
  cat: "geo" | "field" | "mark" | "util" | "cop";
  out: string;
  inputs: string[];
  params: Record<string, ParamSchema>;
}

export interface Doc {
  scene: SceneDoc;
  lib: Record<string, SubnetDoc>;
}

/** Where the graph view is looking: the scene, a subnet, then nested copy templates. */
export type GraphPathStep =
  | { kind: "scene" }
  | { kind: "lib"; type: string; via?: string }
  | { kind: "template"; node: string };

/** A node whose value the viewport shows instead of the graph output. `path` is the evaluation path. */
export type Display = { path: string; id: string } | null;

export type Selection =
  | { kind: "node"; id: string }
  | { kind: "edge"; from: string; to: string; port: string }
  | null;
