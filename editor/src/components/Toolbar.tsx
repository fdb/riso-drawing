import {
  Undo2,
  Redo2,
  Play,
  Pause,
  SkipForward,
  Sun,
  Moon,
  Download,
  Upload,
  RotateCcw,
  Rewind,
  X,
  Eye,
} from "lucide-react";
import { useRef } from "react";
import { useEditor } from "../store/editor";
import type { Doc } from "../lib/types";

export function Toolbar() {
  const ui = useEditor((s) => s.ui);
  const setUi = useEditor((s) => s.setUi);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const reset = useEditor((s) => s.reset);
  const load = useEditor((s) => s.load);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportDoc = () => {
    const doc = useEditor.getState().doc;
    const blob = new Blob([JSON.stringify(doc, null, 1)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "riso-project.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importDoc = async (f: File | undefined) => {
    if (!f) return;
    try {
      const d = JSON.parse(await f.text()) as Doc;
      if (!d.scenes || !d.lib) throw new Error("not a riso project");
      load(d);
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <header className="toolbar">
      <div className="brand">
        RISO EDITOR <span className="dot">●</span>
      </div>
      <div className="group">
        <button
          title="Undo (⌘Z)"
          disabled={!canUndo}
          onClick={undo}
          aria-label="undo"
        >
          <Undo2 size={15} />
        </button>
        <button
          title="Redo (⇧⌘Z)"
          disabled={!canRedo}
          onClick={redo}
          aria-label="redo"
        >
          <Redo2 size={15} />
        </button>
      </div>
      <div className="group">
        <button
          title="Play / pause (space)"
          onClick={() => setUi({ playing: !ui.playing })}
          aria-label="play"
        >
          {ui.playing ? <Pause size={15} /> : <Play size={15} />}
        </button>
        <button
          title="Step one frame"
          onClick={() => setUi({ playing: false, stepTick: ui.stepTick + 1 })}
          aria-label="step"
        >
          <SkipForward size={15} />
        </button>
        <button
          title="Back to t = 0"
          onClick={() => setUi({ timeReset: true })}
          aria-label="rewind"
        >
          <Rewind size={15} />
        </button>
        <label className="chk">
          <input
            type="checkbox"
            checked={ui.loopHold}
            onChange={(e) => setUi({ loopHold: e.target.checked })}
          />{" "}
          hold only
        </label>
        <label>
          speed
          <input
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={ui.speed}
            onChange={(e) => setUi({ speed: +e.target.value })}
            style={{ width: 70 }}
          />
        </label>
      </div>
      <div className="group">
        <select
          value={ui.res}
          onChange={(e) => setUi({ res: +e.target.value })}
          title="render size"
        >
          <option value={540}>540 px</option>
          <option value={720}>720 px</option>
          <option value={1080}>1080 px</option>
        </select>
        {ui.display ? (
          <span
            className="display-tag"
            title="The viewport shows this node. Click the eye on a node to change, × for the output."
          >
            <Eye size={13} /> {ui.display.id}
            <button
              className="ghost"
              onClick={() => setUi({ display: null })}
              aria-label="show output"
              style={{ padding: 0 }}
            >
              <X size={12} />
            </button>
          </span>
        ) : (
          <span className="hint">
            showing output · click a node's eye to display it
          </span>
        )}
      </div>
      <div className="group right">
        <button title="Export JSON" onClick={exportDoc} aria-label="export">
          <Download size={15} />
        </button>
        <button
          title="Import JSON"
          onClick={() => fileRef.current?.click()}
          aria-label="import"
        >
          <Upload size={15} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          hidden
          onChange={(e) => importDoc(e.target.files?.[0])}
        />
        <button
          title="Reset to the built-in scene"
          onClick={() =>
            confirm(
              "Replace the current document with the built-in jellyfish scene?",
            ) && reset()
          }
          aria-label="reset"
        >
          <RotateCcw size={15} />
        </button>
        <button
          title="Theme"
          onClick={() =>
            setUi({ theme: ui.theme === "light" ? "dark" : "light" })
          }
          aria-label="theme"
        >
          {ui.theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
        </button>
      </div>
    </header>
  );
}
