import { chromium } from "@playwright/test";
const url = "https://event.thebotcompany.in";
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

page.on("console", (m) => console.log("[console]", m.type(), m.text()));
page.on("pageerror", (e) => console.log("[pageerror]", e.message));

// Login
await page.goto(`${url}/login`);
await page.fill('input[name="email"]', "tarun@gmail.com");
await page.fill('input[name="password"]', "tarun123");
await page.click('button[type="submit"]');
await page.waitForURL(/overview/, { timeout: 10000 });

// Calendar
await page.goto(`${url}/calendar`);
await page.waitForLoadState("networkidle");

console.log("---BEFORE click---");
console.log("scrim class:", await page.locator(".dialog-scrim").getAttribute("class"));
console.log("dialog class:", await page.locator(".dialog").getAttribute("class"));

// Click any date cell
await page.locator(".cal-cell.clickable").first().click();
await page.waitForTimeout(500);

console.log("---AFTER cell click---");
console.log("scrim class:", await page.locator(".dialog-scrim").getAttribute("class"));
console.log("dialog class:", await page.locator(".dialog").getAttribute("class"));
console.log("dialog title:", await page.locator("#createEventTitle").textContent());

// Try × close
console.log("---Trying × close---");
await page.locator(".dialog-close").click();
await page.waitForTimeout(500);
console.log("scrim class:", await page.locator(".dialog-scrim").getAttribute("class"));
console.log("dialog class:", await page.locator(".dialog").getAttribute("class"));

await browser.close();
