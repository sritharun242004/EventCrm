import { execSync } from "node:child_process";

const DB_URL =
  "postgresql://neondb_owner:npg_5TYuyMB2bRLK@ep-falling-bird-ax497cc1-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

/**
 * Clean up rows a test created. We identify them ONLY by name prefix — never
 * by code prefix, because code prefixes like "EVT-" would match seeded rows.
 *
 * Convention: every test that inserts an event must set its name to start with "E2E ".
 */
export function purgeE2eEvents() {
  const cmd = `psql "${DB_URL}" -c "DELETE FROM events WHERE name LIKE 'E2E %'"`;
  try {
    execSync(cmd, { stdio: "pipe" });
  } catch {
    // ignore: table may not exist yet, or nothing to delete
  }
}
