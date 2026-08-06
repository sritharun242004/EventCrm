/**
 * Full-app action audit: log in, walk every page, click every button we can
 * find, and record whether it triggers a real navigation / DB write (WORKS)
 * or a "coming soon" toast (PLACEHOLDER) or nothing at all (BROKEN).
 */
import { chromium } from "@playwright/test";

const URL = process.env.BASE_URL || "https://event.thebotcompany.in";

// pages to walk, and the buttons/actions we expect to find on each
const audits = [
  {
    page: "/overview",
    buttons: [
      { label: "Export",         expect: "toast" },
      { label: "Share",          expect: "toast" },
      { label: "New event",      expect: "nav:/calendar" },
    ],
  },
  {
    page: "/events",
    buttons: [
      { label: "Group by team",  expect: "nav:group=team" },
      { label: "New event",      expect: "nav:/calendar" },
    ],
  },
  {
    page: "/calendar",
    buttons: [
      { label: "New event",      expect: "nav:/calendar/new" },
      { label: "Today",          expect: "nav:/calendar" },
    ],
  },
  {
    page: "/vendors",
    buttons: [
      { label: "Import price list", expect: "toast" },
      { label: "Add vendor",        expect: "no-op" },
    ],
  },
  {
    page: "/budgets",
    buttons: [
      { label: "Export CSV",  expect: "no-op" },
      { label: "Add line",    expect: "no-op" },
    ],
  },
  {
    page: "/rfqs",
    buttons: [
      { label: "Templates",  expect: "no-op" },
      { label: "New RFQ",    expect: "no-op" },
    ],
  },
  {
    page: "/rfqs/RFQ-2026-0031",
    buttons: [
      { label: "Duplicate",       expect: "no-op" },
      { label: "Send reminder",   expect: "no-op" },
    ],
  },
  {
    page: "/teams",
    buttons: [
      { label: "Reassign",   expect: "toast" },
      { label: "Add member", expect: "no-op" },
    ],
  },
  {
    page: "/reputation",
    buttons: [
      { label: "Send survey",     expect: "toast" },
      { label: "Request review",  expect: "no-op" },
    ],
  },
  {
    page: "/market",
    buttons: [
      { label: "Import calendar", expect: "toast" },
      { label: "Add signal",      expect: "toast" },
    ],
  },
];

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const jsErrors = [];
page.on("pageerror", (e) => jsErrors.push(String(e.message)));

// login
await page.goto(`${URL}/login`);
await page.fill('input[name="email"]', "tarun@gmail.com");
await page.fill('input[name="password"]', "tarun123");
await page.click('button[type="submit"]');
await page.waitForURL(/overview/, { timeout: 15000 });

const results = [];

for (const a of audits) {
  await page.goto(`${URL}${a.page}`);
  await page.waitForLoadState("networkidle").catch(() => {});
  const httpOk = page.url().includes(a.page.split("?")[0]);

  results.push({ kind: "page", page: a.page, status: httpOk ? "OK" : "REDIRECTED", to: page.url() });

  for (const b of a.buttons) {
    const beforeUrl = page.url();
    // Find a button/anchor with matching text (case-insensitive)
    const target = page.locator(`button:has-text("${b.label}"), a.btn:has-text("${b.label}")`).first();
    const found = await target.count().then((n) => n > 0);
    if (!found) {
      results.push({ kind: "btn", page: a.page, label: b.label, expect: b.expect, actual: "NOT-FOUND" });
      continue;
    }
    await target.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(600);

    const afterUrl = page.url();
    const toastVisible = await page.locator(".toast").count();
    let actual = "no-op";
    if (afterUrl !== beforeUrl) actual = `nav:${afterUrl.replace(URL, "")}`;
    else if (toastVisible > 0) actual = "toast";

    // dismiss any toasts before next click
    const toasts = await page.locator(".toast").all();
    for (const t of toasts) { await t.click().catch(() => {}); }

    // if navigated, come back
    if (afterUrl !== beforeUrl && !afterUrl.includes(a.page)) {
      await page.goto(`${URL}${a.page}`);
      await page.waitForLoadState("networkidle").catch(() => {});
    }

    results.push({ kind: "btn", page: a.page, label: b.label, expect: b.expect, actual });
  }
}

console.log("\n─── AUDIT MATRIX ───");
for (const r of results) {
  if (r.kind === "page") {
    console.log(`\n▸ ${r.page}  [${r.status}]`);
  } else {
    const ok = r.actual === r.expect ? "✓" : (r.actual === "no-op" && r.expect === "no-op" ? "✓" : (r.actual.startsWith("nav") && r.expect.startsWith("nav") ? "✓" : "?"));
    console.log(`   ${ok}  ${r.label.padEnd(22)}  expected=${r.expect.padEnd(22)}  actual=${r.actual}`);
  }
}

console.log(`\n─── JS errors during audit: ${jsErrors.length}`);
jsErrors.forEach((e) => console.log("  •", e));

// Do the real WRITE test LAST so a failure here doesn't hide the matrix.
console.log("\n─── Testing real WRITE (create event via /calendar/new) ───");
let writeWorks = false;
try {
  const uniq = `E2E-AUDIT-${Date.now()}`;
  await page.goto(`${URL}/calendar/new?date=2027-06-15`);
  await page.fill('input[name="name"]', uniq);
  await page.click('button[type="submit"]');
  await page.waitForURL(/calendar/, { timeout: 8000 });
  await page.waitForTimeout(1500);
  // Look for the newly-created event on the calendar or events page
  await page.goto(`${URL}/events`);
  await page.waitForLoadState("networkidle").catch(() => {});
  const found = await page.locator(`text=${uniq}`).count();
  writeWorks = found > 0;
  console.log(`event "${uniq}" appears on /events: ${found > 0 ? "YES" : "NO"} → WRITE ${writeWorks ? "✅ WORKS" : "❌ FAILED"}`);
} catch (err) {
  console.log(`WRITE test threw: ${err.message}`);
}

console.log(`\n─── SUMMARY`);
const pageOk = results.filter((r) => r.kind === "page" && r.status === "OK").length;
const pageAll = results.filter((r) => r.kind === "page").length;
const btnOk = results.filter((r) => r.kind === "btn" && r.actual === r.expect).length;
const btnAll = results.filter((r) => r.kind === "btn").length;
console.log(`Pages loaded OK           : ${pageOk} / ${pageAll}`);
console.log(`Buttons behave as expected: ${btnOk} / ${btnAll}`);
console.log(`Real create-event write   : ${writeWorks ? "PROVEN" : "NOT PROVEN"}`);
console.log(`JS errors                 : ${jsErrors.length}`);

await browser.close();
process.exit(0);
