// The in-memory project is autosaved together with a fingerprint of the shipped project it came
// from. On load each scene and function is merged on its own: an unedited copy follows the shipped
// project, an edited copy stays, new shipped items are added and deleted ones stay deleted.
import type { Doc } from "./types";

type Kind = "scenes" | "lib";
const KINDS: Kind[] = ["scenes", "lib"];
export type Base = Record<Kind, Record<string, string>>;

/** FNV-1a over the JSON: small enough to store one per item */
function hash(v: unknown): string {
  const s = JSON.stringify(v);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36) + s.length.toString(36);
}

export function baseOf(shipped: Doc): Base {
  const out = { scenes: {}, lib: {} } as Base;
  for (const k of KINDS)
    for (const [name, item] of Object.entries(shipped[k]))
      out[k][name] = hash(item);
  return out;
}

export function mergeShipped(saved: Doc, base: Base, shipped: Doc): Doc {
  const out = { scenes: { ...saved.scenes }, lib: { ...saved.lib } } as Doc;
  for (const k of KINDS) {
    const into = out[k] as Record<string, unknown>;
    const from = shipped[k] as Record<string, unknown>;
    const unedited = (name: string) =>
      name in into && base[k][name] === hash(into[name]);
    for (const name of Object.keys(base[k]))
      if (!(name in from) && unedited(name)) delete into[name];
    for (const [name, item] of Object.entries(from)) {
      if (!(name in base[k])) {
        if (!(name in into)) into[name] = structuredClone(item);
      } else if (unedited(name)) into[name] = structuredClone(item);
    }
  }
  return out;
}
