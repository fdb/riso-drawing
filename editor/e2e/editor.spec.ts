import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByTestId("scene-jelly").click();
});

test("renders the scene and shows the graph", async ({ page }) => {
  await expect(page.getByTestId("hud")).toContainText("showing output", {
    timeout: 15_000,
  });
  await expect(page.getByTestId("node-big")).toBeVisible();
  await expect(page.getByTestId("node-water")).toBeVisible();
});

test("selecting a node opens its parameters; a typed value can be undone", async ({
  page,
}) => {
  await page.getByTestId("node-big").locator("rect.body").click();
  await expect(page.locator(".insp-head .id")).toHaveValue("big");
  const row = page.locator(".row", { hasText: "tentacles" });
  await expect(row.locator(".val")).toHaveText("24");
  await row.locator(".val").click();
  await page.keyboard.type("8");
  await page.keyboard.press("Enter");
  await expect(row.locator(".val")).toHaveText("8");
  await page.keyboard.press("ControlOrMeta+z");
  await expect(row.locator(".val")).toHaveText("24");
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect(row.locator(".val")).toHaveText("8");
});

test("dragging a number changes it; the whole drag is one undo step", async ({
  page,
}) => {
  await page.getByTestId("node-big").locator("rect.body").click();
  const row = page.locator(".row", { hasText: "tentacles" });
  await expect(row.locator(".val")).toHaveText("24");
  const box = (await row.locator(".num").boundingBox())!;
  const x = Math.round(box.x + box.width / 2),
    y = Math.round(box.y + box.height / 2);
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 4; i++) await page.mouse.move(x - i * 5, y);
  await expect(row.locator(".val")).toHaveText("4");
  for (let i = 1; i <= 2; i++) await page.mouse.move(x - 20 + i * 5, y);
  await page.mouse.up();
  await expect(row.locator(".val")).toHaveText("14");
  await page.keyboard.press("ControlOrMeta+z");
  await expect(row.locator(".val")).toHaveText("24");
  await page.keyboard.press("ControlOrMeta+z");
  await expect(row.locator(".val")).toHaveText("24");
});

test("Tab opens the palette and adds a node; Delete removes it", async ({
  page,
}) => {
  await page.locator(".graph-svg").hover();
  await page.keyboard.press("Tab");
  await page.getByPlaceholder(/add node/).fill("circle");
  await page.keyboard.press("Enter");
  await expect(page.locator(".insp-head .id")).toHaveValue("circle");
  await expect(page.getByTestId("node-circle")).toBeVisible();
  await page.locator(".graph-svg").hover({ position: { x: 5, y: 5 } });
  await page.keyboard.press("Delete");
  await expect(page.getByTestId("node-circle")).toHaveCount(0);
});

test("double-click on a subnet dives into its graph", async ({ page }) => {
  await page.getByTestId("node-big").locator("rect.body").dblclick();
  await expect(page.locator(".crumbs button.on")).toHaveText("jellyfish");
  await expect(page.getByTestId("node-tent")).toBeVisible();
});

test("the eye flag displays a node's value instead of the output", async ({
  page,
}) => {
  await page.getByTestId("eye-stencils").click();
  await expect(page.getByTestId("hud")).toContainText("stencils (stencils)");
  await page.getByTestId("eye-marks").click();
  await expect(page.getByTestId("hud")).toContainText("marks (marks)");
});

test("scenes open from the project list; the print node carries the print parameters", async ({
  page,
}) => {
  await page.getByTestId("scene-fireworks").click();
  await expect(page.getByTestId("hud")).toContainText("fireworks");
  await expect(page.getByTestId("node-b1")).toBeVisible();
  await page.getByTestId("scene-jelly").click();
  await page.getByTestId("node-print").locator("rect.body").click();
  await expect(page.locator(".insp-head .id")).toHaveValue("print");
  await expect(page.locator(".row", { hasText: "pink shift x" })).toBeVisible();
});

test("the bypass flag passes a node's input through", async ({ page }) => {
  await page.getByTestId("bypass-worldClip").click();
  await expect(page.getByTestId("node-worldClip")).toHaveClass(/bypassed/);
  await page.keyboard.press("ControlOrMeta+z");
  await expect(page.getByTestId("node-worldClip")).not.toHaveClass(/bypassed/);
});

test("main plays shots of other scenes", async ({ page }) => {
  await page.getByTestId("scene-main").click();
  await expect(page.getByTestId("node-c2")).toBeVisible();
  await expect(page.getByTestId("hud")).toContainText("loop");
  await expect(page.getByTestId("hud")).toContainText("main");
});
