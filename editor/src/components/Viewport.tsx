import { useEffect, useRef } from "react";
import { useEditor } from "../store/editor";
import { SceneRunner, setLibrary, phaseName } from "../lib/engine";
import type { Runner } from "../lib/engine";
import type { Doc } from "../lib/types";

/** Renders the current scene every frame. Paused frames re-render only when the document or view changes. */
export function Viewport() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cv = canvasRef.current!;
    const ctx = cv.getContext("2d")!;
    let runner: Runner | null = null;
    let time = 0;
    let frame = 0;
    let last = performance.now();
    let lastDoc: Doc | null = null;
    let lastLib: Doc["lib"] | null = null;
    let lastKey = "";
    let lastStep = 0;
    let lastScene = "";
    let fps = 0;
    let raf = 0;

    const loop = (now: number) => {
      const st = useEditor.getState();
      const { doc, ui, sceneName } = st;
      const scene = doc.scenes[sceneName] ?? Object.values(doc.scenes)[0];
      if (!runner || runner.res !== ui.res || lastScene !== sceneName) {
        cv.width = cv.height = ui.res;
        runner = new SceneRunner(ui.res, scene, doc.scenes);
        lastScene = sceneName;
      }
      if (lastLib !== doc.lib) {
        setLibrary(doc.lib);
        lastLib = doc.lib;
      }
      runner.scene = scene;
      runner.scenes = doc.scenes;
      if (ui.playing) time += ((now - last) / 1000) * ui.speed;
      last = now;
      if (ui.stepTick !== lastStep) {
        time += (ui.stepTick - lastStep) / 24;
        lastStep = ui.stepTick;
      }
      if (ui.timeReset) {
        time = 0;
        st.setUi({ timeReset: false });
      }
      if (scene.duration && time >= scene.duration)
        time = time % scene.duration;
      const key = JSON.stringify([
        ui.display,
        ui.loopHold,
        ui.res,
        ui.stepTick,
        sceneName,
      ]);
      const dirty = ui.playing || doc !== lastDoc || key !== lastKey;
      if (dirty) {
        const t0 = performance.now();
        try {
          const info = runner.render(ctx, time, frame, {
            loopHold: ui.loopHold,
            display: ui.display,
          });
          const ms = performance.now() - t0;
          fps = fps * 0.8 + (1000 / Math.max(ms, 1)) * 0.2;
          if (hudRef.current)
            hudRef.current.textContent =
              `${sceneName}  t ${time.toFixed(2)}s  frame ${frame}  ${scene.transition ? phaseName(time, scene.transition, ui.loopHold) + "  iris " + info.iris.toFixed(2) : ""}\n` +
              `${ms.toFixed(0)} ms  ~${fps.toFixed(0)} fps   showing ${ui.display ? `${ui.display.id} (${info.kind})` : "output"}`;
        } catch (e) {
          if (hudRef.current)
            hudRef.current.textContent = "ERROR " + (e as Error).message;
        }
        frame++;
        lastDoc = doc;
        lastKey = key;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="viewport">
      <canvas ref={canvasRef} width={540} height={540} />
      <div className="hud" ref={hudRef} data-testid="hud" />
    </div>
  );
}
