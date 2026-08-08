import { expect, test } from "@playwright/test";

test("budget line drawer is contained and usable on desktop", async ({ page }) => {
  await page.goto("/budgets");
  await page.getByRole("button", { name: "Open add budget line dialog" }).click();

  const dialog = page.getByRole("dialog", { name: "Add budget line" });
  await expect(dialog).toBeVisible();
  await expect(page.getByText("Add a planned cost and optionally record the amount already spent.")).toBeVisible();
  await expect(page.locator(".dialog-scrim.open")).toBeVisible();

  const box = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  expect(box!.y).toBe(0);
  expect(box!.height).toBe(viewport!.height);

  await page.locator("#bl-category").selectOption("Sound & AV");
  await page.locator("#bl-planned").fill("125000");
  await page.locator("#bl-actual").fill("50000");
  await page.locator("#bl-notes").fill("Desktop dialog visual check");
  await expect(page.getByRole("button", { name: "Add line", exact: true }).last()).toBeEnabled();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("budget line drawer becomes full screen on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/budgets");
  await page.getByRole("button", { name: "Open add budget line dialog" }).click();

  const dialog = page.getByRole("dialog", { name: "Add budget line" });
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(Math.round(box!.x)).toBe(0);
  expect(Math.round(box!.y)).toBe(0);
  expect(Math.round(box!.width)).toBe(390);
  expect(Math.round(box!.height)).toBe(844);
  await expect(page.locator("#bl-category")).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
});
