import { chromium } from "@playwright/test";
const url = "https://event.thebotcompany.in";
const browser = await chromium.launch();
const page = await browser.newContext().then(c => c.newPage());
await page.goto(`${url}/login`);
await page.fill('input[name="email"]', "tarun@gmail.com");
await page.fill('input[name="password"]', "tarun123");
await page.click('button[type="submit"]');
await page.waitForURL(/overview/, { timeout: 10000 });
await page.goto(`${url}/calendar`);
await page.waitForLoadState("networkidle");

// Confirm no duplicate .dialog-close
const dupes = await page.locator(".dialog-close").count();
console.log("elements with .dialog-close class:", dupes, "(should be 1 — just the calendar dialog's)");

// Click a cell to open dialog
await page.locator(".cal-cell.clickable").first().click();
await page.waitForTimeout(300);
console.log("dialog open?", (await page.locator(".dialog").getAttribute("class")).includes("open"));

// Click ×
await page.locator(".dialog-close").click();
await page.waitForTimeout(500);
console.log("dialog open AFTER × click?", (await page.locator(".dialog").getAttribute("class")).includes("open"));
console.log(dupes === 1 && !(await page.locator(".dialog").getAttribute("class")).includes("open") ? "✅ FIXED" : "❌ STILL BROKEN");
await browser.close();
