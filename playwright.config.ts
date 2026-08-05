import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for Eventbot end-to-end tests.
 *
 * The dev server must be running at BASE_URL before you invoke `pnpm e2e`.
 * We don't spawn it here because the dev process outlives the test run.
 */
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3003";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false, // Sequence dialogue tests + reduce Neon churn
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: BASE_URL,
    storageState: "test-results/.auth/user.json",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    viewport: { width: 1440, height: 900 },
    // Respect the "reduce motion" pattern so animation timing doesn't flake tests.
    // In this Playwright version this lives under contextOptions, not top-level.
    contextOptions: { reducedMotion: "reduce" },
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
