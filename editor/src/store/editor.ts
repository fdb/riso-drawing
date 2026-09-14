import { create } from "zustand";
import type {
  Display,
  Doc,
  GraphPathStep,
  SceneDoc,
  Selection,
} from "../lib/types";
import { PROJECT_FUNCTIONS, SCENES } from "../lib/engine";
import {
  docToFiles,
  filesToDoc,
  isProject,
  type ProjectFiles,
} from "../lib/projectFormat";
import {
  permissionOf,
  pickFolder,
  readFolder,
  writeFolder,
  type DirHandleLike,
} from "../lib/projectFs";
import { clearHandle, loadHandle, saveHandle } from "../lib/handleStore";

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

/**
 * memory: no folder, localStorage autosave. permission: a remembered folder that needs the
 * user's consent again. The rest describe the open folder.
 */
export type SaveStatus =
  "memory" | "permission" | "saved" | "saving" | "unsaved" | "error";
export interface ProjectState {
  dir: DirHandleLike | null;
  name: string;
  status: SaveStatus;
  error: string | null;
}
const inMemory = (): ProjectState => ({
  dir: null,
  name: "film",
  status: "memory",
  error: null,
});
const onDisk = (p: ProjectState) =>
  !!p.dir && p.status !== "memory" && p.status !== "permission";

export interface EditorState {
  doc: Doc;
  project: ProjectState;
  /** pick a folder and switch to the project in it */
  openFolder: () => Promise<void>;
  /** pick an empty folder and start a project in it */
  newProject: (template: "film" | "empty") => Promise<void>;
  /** write pending changes to the folder now */
  saveNow: () => Promise<void>;
  /** ask consent for the remembered folder again (needs a user gesture), then open it */
  grantAccess: () => Promise<void>;
  /** forget the folder; the document stays, back in memory */
  closeFolder: () => Promise<void>;
  /** reopen the folder of the previous session, if any */
  restoreProject: () => Promise<void>;
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

/** the smallest project: one world, no functions */
export function emptyDoc(): Doc {
  return { scenes: { scene: emptyScene("scene") }, lib: {} };
}

// what the open folder holds, so a save writes only what changed
let diskFiles: ProjectFiles | null = null;
// the document a folder load produced: not a change to save
let loadedDoc: Doc | null = null;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
// saves run one after another
let saveChain: Promise<void> = Promise.resolve();

export const useEditor = create<EditorState>()((set, get) => {
  const doc = loadDoc();
  const sceneName = firstScene(doc);
  const setProject = (partial: Partial<ProjectState>) =>
    set({ project: { ...get().project, ...partial } });
  const fail = (e: unknown) =>
    setProject({ error: (e as Error).message || String(e) });
  /** make `dir` the open folder, showing `docIn` (loaded from it or just written to it) */
  const adopt = async (
    dir: DirHandleLike,
    name: string,
    docIn: Doc,
    files: ProjectFiles,
  ) => {
    diskFiles = files;
    loadedDoc = docIn;
    get().load(docIn);
    set({ project: { dir, name, status: "saved", error: null } });
    try {
      await saveHandle(dir);
    } catch {
      /* a handle that cannot be stored is forgotten on reload */
    }
  };
  /** write what is pending before the folder changes */
  const flush = async () => {
    clearTimeout(saveTimer);
    if (onDisk(get().project)) await get().saveNow();
  };
  return {
    doc,
    project: inMemory(),
    openFolder: async () => {
      try {
        const dir = await pickFolder();
        if (!dir) return;
        const files = await readFolder(dir);
        const { doc, name } = filesToDoc(files);
        await flush();
        await adopt(dir, name, doc, files);
      } catch (e) {
        fail(e);
      }
    },
    newProject: async (template) => {
      try {
        const dir = await pickFolder();
        if (!dir) return;
        if (isProject(await readFolder(dir)))
          throw new Error(
            `"${dir.name}" already holds a project; open it instead`,
          );
        const doc = template === "film" ? defaultDoc() : emptyDoc();
        const files = docToFiles(doc, dir.name);
        await writeFolder(dir, files, null);
        await flush();
        await adopt(dir, dir.name, doc, files);
      } catch (e) {
        fail(e);
      }
    },
    saveNow: () => {
      saveChain = saveChain.then(async () => {
        const { project, doc } = get();
        if (!onDisk(project)) return;
        const files = docToFiles(doc, project.name);
        setProject({ status: "saving" });
        try {
          await writeFolder(project.dir!, files, diskFiles);
          diskFiles = files;
          if (get().project.dir === project.dir)
            setProject({
              status: get().doc === doc ? "saved" : "unsaved",
              error: null,
            });
        } catch (e) {
          setProject({ status: "error" });
          fail(e);
        }
      });
      return saveChain;
    },
    grantAccess: async () => {
      const { dir } = get().project;
      if (!dir) return;
      try {
        if ((await permissionOf(dir, true)) !== "granted")
          throw new Error(`access to "${dir.name}" was not granted`);
        const files = await readFolder(dir);
        const { doc, name } = filesToDoc(files);
        await adopt(dir, name, doc, files);
      } catch (e) {
        fail(e);
      }
    },
    closeFolder: async () => {
      await flush();
      diskFiles = null;
      set({ project: inMemory() });
      try {
        await clearHandle();
      } catch {
        /* nothing to forget */
      }
    },
    restoreProject: async () => {
      let dir: DirHandleLike | null = null;
      try {
        dir = await loadHandle();
      } catch {
        return;
      }
      if (!dir) return;
      try {
        if ((await permissionOf(dir, false)) !== "granted") {
          set({
            project: { dir, name: dir.name, status: "permission", error: null },
          });
          return;
        }
        const files = await readFolder(dir);
        const { doc, name } = filesToDoc(files);
        await adopt(dir, name, doc, files);
      } catch (e) {
        set({
          project: { dir, name: dir.name, status: "permission", error: null },
        });
        fail(e);
      }
    },
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

// autosave: into the open folder, else into localStorage
useEditor.subscribe((s, prev) => {
  if (s.doc !== prev.doc && s.doc !== loadedDoc) {
    clearTimeout(saveTimer);
    if (onDisk(s.project)) {
      if (s.project.status !== "unsaved")
        useEditor.setState({ project: { ...s.project, status: "unsaved" } });
      saveTimer = setTimeout(() => void useEditor.getState().saveNow(), 1000);
    } else {
      saveTimer = setTimeout(() => {
        storage()?.setItem(STORAGE_KEY, JSON.stringify(s.doc));
      }, 400);
    }
  }
  if (s.ui.theme !== prev.ui.theme)
    storage()?.setItem("riso-editor-theme", s.ui.theme);
});
