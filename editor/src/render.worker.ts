// The render worker: owns the viewer canvas and runs the whole pipeline off the main thread.
// Messages in: init (the transferred canvas), doc (the project), render (one frame). Out: done.
import { SceneRunner, setLibrary } from "../../engine/index.js";
import type { Doc, Display } from "./lib/types";

interface RenderMsg {
  type: "render";
  sceneName: string;
  time: number;
  frame: number;
  res: number;
  loopHold: boolean;
  display: Display;
}
type Msg =
  | { type: "init"; canvas: OffscreenCanvas }
  | { type: "doc"; doc: Doc }
  | RenderMsg;

interface Runner {
  scene: unknown;
  scenes: unknown;
  res: number;
  render(
    ctx: OffscreenCanvasRenderingContext2D,
    t: number,
    f: number,
    o: { loopHold: boolean; display: Display },
  ): { iris: number; kind: string; local: number | null; loop: number };
}
const Runner = SceneRunner as unknown as new (
  res: number,
  scene: unknown,
  scenes: unknown,
) => Runner;

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let doc: Doc | null = null;
let runner: Runner | null = null;
let runnerScene = "";

self.onmessage = (e: MessageEvent<Msg>) => {
  const m = e.data;
  if (m.type === "init") {
    canvas = m.canvas;
    ctx = canvas.getContext("2d")!;
  } else if (m.type === "doc") {
    doc = m.doc;
    setLibrary(doc.lib);
    runner = null;
  } else if (m.type === "render") {
    if (!canvas || !ctx || !doc) return;
    const scene = doc.scenes[m.sceneName] ?? Object.values(doc.scenes)[0];
    if (!runner || runner.res !== m.res || runnerScene !== m.sceneName) {
      canvas.width = canvas.height = m.res;
      runner = new Runner(m.res, scene, doc.scenes);
      runnerScene = m.sceneName;
    }
    runner.scene = scene;
    runner.scenes = doc.scenes;
    const t0 = performance.now();
    try {
      const info = runner.render(ctx, m.time, m.frame, {
        loopHold: m.loopHold,
        display: m.display,
      });
      self.postMessage({ type: "done", ms: performance.now() - t0, info });
    } catch (err) {
      self.postMessage({ type: "error", message: (err as Error).message });
    }
  }
};
