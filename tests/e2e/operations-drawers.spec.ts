import { expect, test, type Page } from "@playwright/test";

async function expectViewportDrawer(page: Page, name: string) {
  const dialog = page.getByRole("dialog", { name });
  await expect(dialog).toBeVisible();
  await expect(page.locator(".dialog-scrim.open")).toBeVisible();
  const box = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(Math.round(box!.y)).toBe(0);
  expect(Math.round(box!.height)).toBe(viewport!.height);
  expect(Math.round(box!.x + box!.width)).toBe(viewport!.width);
  return dialog;
}

test("team add and reassign drawers use the shared UI", async ({ page }) => {
  await page.goto("/teams");

  await page.getByRole("button", { name: "Open add member dialog" }).click();
  let dialog = await expectViewportDrawer(page, "Add team member");
  await expect(dialog.getByText("Team management")).toBeVisible();
  await expect(page.locator("#tm-name")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "Open reassign member dialog" }).click();
  dialog = await expectViewportDrawer(page, "Reassign member");
  await expect(page.locator("#rs-member")).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
});

test("market signal drawer uses the shared UI", async ({ page }) => {
  await page.goto("/market");
  await page.getByRole("button", { name: "Open add signal dialog" }).click();

  const dialog = await expectViewportDrawer(page, "Add market signal");
  await expect(dialog.getByText("Market intelligence")).toBeVisible();
  await expect(page.locator("#ms-name")).toBeFocused();
  await expect(dialog.getByRole("button", { name: "Add signal" })).toBeVisible();
});

test("new RFQ opens a functional procurement drawer", async ({ page }) => {
  await page.goto("/rfqs");
  await page.getByRole("button", { name: "Open new RFQ dialog" }).click();
  const dialog = await expectViewportDrawer(page, "New RFQ");
  await expect(dialog.getByText("Procurement workspace")).toBeVisible();
  await expect(page.locator("#rfq-title")).toBeFocused();
  await page.locator("#rfq-title").fill("Browser-tested production RFQ");
  await page.locator("#rfq-category").selectOption("stage");
  await page.locator("#rfq-ceiling").fill("500000");
  await expect(dialog.getByRole("button", { name: "Create draft RFQ" })).toBeEnabled();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
});

test("team and market drawers are full screen on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/teams");
  await page.getByRole("button", { name: "Open add member dialog" }).click();
  let dialog = await expectViewportDrawer(page, "Add team member");
  let box = await dialog.boundingBox();
  expect(Math.round(box!.x)).toBe(0);
  expect(Math.round(box!.width)).toBe(390);
  await page.keyboard.press("Escape");

  await page.goto("/market");
  await page.getByRole("button", { name: "Open add signal dialog" }).click();
  dialog = await expectViewportDrawer(page, "Add market signal");
  box = await dialog.boundingBox();
  expect(Math.round(box!.x)).toBe(0);
  expect(Math.round(box!.width)).toBe(390);
});

test("new event buttons go directly to the event form", async ({ page }) => {
  await page.goto("/overview");
  await expect(page.getByRole("link", { name: "New event" })).toHaveAttribute("href", "/calendar/new");
  await page.goto("/events");
  await expect(page.getByRole("link", { name: "New event" })).toHaveAttribute("href", "/calendar/new");
});
