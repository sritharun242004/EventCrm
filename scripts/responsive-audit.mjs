/**
 * Headless-Chromium visual audit at every viewport we support.
 * Uses the already-installed Playwright Chromium — no extra deps.
 */
import { chromium } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3007";
const OUT = "/private/tmp/claude-501/-Users-tharunkumarl-Full-Stack/8fa9536d-3b1f-4222-b74f-b3afea899f99/scratchpad/screens";
mkdirSync(OUT, { recursive: true });

const viewports = [
  { name: "phone-320",   w: 320, h: 640,  label: "iPhone SE" },
  { name: "phone-375",   w: 375, h: 812,  label: "iPhone 13 mini" },
  { name: "phone-430",   w: 430, h: 932,  label: "iPhone 15 Pro Max" },
  { name: "tablet-768",  w: 768, h: 1024, label: "iPad" },
  { name: "laptop-1024", w: 1024, h: 768, label: "iPad Pro landscape" },
  { name: "desktop-1440",w: 1440, h: 900, label: "Desktop" },
];

const routes = ["/overview", "/events", "/calendar", "/vendors", "/budgets", "/rfqs", "/teams"];

// Set up: login once, reuse cookies
const browser = await chromium.launch();
const authCtx = await browser.newContext();
const authPage = await authCtx.newPage();
await authPage.goto(`${BASE}/login`);
await authPage.fill('input[name="email"]', "tarun@gmail.com");
await authPage.fill('input[name="password"]', "tarun123");
await authPage.click('button[type="submit"]');
try { await authPage.waitForURL(/overview/, { timeout: 5000 }); } catch {}
const state = await authCtx.storageState();
await authCtx.close();

const problems = [];
const summary = [];

for (const vp of viewports) {
  for (const route of routes) {
    const ctx = await browser.newContext({
      viewport: { width: vp.w, height: vp.h },
      storageState: state,
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));

    const resp = await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 15000 }).catch((e) => ({ status: () => 0, err: String(e) }));
    const status = resp?.status ? resp.status() : 0;

    // Check for horizontal scroll (the classic responsive failure)
    const overflow = await page.evaluate(() => {
      const scrollW = document.documentElement.scrollWidth;
      const clientW = document.documentElement.clientWidth;
      return { scrollW, clientW, hasHorizontal: scrollW > clientW + 2 };
    });

    // Small screens: hamburger must be visible
    let hamburgerOk = true;
    if (vp.w <= 900) {
      hamburgerOk = await page.locator(".hamburger").isVisible().catch(() => false);
    }

    const fileName = `${OUT}/${vp.name}--${route.replace(/\//g, "_") || "root"}.png`;
    await page.screenshot({ path: fileName, fullPage: false });

    const flag = [];
    if (status !== 200) flag.push(`http-${status}`);
    if (overflow.hasHorizontal) flag.push(`overflow:${overflow.scrollW}>${overflow.clientW}`);
    if (vp.w <= 900 && !hamburgerOk) flag.push("no-hamburger");
    if (errors.length) flag.push(`js-errors:${errors.length}`);

    const line = `${flag.length === 0 ? "✓" : "✗"}  ${vp.name.padEnd(15)}  ${route.padEnd(12)}  HTTP ${status}  ${flag.join(" ")}`;
    summary.push(line);
    if (flag.length) problems.push({ vp: vp.name, route, flag, errors });
    console.log(line);

    await ctx.close();
  }
}

writeFileSync(`${OUT}/report.txt`, summary.join("\n") + "\n\n" + JSON.stringify(problems, null, 2));
await browser.close();

console.log(`\n${summary.length - problems.length}/${summary.length} checks green`);
console.log(`Problems: ${problems.length}`);
if (problems.length > 0) process.exit(1);
