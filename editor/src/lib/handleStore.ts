// Remembers the open project folder across reloads. Directory handles survive in IndexedDB
// (not in localStorage); permission to use them does not, so the caller asks again.
import type { DirHandleLike } from "./projectFs";

const DB = "riso-editor";
const STORE = "handles";
const KEY = "project";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(
  mode: IDBTransactionMode,
  op: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | undefined> {
  if (typeof indexedDB === "undefined") return Promise.resolve(undefined);
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const req = op(db.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export const loadHandle = () =>
  run<DirHandleLike>("readonly", (s) => s.get(KEY)).then((h) => h ?? null);
export const saveHandle = (h: DirHandleLike) =>
  run("readwrite", (s) => s.put(h, KEY)).then(() => undefined);
export const clearHandle = () =>
  run("readwrite", (s) => s.delete(KEY)).then(() => undefined);
