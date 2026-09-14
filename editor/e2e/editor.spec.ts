import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("renders the scene and shows the graph", async ({ page }) => {
  await expect(page.getByTestId("hud")).toContainText("showing output", {
    timeout: 15_000,
  });
  await expect(page.getByTestId("node-big")).toBeVisible();
  await expect(page.getByTestId("node-water")).toBeVisible();
});

test("selecting a node opens its parameters; a slider change can be undone", async ({
  page,
}) => {
  await page.getByTestId("node-big").locator("rect.head").click();
  await expect(page.locator(".insp-head .id")).toHaveValue("big");
  const row = page.locator(".row", { hasText: "tentacles" });
  await expect(row.locator(".val")).toHaveText("24");
  await row.locator("input[type=range]").fill("8");
  await expect(row.locator(".val")).toHaveText("8");
  await page.keyboard.press("ControlOrMeta+z");
  await expect(row.locator(".val")).toHaveText("24");
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect(row.locator(".val")).toHaveText("8");
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
  await page.getByTestId("node-big").locator("rect.head").dblclick();
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

test("the print tab edits the risoPrint node", async ({ page }) => {
  await page.getByRole("button", { name: "Print" }).click();
  await expect(page.locator(".insp-head .id")).toHaveValue("print");
  await expect(page.locator(".row", { hasText: "pink shift x" })).toBeVisible();
});
