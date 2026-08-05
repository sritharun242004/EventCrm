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

  test("sidebar badges show real counts (Events=15, Vendors=20, RFQs=4, Teams=5)", async ({ page }) => {
    await page.goto("/overview");
    const badge = async (href: string) =>
      (await page.locator(`.nav-item[href="${href}"]`).locator(".count").textContent())?.trim();
    expect(await badge("/events")).toBe("15");
    expect(await badge("/vendors")).toBe("20");
    expect(await badge("/rfqs")).toBe("4");
    expect(await badge("/teams")).toBe("5");
  });
});
