import { test, expect } from "@playwright/test";

test("without a folder the project is kept in memory", async ({ page }) => {
  await page.goto("/");
  const status = page.getByTestId("save-status");
  await expect(status).toHaveText("not on disk");
  // Chromium has the File System Access API: opening a folder is offered
  await expect(page.getByRole("button", { name: "Open…" })).toBeEnabled();
  await expect(page.getByTestId("folders-unsupported")).toHaveCount(0);
  // a change stays in memory
  await page.getByTestId("scene-jelly").click();
  await page.getByTestId("bypass-marks").click();
  await expect(status).toHaveText("not on disk");
});

test("a browser without the API is told to use export / import", async ({
  page,
}) => {
  await page.addInitScript(() => {
    delete (window as unknown as { showDirectoryPicker?: unknown })
      .showDirectoryPicker;
  });
  await page.goto("/");
  await expect(page.getByTestId("folders-unsupported")).toBeVisible();
  await expect(page.getByRole("button", { name: "Open…" })).toBeDisabled();
  await expect(page.getByTestId("save-status")).toHaveText("not on disk");
});

test("a new project is written to the picked folder and autosaves", async ({
  page,
}) => {
  // the real picker cannot be automated: stand in an in-memory folder
  await page.addInitScript(() => {
    const notFound = () =>
      Object.assign(new Error("not found"), { name: "NotFoundError" });
    class Dir {
      files = new Map<string, string>();
      dirs = new Map<string, Dir>();
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
          this.dirs.set(name, new Dir(name));
        }
        return this.dirs.get(name)!;
      }
      async removeEntry(name: string) {
        if (!this.files.delete(name) && !this.dirs.delete(name))
          throw notFound();
      }
      async *values() {
        for (const name of this.files.keys()) yield { kind: "file", name };
        for (const name of this.dirs.keys()) yield { kind: "directory", name };
      }
    }
    const root = new Dir("fake-film");
    (window as unknown as { __fakeDir: Dir }).__fakeDir = root;
    (
      window as unknown as { showDirectoryPicker: unknown }
    ).showDirectoryPicker = async () => root;
  });
  await page.goto("/");
  await page.getByRole("button", { name: "New from film…" }).click();
  const status = page.getByTestId("save-status");
  await expect(status).toHaveText("saved");
  await expect(page.locator(".pm-name")).toHaveText("fake-film");
  const paths = () =>
    page.evaluate(() => {
      const d = (window as unknown as { __fakeDir: any }).__fakeDir;
      return [
        ...d.files.keys(),
        ...[...d.dirs.get("scenes").files.keys()].map(
          (f: string) => "scenes/" + f,
        ),
      ];
    });
  expect(await paths()).toContain("riso-project.json");
  expect(await paths()).toContain("scenes/jelly.json");

  // a change is written after the debounce
  await page.getByTestId("scene-jelly").click();
  await page.getByTestId("bypass-marks").click();
  await expect(status).toHaveText("unsaved");
  await expect(status).toHaveText("saved", { timeout: 5000 });
  const jelly = await page.evaluate(() =>
    (window as unknown as { __fakeDir: any }).__fakeDir.dirs
      .get("scenes")
      .files.get("jelly.json"),
  );
  expect(JSON.parse(jelly).graph.nodes.marks.bypass).toBe(true);

  // removing a scene deletes its file
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "delete snow" }).click();
  await expect(status).toHaveText("saved", { timeout: 5000 });
  expect(await paths()).not.toContain("scenes/snow.json");

  // opening the same folder again reads it back
  await page.getByRole("button", { name: "close folder" }).click();
  await expect(status).toHaveText("not on disk");
  await page.getByRole("button", { name: "Open…" }).click();
  await expect(status).toHaveText("saved");
  await expect(page.getByTestId("scene-snow")).toHaveCount(0);
  await expect(page.getByTestId("scene-jelly")).toBeVisible();
});
