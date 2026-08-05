import { test, expect } from "@playwright/test";

test.describe("Sidebar navigation", () => {
  const routes = [
    { label: "Overview", href: "/overview" },
    { label: "Events", href: "/events" },
    { label: "Calendar", href: "/calendar" },
    { label: "Vendors", href: "/vendors" },
    { label: "Budgets", href: "/budgets" },
    { label: "RFQs", href: "/rfqs" },
    { label: "Teams", href: "/teams" },
    { label: "Reputation", href: "/reputation" },
    { label: "Market", href: "/market" },
  ];

  // The nav-item's inner <span> holds the label; using href instead of text
  // avoids collisions with the badge count that also lives inside the anchor.
  test("all 9 sidebar links navigate and mark themselves active", async ({ page }) => {
    await page.goto("/overview");
    for (const r of routes) {
      await page.locator(`.nav-item[href="${r.href}"]`).click();
      await expect(page).toHaveURL(new RegExp(r.href.replace(/[/]/g, "\\/") + "(\\?|$|/)"));
      await expect(page.locator(`.nav-item.active[href="${r.href}"]`)).toBeVisible();
    }
  });

  test("sidebar badges show live non-zero counts", async ({ page }) => {
    await page.goto("/overview");
    const badge = async (href: string) =>
      (await page.locator(`.nav-item[href="${href}"]`).locator(".count").textContent())?.trim();
    for (const href of ["/events", "/vendors", "/rfqs", "/teams"]) {
      expect(Number(await badge(href))).toBeGreaterThan(0);
    }
  });
});
