import { test, expect } from "@playwright/test";

test.describe("Vendors + category rail", () => {
  test("clicking a rail category filters the table", async ({ page }) => {
    await page.goto("/vendors");
    await expect(page.locator("h1", { hasText: "Vendors & Pricing" })).toBeVisible();

    // Count rows before filtering
    const allRows = await page.locator("tbody tr").count();
    expect(allRows).toBeGreaterThan(5);

    await page.locator("a.rail-item", { hasText: "Sound & AV" }).click();
    await expect(page).toHaveURL(/cat=sound_av/);
    await expect(page.locator("a.rail-item.on", { hasText: "Sound & AV" })).toBeVisible();

    const filteredRows = await page.locator("tbody tr").count();
    expect(filteredRows).toBeLessThan(allRows);
    expect(filteredRows).toBeGreaterThan(0);
  });

  test("preferred vendor shows a Preferred badge", async ({ page }) => {
    await page.goto("/vendors?cat=sound_av");
    // SonicWave Audio is seeded as preferred
    const row = page.locator("tbody tr", { hasText: "SonicWave Audio" });
    await expect(row.locator(".pill.completed", { hasText: /Preferred/i })).toBeVisible();
  });
});
