import { test, expect } from "@playwright/test";
import { purgeE2eVendors } from "./_helpers";

test.describe("Vendors + category rail", () => {
  test.afterEach(() => purgeE2eVendors());

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

  test("Add vendor creates a vendor and first rate-card item", async ({ page }) => {
    await page.goto("/vendors");
    await page.getByRole("button", { name: "Open add vendor dialog" }).click();

    const name = `E2E Vendor UI ${Date.now()}`;
    await page.fill("input[name=name]", name);
    await page.selectOption("select[name=category]", "sound_av");
    await page.fill("input[name=city]", "Bengaluru");
    await page.fill("input[name=contactName]", "Test Producer");
    await page.fill("input[name=reliabilityPct]", "96");
    await page.fill("input[name=sku]", "E2E PA Package");
    await page.fill("input[name=unit]", "day");
    await page.fill("input[name=basePriceInr]", "45000");

    // The fixed, transformed dialog has an internal scroll container; submitting
    // through requestSubmit avoids browser viewport heuristics moving the page.
    await page.locator(".vendor-dialog form").evaluate((form: HTMLFormElement) => form.requestSubmit());
    await expect(page.locator(".toast.ok", { hasText: /added to vendor directory/ })).toBeVisible({ timeout: 10_000 });
    await page.reload();
    await expect(page.getByText(name, { exact: false })).toBeVisible();
    await expect(page.getByText(/E2E PA Package/)).toBeVisible();
  });
});
