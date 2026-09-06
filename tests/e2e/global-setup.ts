import { chromium, type FullConfig } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

function envValue(file: string, key: string): string | undefined {
  try {
    const text = readFileSync(resolve(process.cwd(), file), "utf8");
    return text.match(new RegExp(`^${key}=["']?([^"'\\n]+)`, "m"))?.[1];
  } catch {
    return undefined;
  }
}

export default async function globalSetup(config: FullConfig) {
  // Prefer the seeded CEO (Auth.js path). Fall back to legacy env creds when
  // LEGACY_AUTH is still on. Both call the same POST /api/auth/callback/credentials
  // endpoint on the server side.
  const email =
    process.env.E2E_CEO_EMAIL ??
    process.env.SEED_ADMIN_EMAIL ??
    envValue(".env.local", "SEED_ADMIN_EMAIL") ??
    envValue(".env.development.local", "AUTH_EMAIL") ??
    process.env.AUTH_EMAIL;
  const password =
    process.env.E2E_CEO_PASSWORD ??
    process.env.SEED_ADMIN_PASSWORD ??
    envValue(".env.local", "SEED_ADMIN_PASSWORD") ??
    envValue(".env.development.local", "AUTH_PASSWORD") ??
    process.env.AUTH_PASSWORD;
  if (!email || !password) throw new Error("E2E auth credentials not configured (SEED_ADMIN_EMAIL / _PASSWORD required)");

  const baseURL = String(config.projects[0].use.baseURL);
  const statePath = resolve(process.cwd(), "test-results/.auth/user.json");
  mkdirSync(dirname(statePath), { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${baseURL}/login`);
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", password);
  await Promise.all([page.waitForURL("**/overview"), page.click("button[type=submit]")]);
  await page.context().storageState({ path: statePath });
  await browser.close();
}
