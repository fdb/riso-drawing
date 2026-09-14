import { create } from "zustand";
import type { Display, Doc, GraphPathStep, Selection } from "../lib/types";
import { LIB, SCENES } from "../lib/engine";

const STORAGE_KEY = "riso-editor-doc";
/** localStorage when it is usable (not in private windows or test runners) */
function storage(): Storage | null {
  try {
    const st = globalThis.localStorage;
    if (!st || typeof st.getItem !== "function") return null;
    return st;
  } catch {
    return null;
  }
}
const HISTORY_MAX = 200;

export function defaultDoc(): Doc {
  return structuredClone({
    scene: SCENES.jelly,
    lib: LIB,
  }) as Doc;
}
function loadDoc(): Doc {
  try {
    const raw = storage()?.getItem(STORAGE_KEY);
    if (raw) {
      const d = JSON.parse(raw) as Doc;
      if (d.scene && d.lib && d.scene.graph.nodes.print) return d;
    }
  } catch {
    /* fall through to default */
  }
  return defaultDoc();
}

export interface UiState {
  theme: "light" | "dark";
  display: Display;
  res: number;
  playing: boolean;
  loopHold: boolean;
  speed: number;
  panel: "inspector" | "print";
  paletteOpen: boolean;
  paletteAt: [number, number];
  stepTick: number;
  timeReset: boolean;
}

export interface EditorState {
  doc: Doc;
  past: Doc[];
  future: Doc[];
  dragBase: Doc | null;
  graphPath: GraphPathStep[];
  selection: Selection;
  ui: UiState;
  /** apply a change as one undo step */
  commit: (fn: (doc: Doc) => void) => void;
  /** continuous change (slider drag): one undo step from beginDrag to endDrag */
  beginDrag: () => void;
  drag: (fn: (doc: Doc) => void) => void;
  endDrag: () => void;
  undo: () => void;
  redo: () => void;
  select: (sel: Selection) => void;
  setPath: (path: GraphPathStep[]) => void;
  dive: (step: GraphPathStep) => void;
  setUi: (partial: Partial<UiState>) => void;
  reset: () => void;
  load: (doc: Doc) => void;
}

export const useEditor = create<EditorState>()((set, get) => ({
  doc: loadDoc(),
  past: [],
  future: [],
  dragBase: null,
  graphPath: [{ kind: "scene" }],
  selection: null,
  ui: {
    theme:
      (storage()?.getItem("riso-editor-theme") as "light" | "dark") || "light",
    display: null,
    res: 540,
    playing: true,
    loopHold: false,
    speed: 1,
    panel: "inspector",
    paletteOpen: false,
    paletteAt: [80, 80],
    stepTick: 0,
    timeReset: false,
  },
  commit: (fn) => {
    const { doc, past } = get();
    const next = structuredClone(doc);
    fn(next);
    set({ doc: next, past: [...past.slice(-HISTORY_MAX), doc], future: [] });
  },
  beginDrag: () => {
    if (!get().dragBase) set({ dragBase: get().doc });
  },
  drag: (fn) => {
    const base = get().dragBase ?? get().doc;
    const next = structuredClone(base);
    fn(next);
    set({ doc: next, dragBase: base });
  },
  endDrag: () => {
    const { dragBase, doc, past } = get();
    if (!dragBase) return;
    if (dragBase === doc) set({ dragBase: null });
    else
      set({
        dragBase: null,
        past: [...past.slice(-HISTORY_MAX), dragBase],
        future: [],
      });
  },
  undo: () => {
    const { past, future, doc } = get();
    if (!past.length) return;
    set({
      doc: past[past.length - 1],
      past: past.slice(0, -1),
      future: [doc, ...future],
    });
  },
  redo: () => {
    const { past, future, doc } = get();
    if (!future.length) return;
    set({ doc: future[0], future: future.slice(1), past: [...past, doc] });
  },
  select: (selection) => set({ selection }),
  setPath: (graphPath) => set({ graphPath, selection: null }),
  dive: (step) =>
    set({ graphPath: [...get().graphPath, step], selection: null }),
  setUi: (partial) => set({ ui: { ...get().ui, ...partial } }),
  reset: () =>
    set({
      doc: defaultDoc(),
      past: [],
      future: [],
      selection: null,
      graphPath: [{ kind: "scene" }],
    }),
  load: (doc) =>
    set({
      doc,
      past: [],
      future: [],
      selection: null,
      graphPath: [{ kind: "scene" }],
    }),
}));

// autosave
let saveTimer: ReturnType<typeof setTimeout> | undefined;
useEditor.subscribe((s, prev) => {
  if (s.doc !== prev.doc) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      storage()?.setItem(STORAGE_KEY, JSON.stringify(s.doc));
    }, 400);
  }
  if (s.ui.theme !== prev.ui.theme)
    storage()?.setItem("riso-editor-theme", s.ui.theme);
});
