// Typed surface over the plain-JS engine.
import * as E from "../../../engine/index.js";
import type { NodeSpec, SubnetDoc, SceneDoc, GraphPathStep } from "./types";

export const CAT = E.CAT as Record<string, NodeSpec>;
export const LIB = E.LIB as Record<string, SubnetDoc>;
export const MULTI_INPUTS = E.MULTI_INPUTS as string[];
export const SCENES = E.SCENES as unknown as Record<string, SceneDoc>;
export const setLibrary = E.setLibrary as (
  lib: Record<string, SubnetDoc>,
) => void;
export const bypassPort = E.bypassPort as (spec: NodeSpec) => string | null;
/** the input a bypassed node passes through, or null when the node cannot be bypassed */
export const bypassPortOf = (type: string): string | null =>
  CAT[type] ? bypassPort(CAT[type]) : null;
export const evalExpr = E.evalExpr as (v: unknown, ctx: unknown) => unknown;
export const phaseName = E.phaseName as (
  t: number,
  tr: unknown,
  loopHold: boolean,
) => string;

export interface RenderInfo {
  iris: number;
  kind: string;
}
export interface Runner {
  scene: SceneDoc;
  scenes: Record<string, SceneDoc>;
  res: number;
  render(
    ctx: CanvasRenderingContext2D,
    time: number,
    frame: number,
    opts: { loopHold: boolean; display: { path: string; id: string } | null },
  ): RenderInfo;
}
export const SceneRunner = E.SceneRunner as unknown as new (
  res: number,
  scene: SceneDoc,
  scenes: Record<string, SceneDoc>,
) => Runner;

export const isSubnet = (type: string) => !!LIB[type];
export const specOf = (type: string): NodeSpec | undefined => CAT[type];
export const nodeLabel = (type: string) =>
  LIB[type]?.label ?? CAT[type]?.label ?? type;
export const inputsOf = (type: string): string[] =>
  LIB[type]?.inputs ?? CAT[type]?.inputs ?? [];
export const isMulti = (port: string) => MULTI_INPUTS.includes(port);
export const catOf = (type: string): string =>
  isSubnet(type) ? "subnet" : (CAT[type]?.cat ?? "util");

/** The evaluation path of a graph view path: subnet instances by id, templates by node id and first copy. */
export const evalPath = (path: GraphPathStep[]): string =>
  path
    .map((s) =>
      s.kind === "lib"
        ? "/" + (s.via ?? "?")
        : s.kind === "template"
          ? "/" + s.node + "#0"
          : "",
    )
    .join("");
