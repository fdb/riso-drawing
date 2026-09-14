import { useEffect } from "react";
import { useEditor } from "./store/editor";
import { Toolbar } from "./components/Toolbar";
import { Viewport } from "./components/Viewport";
import { GraphView } from "./components/GraphView";
import { Inspector } from "./components/Inspector";
import { ProjectPanel } from "./components/ProjectPanel";
import { Palette } from "./components/Palette";
import {
  resolveGraph,
  removeNode,
  disconnect,
  duplicateNode,
} from "./lib/graphOps";

const inField = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement | null;
  return (
    !!t &&
    (t.tagName === "INPUT" ||
      t.tagName === "TEXTAREA" ||
      t.tagName === "SELECT" ||
      t.isContentEditable)
  );
};

/** Project and parameters on the left, the network in the middle, the viewer on the right. */
export default function App() {
  const theme = useEditor((s) => s.ui.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useEditor.getState();
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) st.redo();
        else st.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        st.redo();
        return;
      }
      if (inField(e)) return;
      if (e.key === "Tab") {
        e.preventDefault();
        st.setUi({ paletteOpen: !st.ui.paletteOpen });
      } else if (e.key === "Escape") {
        st.setUi({ paletteOpen: false });
        st.select(null);
      } else if (e.key === " ") {
        e.preventDefault();
        st.setUi({ playing: !st.ui.playing });
      } else if (e.key === "Delete" || e.key === "Backspace") {
        const sel = st.selection;
        if (!sel) return;
        e.preventDefault();
        st.commit((d) => {
          const g = resolveGraph(d, st.graphPath, true);
          if (!g) return;
          if (sel.kind === "node") removeNode(g, sel.id);
          else disconnect(g, sel.to, sel.port, sel.from);
        });
        st.select(null);
      } else if (mod && e.key.toLowerCase() === "d") {
        const sel = st.selection;
        if (sel?.kind !== "node") return;
        e.preventDefault();
        let nid: string | null = null;
        st.commit((d) => {
          const g = resolveGraph(d, st.graphPath, true);
          if (g) nid = duplicateNode(g, sel.id);
        });
        if (nid) st.select({ kind: "node", id: nid });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="app">
      <Toolbar />
      <div className="columns">
        <aside className="left">
          <ProjectPanel />
          <div className="params">
            <Inspector />
          </div>
        </aside>
        <div className="network">
          <GraphView />
        </div>
        <div className="viewer">
          <Viewport />
        </div>
      </div>
      <Palette />
    </div>
  );
}
