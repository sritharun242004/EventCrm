import { test, expect } from "@playwright/test";

test.describe("Events pipeline", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/events");
    await expect(page.locator("h1", { hasText: "Events" })).toBeVisible();
  });

  test("filter chip 'Concerts' navigates + becomes active", async ({ page }) => {
    const concerts = page.locator("a.chip", { hasText: /^Concerts$/ });
    await concerts.click();
    await expect(page).toHaveURL(/\/events\?type=concert$/);
    // Re-fetch chip since navigation triggered rerender
    await expect(page.locator("a.chip.on", { hasText: "Concerts" })).toBeVisible();
    // Only concerts show — pipeline should have fewer cards than the unfiltered view
    const cardCount = await page.locator("a.k-card").count();
    expect(cardCount).toBeGreaterThan(0);
    expect(cardCount).toBeLessThan(15);
  });

  test("clicking a kanban card routes to event brief", async ({ page }) => {
    const first = page.locator("a.k-card").first();
    const href = await first.getAttribute("href");
    expect(href).toMatch(/\/events\/EVT-/);
    await first.click();
    await expect(page).toHaveURL(new RegExp(href!.replace(/[/?]/g, "\\$&")));
    // Detail page always renders KPI tiles; look for the "Attendees" label
    await expect(page.locator(".kpi .label", { hasText: /Attendees/i })).toBeVisible();
  });

  test("kanban card reacts on hover (border darkens)", async ({ page }) => {
    const card = page.locator("a.k-card").first();
    const before = await card.evaluate((el) => getComputedStyle(el).borderColor);
    await card.hover();
    await page.waitForTimeout(180);
    const after = await card.evaluate((el) => getComputedStyle(el).borderColor);
    expect(after).not.toBe(before);
  });
});
