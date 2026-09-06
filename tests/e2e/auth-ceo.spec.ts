import { test, expect } from "@playwright/test";

const CEO_EMAIL = process.env.E2E_CEO_EMAIL ?? process.env.SEED_ADMIN_EMAIL!;
const CEO_PASSWORD = process.env.E2E_CEO_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD!;

test("unauthenticated request to /overview redirects to /login with returnTo", async ({ page }) => {
  await page.goto("/overview");
  await expect(page).toHaveURL(/\/login\?returnTo=%2Foverview/);
});

test("seeded CEO signs in and reaches /overview", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(CEO_EMAIL);
  await page.getByLabel(/password/i).fill(CEO_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/overview/);
});

test("unauthenticated request to /rfqs redirects to /login", async ({ page }) => {
  await page.goto("/rfqs");
  await expect(page).toHaveURL(/\/login/);
});
