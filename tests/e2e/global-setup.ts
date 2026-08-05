import { chromium, type FullConfig } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

function localAuth() {
  try {
    const text = readFileSync(resolve(process.cwd(), ".env.development.local"), "utf8");
    const value = (key: string) => text.match(new RegExp(`^${key}=["']?([^"'\\n]+)`, "m"))?.[1];
    return { email: value("AUTH_EMAIL"), password: value("AUTH_PASSWORD") };
  } catch {
    return {};
  }
}

export default async function globalSetup(config: FullConfig) {
  const local = localAuth();
  const email = process.env.AUTH_EMAIL ?? local.email;
  const password = process.env.AUTH_PASSWORD ?? local.password;
  if (!email || !password) throw new Error("E2E authentication credentials are not configured");

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
