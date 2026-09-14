import { describe, it, expect } from "vitest";
import {
  diffFiles,
  docToFiles,
  fileNameOf,
  filesToDoc,
  MANIFEST,
  nameOfFile,
  type ProjectFiles,
} from "./projectFormat";
import { readFolder, writeFolder, type DirHandleLike } from "./projectFs";
import { defaultDoc, emptyScene } from "../store/editor";
import type { Doc } from "./types";

const notFound = () =>
  Object.assign(new Error("not found"), { name: "NotFoundError" });

/** an in-memory folder with the part of the File System Access API the editor uses */
class FakeDir implements DirHandleLike {
  files = new Map<string, string>();
  dirs = new Map<string, FakeDir>();
  constructor(public name: string) {}
  async getFileHandle(name: string, o?: { create?: boolean }) {
    if (!this.files.has(name)) {
      if (!o?.create) throw notFound();
      this.files.set(name, "");
    }
    const files = this.files;
    return {
      getFile: async () => ({ text: async () => files.get(name)! }),
      createWritable: async () => {
        let buf = "";
        return {
          write: async (s: string) => void (buf += s),
          close: async () => void files.set(name, buf),
        };
      },
    };
  }
  async getDirectoryHandle(name: string, o?: { create?: boolean }) {
    if (!this.dirs.has(name)) {
      if (!o?.create) throw notFound();
      this.dirs.set(name, new FakeDir(name));
    }
    return this.dirs.get(name)!;
  }
  async removeEntry(name: string) {
    if (!this.files.delete(name) && !this.dirs.delete(name)) throw notFound();
  }
  async *values() {
    for (const name of this.files.keys()) yield { kind: "file" as const, name };
    for (const name of this.dirs.keys())
      yield { kind: "directory" as const, name };
  }
  /** every path in the tree */
  paths(prefix = ""): string[] {
    return [
      ...[...this.files.keys()].map((f) => prefix + f),
      ...[...this.dirs.entries()].flatMap(([d, dir]) =>
        dir.paths(prefix + d + "/"),
      ),
    ].sort();
  }
}

describe("project format", () => {
  it("round-trips the built-in project through files", () => {
    const doc = defaultDoc();
    const files = docToFiles(doc, "film");
    expect(Object.keys(files)).toContain(MANIFEST);
    expect(Object.keys(files)).toContain("scenes/jelly.json");
    expect(Object.keys(files)).toContain("functions/jellyfish.json");
    const back = filesToDoc(files);
    expect(back.name).toBe("film");
    expect(back.doc).toEqual(doc);
    expect(Object.keys(back.doc.scenes)).toEqual(Object.keys(doc.scenes));
    expect(Object.keys(back.doc.lib)).toEqual(Object.keys(doc.lib));
  });

  it("writes pretty JSON that ends with a newline", () => {
    const files = docToFiles(defaultDoc(), "film");
    for (const text of Object.values(files)) {
      expect(text.endsWith("\n")).toBe(true);
      expect(text.split("\n").length).toBeGreaterThan(2);
    }
  });

  it("encodes names that are not safe file names", () => {
    expect(fileNameOf("small-left")).toBe("small-left");
    expect(fileNameOf("a/b c%")).toBe("a%2Fb%20c%25");
    expect(nameOfFile(fileNameOf("a/b c%") + ".json")).toBe("a/b c%");
    const doc: Doc = { scenes: { "a/b": emptyScene("a/b") }, lib: {} };
    expect(filesToDoc(docToFiles(doc, "x")).doc.scenes["a/b"].name).toBe("a/b");
  });

  it("the file name wins over the name inside a scene file", () => {
    const files = docToFiles(
      { scenes: { one: emptyScene("other") }, lib: {} },
      "x",
    );
    expect(filesToDoc(files).doc.scenes.one.name).toBe("one");
  });

  it("loads files the manifest does not list, after the listed ones", () => {
    const files = docToFiles(
      { scenes: { b: emptyScene("b"), a: emptyScene("a") }, lib: {} },
      "x",
    );
    files["scenes/c.json"] = JSON.stringify(emptyScene("c"));
    expect(Object.keys(filesToDoc(files).doc.scenes)).toEqual(["b", "a", "c"]);
  });

  it("rejects folders without a manifest, other formats and broken files", () => {
    expect(() => filesToDoc({})).toThrow(/riso-project\.json/);
    expect(() => filesToDoc({ [MANIFEST]: '{"format":2,"name":"x"}' })).toThrow(
      /format 2/,
    );
    const files = docToFiles(defaultDoc(), "film");
    files["scenes/jelly.json"] = "{ nope";
    expect(() => filesToDoc(files)).toThrow(/scenes\/jelly\.json/);
  });

  it("diffs only changed files and lists removed ones", () => {
    const doc = defaultDoc();
    const a = docToFiles(doc, "film");
    expect(diffFiles(null, a).write.sort()).toEqual(Object.keys(a).sort());
    expect(diffFiles(a, a)).toEqual({ write: [], remove: [] });
    doc.scenes.jelly.seed = 99;
    delete doc.scenes.snow;
    const b = docToFiles(doc, "film");
    expect(diffFiles(a, b)).toEqual({
      write: [MANIFEST, "scenes/jelly.json"],
      remove: ["scenes/snow.json"],
    });
  });
});

describe("project folder", () => {
  it("writes a folder, reads it back, then writes only what changed", async () => {
    const dir = new FakeDir("myfilm");
    const doc = defaultDoc();
    const a = docToFiles(doc, "myfilm");
    expect(await writeFolder(dir, a, null)).toEqual({
      written: Object.keys(a).length,
      removed: 0,
    });
    expect(dir.paths()).toEqual(Object.keys(a).sort());
    const read = await readFolder(dir);
    expect(read).toEqual(a);
    expect(filesToDoc(read).doc).toEqual(doc);

    doc.lib.jellyfish.label = "Jelly";
    delete doc.lib.flake;
    doc.scenes.extra = emptyScene("extra");
    const b = docToFiles(doc, "myfilm");
    expect(await writeFolder(dir, b, a)).toEqual({ written: 3, removed: 1 });
    expect(dir.paths()).toEqual(Object.keys(b).sort());
    expect(filesToDoc(await readFolder(dir)).doc).toEqual(doc);
  });

  it("ignores files the format does not own and tolerates a missing file on delete", async () => {
    const dir = new FakeDir("p");
    dir.files.set("README.md", "# hi");
    (await dir.getDirectoryHandle("scenes", { create: true })).files.set(
      "notes.txt",
      "x",
    );
    const a = docToFiles(defaultDoc(), "p");
    await writeFolder(dir, a, null);
    expect(await readFolder(dir)).toEqual(a);
    const prev: ProjectFiles = { ...a, "scenes/gone.json": "{}" };
    await expect(writeFolder(dir, a, prev)).resolves.toEqual({
      written: 0,
      removed: 1,
    });
    expect(dir.paths()).toContain("README.md");
    expect(dir.paths()).toContain("scenes/notes.txt");
  });

  it("an empty folder is not a project", async () => {
    expect(await readFolder(new FakeDir("empty"))).toEqual({});
  });
});
