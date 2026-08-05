import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Resolve the Neon URL from the environment. In CI we get it from a GitHub
 * secret; in local dev we fall back to reading .env.local. We never commit
 * the URL in this file — public repos get scraped for secrets in minutes.
 */
function resolveDbUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const envPath = resolve(__dirname, "..", "..", ".env.local");
    const line = readFileSync(envPath, "utf8")
      .split("\n")
      .find((l) => l.startsWith("DATABASE_URL="));
    if (line) return line.slice("DATABASE_URL=".length).replace(/^"|"$/g, "");
  } catch {}
  throw new Error("DATABASE_URL is not set. Export it or provide .env.local.");
}

/**
 * Clean up rows a test created. We identify them ONLY by name prefix — never
 * by code prefix, because code prefixes like "EVT-" would match seeded rows.
 *
 * Convention: every test that inserts an event must set its name to start with "E2E ".
 */
export function purgeE2eEvents() {
  const dbUrl = resolveDbUrl();
  const cmd = `psql "${dbUrl}" -c "DELETE FROM events WHERE name LIKE 'E2E %'"`;
  try {
    execSync(cmd, { stdio: "pipe" });
  } catch {
    // ignore: table may not exist yet, or nothing to delete
  }
}
