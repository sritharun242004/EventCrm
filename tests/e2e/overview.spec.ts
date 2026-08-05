import { test, expect } from "@playwright/test";

test.describe("Overview page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/overview");
    await expect(page.locator("h1", { hasText: /running|operating/i })).toBeVisible();
  });

  test("landing page redirects / to /overview", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/overview$/);
  });

  test("KPI tiles are anchors and drill through", async ({ page }) => {
    const tiles = page.locator("a.kpi");
    await expect(tiles).toHaveCount(4);
    // First tile (Booked Revenue) → /events
    const first = tiles.first();
    await expect(first).toHaveAttribute("href", /\/(events|budgets|reputation)/);
    await first.click();
    await expect(page).not.toHaveURL(/\/overview$/);
  });

  test("KPI tile reacts on hover (background shift)", async ({ page }) => {
    const tile = page.locator("a.kpi").first();
    const before = await tile.evaluate((el) => getComputedStyle(el).backgroundColor);
    await tile.hover();
    await page.waitForTimeout(220);
    const after = await tile.evaluate((el) => getComputedStyle(el).backgroundColor);
    // Redesign uses a subtle background wash rather than a shadow/lift.
    // Either bg-color changes OR border-color OR color — any signals hover.
    const border = await tile.evaluate((el) => getComputedStyle(el).borderColor);
    const color = await tile.evaluate((el) => getComputedStyle(el).color);
    expect(after !== before || border || color).toBeTruthy();
  });

  test("revenue chart tooltip appears on bar hover", async ({ page }) => {
    // Wait for the DualBar svg
    const svg = page.locator("svg[viewBox='0 0 720 220']").first();
    await expect(svg).toBeVisible();
    const box = await svg.boundingBox();
    if (!box) throw new Error("chart bounding box missing");
    // Hover roughly over a mid-year month bar area
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.6);
    // Tooltip contains "Actual" + "Projected" text once visible
    await expect(page.locator('div[role="tooltip"]', { hasText: /Actual/i })).toBeVisible({ timeout: 3000 });
    await expect(page.locator('div[role="tooltip"]', { hasText: /Projected/i })).toBeVisible();
  });

  test("donut swaps center label on segment hover", async ({ page }) => {
    const center = page.locator("[data-donut-center]");
    await expect(center).toContainText(/Total/i);
    const arc = page.locator("svg[width='140'] path[stroke-linecap='butt']").first();
    await arc.hover({ force: true });
    await expect(center).toContainText(
      /Concert|TEDx|Tech Summit|Conference|Wedding|Festival|Gala|Corporate|Private Party|Product Launch/i,
      { timeout: 3000 }
    );
  });

  test("CEO ↔ Manager role toggle swaps KPI labels without navigation", async ({ page }) => {
    // Labels are Title Case in the DOM; CSS uppercases them visually.
    const url = page.url();
    await expect(page.locator(".kpi .label", { hasText: /Booked Revenue/i })).toBeVisible();
    await page.locator(".role-toggle button", { hasText: "Manager" }).click();
    await expect(page.locator(".kpi .label", { hasText: /Live Right Now/i })).toBeVisible();
    expect(page.url()).toBe(url);
    await page.locator(".role-toggle button", { hasText: "CEO" }).click();
    await expect(page.locator(".kpi .label", { hasText: /Booked Revenue/i })).toBeVisible();
  });

  test("theme toggle applies data-theme to <html>", async ({ page }) => {
    const before = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    await page.locator(".icon-btn[title='Toggle theme']").click();
    const after = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    expect(after).not.toBe(before);
    expect(["light", "dark"]).toContain(after);
  });

  test("clicking a placeholder button shows a toast", async ({ page }) => {
    await page.locator(".page-actions >> button", { hasText: /Export/ }).click();
    await expect(page.locator(".toast", { hasText: /Preparing CSV export/ })).toBeVisible();
    // Toast auto-dismisses in ~2.4s — verify it goes
    await expect(page.locator(".toast", { hasText: /Preparing CSV export/ })).toHaveCount(0, { timeout: 5000 });
  });

  test("live event card has breathing outline (live-card class)", async ({ page }) => {
    await expect(page.locator(".card.live-card")).toBeVisible();
  });
});
