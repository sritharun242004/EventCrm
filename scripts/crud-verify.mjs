/**
 * End-to-end verify each new CRUD write against the live app.
 * Cleans up after itself via SQL. Logs pass/fail per action.
 */
import { chromium } from "@playwright/test";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const URL = "https://event.thebotcompany.in";

function dbUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const line = readFileSync(resolve(".env.local"), "utf8")
    .split("\n").find((l) => l.startsWith("DATABASE_URL="));
  return line.slice("DATABASE_URL=".length).replace(/^"|"$/g, "");
}
const DB = dbUrl();
const sql = (q) => execSync(`psql "${DB}" -tAc "${q}"`, { encoding: "utf8" }).trim();

const b = await chromium.launch();
const ctx = await b.newContext();
const p = await ctx.newPage();
p.on("pageerror", (e) => console.log("[pageerror]", e.message));

async function login() {
  await p.goto(`${URL}/login`);
  await p.fill('input[name="email"]', "tarun@gmail.com");
  await p.fill('input[name="password"]', "tarun123");
  await p.click('button[type="submit"]');
  await p.waitForURL(/overview/, { timeout: 15000 });
}

const results = [];
const record = (name, ok, detail) => { results.push({ name, ok, detail }); console.log(`${ok ? "✅" : "❌"} ${name}  ${detail}`); };

await login();
console.log("logged in\n");

// ── Add team member ──────────────────────────────────
{
  const name = `E2E-TM-${Date.now()}`;
  await p.goto(`${URL}/teams`);
  await p.getByRole("button", { name: /Open add member dialog/i }).click();
  await p.fill('input[name="name"]', name);
  await p.selectOption('select[name="teamId"]', { index: 1 });
  await p.locator(".vendor-dialog button[type=submit]").click();
  await p.waitForTimeout(2000);
  const count = Number(sql(`SELECT COUNT(*) FROM team_members WHERE name='${name}'`));
  record("Add team member", count === 1, `db rows=${count}`);
  sql(`DELETE FROM team_members WHERE name='${name}'`);
}

// ── Reassign team member ────────────────────────────
{
  const before = sql(`SELECT team_id FROM team_members WHERE name='Zoya Ahmed'`);
  const currentTeam = Number(before);
  const otherTeam = currentTeam === 1 ? 2 : 1;
  await p.goto(`${URL}/teams`);
  await p.getByRole("button", { name: /Open reassign member dialog/i }).click();
  // Select Zoya Ahmed
  await p.selectOption('select[name="memberId"]', { label: /Zoya Ahmed/ });
  await p.selectOption('select[name="teamId"]', String(otherTeam));
  await p.locator(".vendor-dialog button[type=submit]").click();
  await p.waitForTimeout(2000);
  const after = Number(sql(`SELECT team_id FROM team_members WHERE name='Zoya Ahmed'`));
  record("Reassign team member", after === otherTeam, `team ${currentTeam} → ${after}`);
  sql(`UPDATE team_members SET team_id=${currentTeam} WHERE name='Zoya Ahmed'`);
}

// ── Add note on event brief ─────────────────────────
{
  const noteText = `E2E-NOTE-${Date.now()}`;
  await p.goto(`${URL}/events/EVT-2026-0113`);
  const beforeNote = sql(`SELECT COALESCE(highlight,'') FROM events WHERE code='EVT-2026-0113'`);
  await p.getByRole("button", { name: /^Edit note$|^Add note$/ }).first().click();
  await p.fill('textarea[name="note"]', noteText);
  await p.getByRole("button", { name: /Save note/ }).click();
  await p.waitForTimeout(2000);
  const after = sql(`SELECT highlight FROM events WHERE code='EVT-2026-0113'`);
  record("Add / edit event note", after === noteText, `note now: "${after.slice(0,40)}…"`);
  sql(`UPDATE events SET highlight='${beforeNote.replace(/'/g,"''")}' WHERE code='EVT-2026-0113'`);
}

// ── Add budget line ─────────────────────────────────
{
  const before = Number(sql(`SELECT COUNT(*) FROM budget_lines WHERE event_id=(SELECT id FROM events WHERE code='EVT-2026-0107')`));
  await p.goto(`${URL}/budgets?event=EVT-2026-0107`);
  await p.getByRole("button", { name: /Open add budget line dialog/i }).click();
  await p.selectOption('select[name="category"]', "Photography");
  await p.fill('input[name="plannedInr"]', "125000");
  await p.locator(".vendor-dialog button[type=submit]").click();
  await p.waitForTimeout(2000);
  const after = Number(sql(`SELECT COUNT(*) FROM budget_lines WHERE event_id=(SELECT id FROM events WHERE code='EVT-2026-0107')`));
  record("Add budget line", after === before + 1, `${before} → ${after}`);
  sql(`DELETE FROM budget_lines WHERE event_id=(SELECT id FROM events WHERE code='EVT-2026-0107') AND category='Photography' AND planned_cents=12500000`);
}

// ── Award RFQ ───────────────────────────────────────
{
  const rfqCode = "RFQ-2026-0033"; // "sent" status — safe to award
  const beforeStatus = sql(`SELECT status::text FROM rfqs WHERE code='${rfqCode}'`);
  // Handle browser confirm() dialog
  p.once("dialog", (d) => d.accept());
  await p.goto(`${URL}/rfqs/${rfqCode}`);
  const btn = p.locator('button[aria-label^="Award RFQ to"]').first();
  const hasBtn = await btn.count();
  if (hasBtn === 0) {
    record("Award RFQ", false, "no Award button on the page (no quotes yet)");
  } else {
    await btn.click();
    await p.waitForTimeout(3000);
    const after = sql(`SELECT status::text FROM rfqs WHERE code='${rfqCode}'`);
    const awarded = Number(sql(`SELECT COALESCE(awarded_vendor_id,0) FROM rfqs WHERE code='${rfqCode}'`));
    record("Award RFQ", after === "awarded" && awarded > 0, `${beforeStatus} → ${after}, awarded_vendor_id=${awarded}`);
    // Reset
    sql(`UPDATE rfqs SET status='${beforeStatus}', awarded_vendor_id=NULL WHERE code='${rfqCode}'`);
    sql(`UPDATE rfq_quotes SET status='submitted' WHERE rfq_id=(SELECT id FROM rfqs WHERE code='${rfqCode}') AND status IN ('awarded','declined')`);
  }
}

// ── Add market signal ───────────────────────────────
{
  const uniqName = `E2E-SIG-${Date.now()}`;
  await p.goto(`${URL}/market`);
  await p.getByRole("button", { name: /Open add signal dialog/i }).click();
  await p.fill('input[name="name"]', uniqName);
  await p.fill('input[name="startsOn"]', "2027-05-15");
  await p.locator(".vendor-dialog button[type=submit]").click();
  await p.waitForTimeout(2000);
  const count = Number(sql(`SELECT COUNT(*) FROM market_intel WHERE name='${uniqName}'`));
  record("Add market signal", count === 1, `db rows=${count}`);
  sql(`DELETE FROM market_intel WHERE name='${uniqName}'`);
}

await b.close();

console.log("\n─── SUMMARY ───");
const passed = results.filter((r) => r.ok).length;
console.log(`${passed} / ${results.length} CRUD actions verified on live`);
process.exit(passed === results.length ? 0 : 1);
