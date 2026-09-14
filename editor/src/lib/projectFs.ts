// A project folder through the File System Access API (Chromium only). The handle interfaces
// are the subset the editor uses, so a test can pass an in-memory fake.
import {
  diffFiles,
  FUNCTIONS_DIR,
  MANIFEST,
  SCENES_DIR,
  type ProjectFiles,
} from "./projectFormat";

export interface FileHandleLike {
  getFile(): Promise<{ text(): Promise<string> }>;
  createWritable(): Promise<{
    write(data: string): Promise<void>;
    close(): Promise<void>;
  }>;
}
export interface DirHandleLike {
  readonly name: string;
  getFileHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<FileHandleLike>;
  getDirectoryHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<DirHandleLike>;
  removeEntry(name: string): Promise<void>;
  values(): AsyncIterable<{ kind: "file" | "directory"; name: string }>;
  queryPermission?(d: { mode: "readwrite" }): Promise<PermissionState>;
  requestPermission?(d: { mode: "readwrite" }): Promise<PermissionState>;
}

type Picker = (o: { mode: "readwrite" }) => Promise<DirHandleLike>;

export const supportsFolders = () =>
  typeof (globalThis as { showDirectoryPicker?: unknown })
    .showDirectoryPicker === "function";

/** the folder the user picked, or null when they cancelled */
export async function pickFolder(): Promise<DirHandleLike | null> {
  const picker = (globalThis as { showDirectoryPicker?: Picker })
    .showDirectoryPicker;
  if (!picker) throw new Error("this browser cannot open folders");
  try {
    return await picker({ mode: "readwrite" });
  } catch (e) {
    if ((e as Error).name === "AbortError") return null;
    throw e;
  }
}

/** "granted" | "prompt" | "denied"; handles without the permission API count as granted */
export async function permissionOf(
  dir: DirHandleLike,
  request: boolean,
): Promise<PermissionState> {
  const d = { mode: "readwrite" as const };
  let state = (await dir.queryPermission?.(d)) ?? "granted";
  if (state === "prompt" && request)
    state = (await dir.requestPermission?.(d)) ?? "granted";
  return state;
}

const notFound = (e: unknown) => (e as Error).name === "NotFoundError";

async function readText(dir: DirHandleLike, name: string) {
  return (await (await dir.getFileHandle(name)).getFile()).text();
}

async function readDir(dir: DirHandleLike, sub: string, into: ProjectFiles) {
  let d: DirHandleLike;
  try {
    d = await dir.getDirectoryHandle(sub);
  } catch (e) {
    if (notFound(e)) return;
    throw e;
  }
  for await (const entry of d.values())
    if (entry.kind === "file" && entry.name.endsWith(".json"))
      into[`${sub}/${entry.name}`] = await readText(d, entry.name);
}

/** the project files in a folder; other files are ignored */
export async function readFolder(dir: DirHandleLike): Promise<ProjectFiles> {
  const files: ProjectFiles = {};
  try {
    files[MANIFEST] = await readText(dir, MANIFEST);
  } catch (e) {
    if (!notFound(e)) throw e;
  }
  await readDir(dir, SCENES_DIR, files);
  await readDir(dir, FUNCTIONS_DIR, files);
  return files;
}

const split = (path: string): [string | null, string] => {
  const i = path.indexOf("/");
  return i < 0 ? [null, path] : [path.slice(0, i), path.slice(i + 1)];
};

/** write the files that differ from `prev`, delete the ones `next` no longer has */
export async function writeFolder(
  dir: DirHandleLike,
  next: ProjectFiles,
  prev: ProjectFiles | null,
): Promise<{ written: number; removed: number }> {
  const { write, remove } = diffFiles(prev, next);
  for (const path of write) {
    const [sub, name] = split(path);
    const d = sub ? await dir.getDirectoryHandle(sub, { create: true }) : dir;
    const w = await (
      await d.getFileHandle(name, { create: true })
    ).createWritable();
    await w.write(next[path]);
    await w.close();
  }
  for (const path of remove) {
    const [sub, name] = split(path);
    try {
      const d = sub ? await dir.getDirectoryHandle(sub) : dir;
      await d.removeEntry(name);
    } catch (e) {
      if (!notFound(e)) throw e;
    }
  }
  return { written: write.length, removed: remove.length };
}
