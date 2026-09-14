import { useEffect, useRef } from "react";
import { useEditor } from "../store/editor";
import { phaseName } from "../lib/engine";
import type { Doc } from "../lib/types";

interface Done {
  type: "done";
  ms: number;
  info: { iris: number; kind: string; local: number | null; loop: number };
}
type WorkerReply = Done | { type: "error"; message: string };

const workers = new WeakMap<HTMLCanvasElement, { worker: Worker }>();

/**
 * The viewer. Rendering runs in a worker that owns the canvas; this component only keeps time,
 * sends one frame request at a time, and shows the HUD. The main thread stays free for editing.
 */
export function Viewport() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cv = canvasRef.current!;
    // a canvas can be transferred once; React remounts the component in development, so the
    // worker and its canvas live in a registry keyed by the element
    let entry = workers.get(cv);
    if (!entry) {
      const worker = new Worker(
        new URL("../render.worker.ts", import.meta.url),
        { type: "module" },
      );
      const offscreen = cv.transferControlToOffscreen();
      worker.postMessage({ type: "init", canvas: offscreen }, [offscreen]);
      entry = { worker };
      workers.set(cv, entry);
    }
    const worker = entry.worker;

    let time = 0;
    let frame = 0;
    let last = performance.now();
    let lastStep = 0;
    let fps = 0;
    let busy = false;
    let dirty = true;
    let sentDoc: Doc | null = null;
    let loop = 0;
    let raf = 0;
    let disposed = false;

    worker.onmessage = (e: MessageEvent<WorkerReply>) => {
      busy = false;
      const st = useEditor.getState();
      const { doc, ui, sceneName } = st;
      if (e.data.type === "error") {
        if (hudRef.current)
          hudRef.current.textContent = "ERROR " + e.data.message;
        return;
      }
      const { ms, info } = e.data;
      loop = info.loop;
      fps = fps * 0.8 + (1000 / Math.max(ms, 1)) * 0.2;
      const scene = doc.scenes[sceneName];
      if (hudRef.current && scene)
        hudRef.current.textContent =
          `${sceneName}  t ${time.toFixed(2)}s  frame ${frame}  ${scene.transition ? phaseName(time, scene.transition, ui.loopHold) + "  iris " + info.iris.toFixed(2) : ""}\n` +
          `${ms.toFixed(0)} ms  ~${fps.toFixed(0)} fps   showing ${ui.display ? `${ui.display.id} (${info.kind})` : "output"}${info.local !== null ? `  clip t ${info.local.toFixed(2)}s` : ""}${info.loop ? `  loop ${info.loop.toFixed(2)}s` : ""}`;
      frame++;
    };

    const tick = (now: number) => {
      if (disposed) return;
      const st = useEditor.getState();
      const { doc, ui, sceneName } = st;
      if (ui.playing) {
        time += ((now - last) / 1000) * ui.speed;
        dirty = true;
      }
      last = now;
      if (ui.stepTick !== lastStep) {
        time += (ui.stepTick - lastStep) / 24;
        lastStep = ui.stepTick;
        dirty = true;
      }
      if (ui.timeReset) {
        time = 0;
        st.setUi({ timeReset: false });
        dirty = true;
      }
      if (loop && time >= loop) time = time % loop;
      if (doc !== sentDoc) {
        worker.postMessage({ type: "doc", doc });
        sentDoc = doc;
        dirty = true;
      }
      if (dirty && !busy) {
        busy = true;
        dirty = false;
        worker.postMessage({
          type: "render",
          sceneName,
          time,
          frame,
          res: ui.res,
          loopHold: ui.loopHold,
          display: ui.display,
        });
      }
      raf = requestAnimationFrame(tick);
    };
    // any view change re-renders a paused frame
    const unsub = useEditor.subscribe((s, prev) => {
      if (
        s.ui.display !== prev.ui.display ||
        s.ui.loopHold !== prev.ui.loopHold ||
        s.ui.res !== prev.ui.res ||
        s.sceneName !== prev.sceneName
      )
        dirty = true;
    });
    raf = requestAnimationFrame(tick);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      unsub();
      worker.onmessage = null;
    };
  }, []);

  return (
    <div className="viewport">
      <canvas ref={canvasRef} width={540} height={540} />
      <div className="hud" ref={hudRef} data-testid="hud" />
    </div>
  );
}
