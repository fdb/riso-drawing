import { create } from "zustand";
import type {
  Display,
  Doc,
  GraphPathStep,
  SceneDoc,
  Selection,
} from "../lib/types";
import { PROJECT_FUNCTIONS, SCENES } from "../lib/engine";

// bump when the document format changes; older autosaves are discarded
const STORAGE_KEY = "riso-editor-project-v3";
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
  return structuredClone({ scenes: SCENES, lib: PROJECT_FUNCTIONS }) as Doc;
}
function loadDoc(): Doc {
  try {
    const raw = storage()?.getItem(STORAGE_KEY);
    if (raw) {
      const d = JSON.parse(raw) as Doc;
      if (d.scenes && d.lib && Object.keys(d.scenes).length) return d;
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
  /** the scene shown in the viewer and at the root of the graph path */
  sceneName: string;
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
  openScene: (name: string) => void;
  addScene: (name: string, from?: string) => void;
  removeScene: (name: string) => void;
  setUi: (partial: Partial<UiState>) => void;
  reset: () => void;
  load: (doc: Doc) => void;
}

const firstScene = (doc: Doc) =>
  doc.scenes.main ? "main" : Object.keys(doc.scenes)[0];

/** an empty scene: a marks merge feeding the print */
export function emptyScene(name: string): SceneDoc {
  return {
    name,
    seed: 1,
    transition: null,
    graph: {
      let: {
        cellBlue: 5.6,
        cellPink: 5.2,
        cellYellow: 6.2,
        angleBlue: 15,
        anglePink: 45,
        angleYellow: 0,
      },
      nodes: {
        marks: { type: "merge", in: { list: [] }, pos: [40, 40] },
        stencils: { type: "rasterize", in: { marks: "marks" }, pos: [270, 40] },
        print: {
          type: "risoPrint",
          in: { stencils: "stencils" },
          pos: [500, 40],
          params: {
            blueCell: "$cellBlue",
            pinkCell: "$cellPink",
            yellowCell: "$cellYellow",
            blueAngle: "$angleBlue",
            pinkAngle: "$anglePink",
            yellowAngle: "$angleYellow",
          },
        },
      },
      output: "print",
      marks: "marks",
    },
  };
}

export const useEditor = create<EditorState>()((set, get) => {
  const doc = loadDoc();
  const sceneName = firstScene(doc);
  return {
    doc,
    past: [],
    future: [],
    dragBase: null,
    sceneName,
    graphPath: [{ kind: "scene", name: sceneName }],
    selection: null,
    ui: {
      theme:
        (storage()?.getItem("riso-editor-theme") as "light" | "dark") || "dark",
      display: null,
      res: 540,
      playing: true,
      loopHold: false,
      speed: 1,
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
    openScene: (name) => {
      if (!get().doc.scenes[name]) return;
      set({
        sceneName: name,
        graphPath: [{ kind: "scene", name }],
        selection: null,
        ui: { ...get().ui, display: null, timeReset: true },
      });
    },
    addScene: (name, from) => {
      const { doc } = get();
      name = name.trim();
      if (!name || doc.scenes[name]) return;
      get().commit((d) => {
        const src = from && d.scenes[from];
        d.scenes[name] = src
          ? { ...structuredClone(src), name }
          : emptyScene(name);
      });
      get().openScene(name);
    },
    removeScene: (name) => {
      if (Object.keys(get().doc.scenes).length < 2) return;
      get().commit((d) => {
        delete d.scenes[name];
      });
      if (get().sceneName === name) get().openScene(firstScene(get().doc));
    },
    setUi: (partial) => set({ ui: { ...get().ui, ...partial } }),
    reset: () => {
      const d = defaultDoc();
      set({
        doc: d,
        past: [],
        future: [],
        selection: null,
        sceneName: firstScene(d),
        graphPath: [{ kind: "scene", name: firstScene(d) }],
      });
    },
    load: (doc) =>
      set({
        doc,
        past: [],
        future: [],
        selection: null,
        sceneName: firstScene(doc),
        graphPath: [{ kind: "scene", name: firstScene(doc) }],
      }),
  };
});

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
