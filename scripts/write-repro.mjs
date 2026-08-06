import { chromium } from "@playwright/test";
const URL = "https://event.thebotcompany.in";
const b = await chromium.launch();
const p = await (await b.newContext()).newPage();

p.on("console", (m) => console.log("[console]", m.type(), m.text()));
p.on("pageerror", (e) => console.log("[pageerror]", e.message));
p.on("response", (r) => { if (r.status() >= 400) console.log("[http]", r.status(), r.url()); });

await p.goto(`${URL}/login`);
await p.fill('input[name="email"]', "tarun@gmail.com");
await p.fill('input[name="password"]', "tarun123");
await p.click('button[type="submit"]');
await p.waitForURL(/overview/, { timeout: 15000 });
console.log("logged in");

await p.goto(`${URL}/calendar/new?date=2027-06-15`);
await p.waitForLoadState("networkidle");
console.log("landed on /calendar/new:", p.url());

const name = `E2E-REPRO-${Date.now()}`;
await p.fill('input[name="name"]', name);
console.log("filled name:", name);

// Click the "Create event" button specifically (avatar-button in topbar is also type=submit)
await p.locator('button.btn.primary', { hasText: /Create event/ }).click();
console.log("clicked Create event");
await p.waitForTimeout(4000);
console.log("URL after submit:", p.url());

// Check toasts
const toasts = await p.locator('.toast').allTextContents();
console.log("toasts on page:", toasts);

await b.close();
