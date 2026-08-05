import { test, expect } from "@playwright/test";

test.describe("RFQs + compare grid", () => {
  test("index shows status-grouped cards", async ({ page }) => {
    await page.goto("/rfqs");
    await expect(page.locator("h1", { hasText: "Vendor RFQs" })).toBeVisible();
    // Each section title corresponds to a status group
    await expect(page.locator(".sec-title", { hasText: /Comparing/i })).toBeVisible();
    // At least one card
    await expect(page.locator("a.rfq-card").first()).toBeVisible();
  });

  test("navigating into a comparing RFQ shows the compare grid", async ({ page }) => {
    await page.goto("/rfqs");
    // Diljit RFQ is the "comparing" one
    const card = page.locator("a.rfq-card", { hasText: /Line-array PA/ }).first();
    await card.click();
    await expect(page).toHaveURL(/\/rfqs\/RFQ-2026-0031$/);
    await expect(page.locator(".quote-grid")).toBeVisible();

    // Grid has vendor columns: metric label column + N vendor columns
    const headerCells = await page.locator(".quote-grid .qh").count();
    expect(headerCells).toBeGreaterThanOrEqual(4); // Metric + at least 3 vendors

    // Winner highlight visible
    await expect(page.locator(".quote-grid .qval.big.winner").first()).toBeVisible();
    // Recommendation card
    await expect(page.locator(".card", { hasText: /Recommendation/i })).toBeVisible();
  });

  test("back-to-RFQs breadcrumb works", async ({ page }) => {
    await page.goto("/rfqs/RFQ-2026-0031");
    await page.locator(".crumb a", { hasText: /← RFQs/ }).click();
    await expect(page).toHaveURL(/\/rfqs$/);
  });
});
