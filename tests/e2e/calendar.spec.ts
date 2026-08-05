import { test, expect } from "@playwright/test";
import { purgeE2eEvents } from "./_helpers";

test.describe("Calendar — Google-style create event", () => {
  test.afterEach(() => {
    // ONLY deletes rows named "E2E ..." — never touches seed data (EVT-2026-*).
    purgeE2eEvents();
  });

  test("clicking a date cell opens the dialog pre-filled with that date", async ({ page }) => {
    await page.goto("/calendar?y=2027&m=0"); // Jan 2027 — mostly empty, non-oob cells easy to click
    await expect(page.locator("h1", { hasText: "Calendar" })).toBeVisible();

    // Find a specific cell (day 15 of Jan 2027 — not oob and no seeded event on it)
    const cell = page.locator(".cal-cell.clickable").filter({ hasText: /^15$/ }).first();
    await cell.click();

    await expect(page.locator("h3#createEventTitle")).toBeVisible();
    // Date input should be pre-filled to 2027-01-15
    await expect(page.locator("input[name='date']")).toHaveValue("2027-01-15");
  });

  test("submitting a valid event creates it + toast + appears on grid", async ({ page }) => {
    await page.goto("/calendar?y=2027&m=0");
    await page.locator(".cal-cell.clickable").filter({ hasText: /^20$/ }).first().click();

    const title = `E2E ${Date.now()}`;
    await page.fill("input[name='name']", title);
    await page.selectOption("select[name='type']", "concert");
    await page.fill("input[name='expected']", "1200");
    await page.fill("input[name='startTime']", "19:00");
    await page.fill("input[name='endTime']", "23:00");

    // The submit button lives in a viewport-fixed dialog. Playwright's
    // viewport-in-view check doesn't play well with `position: fixed +
    // transform`, so submit via the form.requestSubmit() JS call.
    await page.evaluate(() => {
      const form = document.querySelector<HTMLFormElement>(".dialog form");
      form?.requestSubmit();
    });

    // Toast confirms
    await expect(page.locator(".toast.ok", { hasText: /Event EVT-.* created/ })).toBeVisible({ timeout: 8000 });
    // Dialog closes — the wrapper stays mounted, but loses the .open class.
    await expect(page.locator(".dialog.open")).toHaveCount(0);
    // Event chip appears in the correct cell (day 20)
    await expect(
      page.locator(".cal-cell").filter({ hasText: /^20/ }).locator("a.cal-evt", { hasText: title })
    ).toBeVisible();
  });

  test("blank title shows validation toast", async ({ page }) => {
    await page.goto("/calendar?y=2027&m=0");
    await page.locator(".cal-cell.clickable").filter({ hasText: /^22$/ }).first().click();

    // Bypass required attribute by removing it before submit
    await page.evaluate(() => {
      const n = document.querySelector("input[name='name']") as HTMLInputElement | null;
      if (n) n.removeAttribute("required");
    });
    // The submit button lives in a viewport-fixed dialog. Playwright's
    // viewport-in-view check doesn't play well with `position: fixed +
    // transform`, so submit via the form.requestSubmit() JS call.
    await page.evaluate(() => {
      const form = document.querySelector<HTMLFormElement>(".dialog form");
      form?.requestSubmit();
    });
    await expect(page.locator(".toast.err", { hasText: /Event name is required/ })).toBeVisible({ timeout: 6000 });
  });

  test("end time before start time shows validation toast", async ({ page }) => {
    await page.goto("/calendar?y=2027&m=0");
    await page.locator(".cal-cell.clickable").filter({ hasText: /^24$/ }).first().click();

    await page.fill("input[name='name']", "E2E bad-times");
    await page.fill("input[name='startTime']", "22:00");
    await page.fill("input[name='endTime']", "20:00");
    // The submit button lives in a viewport-fixed dialog. Playwright's
    // viewport-in-view check doesn't play well with `position: fixed +
    // transform`, so submit via the form.requestSubmit() JS call.
    await page.evaluate(() => {
      const form = document.querySelector<HTMLFormElement>(".dialog form");
      form?.requestSubmit();
    });
    await expect(page.locator(".toast.err", { hasText: /End time must be after start time/ })).toBeVisible({ timeout: 6000 });
  });

  test("Prev / Next buttons navigate months", async ({ page }) => {
    await page.goto("/calendar?y=2026&m=7"); // Aug 2026
    await expect(page.locator(".page-actions >> text=August 2026")).toBeVisible();
    await page.locator("a.btn.ghost", { hasText: "Next" }).click();
    await expect(page.locator(".page-actions >> text=September 2026")).toBeVisible();
    await page.locator("a.btn.ghost", { hasText: "Prev" }).click();
    await expect(page.locator(".page-actions >> text=August 2026")).toBeVisible();
  });
});
