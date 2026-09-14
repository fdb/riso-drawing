// The render worker: owns the viewer canvas and runs the whole pipeline off the main thread.
// With WebGPU available the pixel chain runs on the GPU and the canvas is a WebGPU canvas; the
// stencils are uploaded from their 2D canvases without a readback.
// Messages in: init (the transferred canvas), doc (the project), render (one frame). Out: done.
import {
  SceneRunner,
  setLibrary,
  createGpu,
  makeCanvas,
  attachRaster,
} from "../../engine/index.js";
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
  | { type: "init"; canvas: OffscreenCanvas; gpu: boolean }
  | { type: "doc"; doc: Doc }
  | RenderMsg;

interface Info {
  iris: number;
  kind: string;
  local: number | null;
  loop: number;
  gpu: boolean;
}
interface Runner {
  scene: unknown;
  scenes: unknown;
  res: number;
  render(
    target: unknown,
    t: number,
    f: number,
    o: { loopHold: boolean; display: Display },
  ): Info;
}
interface Gpu {
  present: unknown;
}
const Runner = SceneRunner as unknown as new (
  res: number,
  scene: unknown,
  scenes: unknown,
  gpu: Gpu | null,
) => Runner;
const makeGpu = createGpu as unknown as () => Promise<Gpu | null>;
const canvasOf = makeCanvas as unknown as (
  w: number,
  h: number,
) => OffscreenCanvas;

let canvas: OffscreenCanvas | null = null;
let gpu: Gpu | null = null;
let ready = false;
let target: unknown = null;
let doc: Doc | null = null;
let runner: Runner | null = null;
let runnerScene = "";
let targetRes = 0;

async function init(m: { canvas: OffscreenCanvas; gpu: boolean }) {
  canvas = m.canvas;
  gpu = m.gpu ? await makeGpu() : null;
  if (gpu) (attachRaster as unknown as (g: Gpu) => Gpu)(gpu);
  ready = true;
}

function targetFor(res: number) {
  if (!canvas) return null;
  if (target && targetRes === res) return target;
  canvas.width = canvas.height = res;
  target = gpu
    ? {
        gpuCtx: canvas.getContext("webgpu"),
        scratch: canvasOf(res, res).getContext("2d"),
      }
    : canvas.getContext("2d");
  targetRes = res;
  return target;
}

self.onmessage = (e: MessageEvent<Msg>) => {
  const m = e.data;
  if (m.type === "init") {
    void init(m);
  } else if (m.type === "doc") {
    doc = m.doc;
    setLibrary(doc.lib);
    runner = null;
  } else if (m.type === "render") {
    if (!ready || !canvas || !doc) {
      self.postMessage({ type: "notready" });
      return;
    }
    const scene = doc.scenes[m.sceneName] ?? Object.values(doc.scenes)[0];
    if (!runner || runner.res !== m.res || runnerScene !== m.sceneName) {
      runner = new Runner(m.res, scene, doc.scenes, gpu);
      runnerScene = m.sceneName;
    }
    runner.scene = scene;
    runner.scenes = doc.scenes;
    const t0 = performance.now();
    try {
      const info = runner.render(targetFor(m.res), m.time, m.frame, {
        loopHold: m.loopHold,
        display: m.display,
      });
      self.postMessage({ type: "done", ms: performance.now() - t0, info });
    } catch (err) {
      self.postMessage({ type: "error", message: (err as Error).message });
    }
  }
};
