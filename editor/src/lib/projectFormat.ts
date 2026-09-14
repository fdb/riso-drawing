// The on-disk project: a folder with a manifest, one file per scene and one per function.
//
//   riso-project.json           { format, name, scenes: [...], functions: [...] }
//   scenes/<name>.json          a SceneDoc
//   functions/<name>.json       a SubnetDoc
//
// Every file is pretty-printed JSON, so a folder diffs well in git. The manifest lists names in
// document order; files it does not list are loaded after them, sorted by name.
import type { Doc, SceneDoc, SubnetDoc } from "./types";

export const FORMAT = 1;
export const MANIFEST = "riso-project.json";
export const SCENES_DIR = "scenes";
export const FUNCTIONS_DIR = "functions";

/** relative path → file text, only the files the format owns */
export type ProjectFiles = Record<string, string>;

export interface Manifest {
  format: number;
  name: string;
  scenes: string[];
  functions: string[];
}

const json = (v: unknown) => JSON.stringify(v, null, 2) + "\n";

/** letters, digits, `.`, `-` and `_` stay; every other byte is percent-encoded */
export const fileNameOf = (name: string) =>
  name.replace(/[^A-Za-z0-9._-]+/g, (run) =>
    Array.from(
      new TextEncoder().encode(run),
      (b) => "%" + b.toString(16).toUpperCase().padStart(2, "0"),
    ).join(""),
  );
export const nameOfFile = (file: string) =>
  decodeURIComponent(file.replace(/\.json$/, ""));

export const scenePath = (name: string) =>
  `${SCENES_DIR}/${fileNameOf(name)}.json`;
export const functionPath = (name: string) =>
  `${FUNCTIONS_DIR}/${fileNameOf(name)}.json`;

export function docToFiles(doc: Doc, name: string): ProjectFiles {
  const files: ProjectFiles = {};
  const manifest: Manifest = {
    format: FORMAT,
    name,
    scenes: Object.keys(doc.scenes),
    functions: Object.keys(doc.lib),
  };
  files[MANIFEST] = json(manifest);
  for (const [k, s] of Object.entries(doc.scenes))
    files[scenePath(k)] = json({ ...s, name: k });
  for (const [k, f] of Object.entries(doc.lib))
    files[functionPath(k)] = json(f);
  return files;
}

export const isProject = (files: ProjectFiles) => MANIFEST in files;

function parse<T>(files: ProjectFiles, path: string): T {
  try {
    return JSON.parse(files[path]) as T;
  } catch (e) {
    throw new Error(`${path}: ${(e as Error).message}`);
  }
}

/** names in manifest order, then the rest of the files in `dir` sorted by name */
function namesIn(files: ProjectFiles, dir: string, listed: string[]) {
  const onDisk = Object.keys(files)
    .filter((p) => p.startsWith(dir + "/") && p.endsWith(".json"))
    .map((p) => nameOfFile(p.slice(dir.length + 1)));
  const rest = onDisk.filter((n) => !listed.includes(n)).sort();
  return [...listed.filter((n) => onDisk.includes(n)), ...rest];
}

export function filesToDoc(files: ProjectFiles): { doc: Doc; name: string } {
  if (!isProject(files)) throw new Error(`no ${MANIFEST} in this folder`);
  const m = parse<Partial<Manifest>>(files, MANIFEST);
  if (m.format !== FORMAT)
    throw new Error(`project format ${m.format} is not supported`);
  const doc: Doc = { scenes: {}, lib: {} };
  for (const n of namesIn(files, SCENES_DIR, m.scenes ?? [])) {
    const s = parse<SceneDoc>(files, scenePath(n));
    doc.scenes[n] = { ...s, name: n };
  }
  for (const n of namesIn(files, FUNCTIONS_DIR, m.functions ?? []))
    doc.lib[n] = parse<SubnetDoc>(files, functionPath(n));
  if (!Object.keys(doc.scenes).length)
    throw new Error("the project has no scenes");
  return { doc, name: m.name || "project" };
}

/** the files to write and the files to delete to turn `prev` into `next` */
export function diffFiles(
  prev: ProjectFiles | null,
  next: ProjectFiles,
): { write: string[]; remove: string[] } {
  const write = Object.keys(next).filter((p) => !prev || prev[p] !== next[p]);
  const remove = prev ? Object.keys(prev).filter((p) => !(p in next)) : [];
  return { write, remove };
}
