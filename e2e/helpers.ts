import { type Page } from "@playwright/test";

// Credentials for the E2E test user — set via env vars in CI
export const TEST_EMAIL    = process.env.E2E_EMAIL    ?? "test@aziatlas.com";
export const TEST_PASSWORD = process.env.E2E_PASSWORD ?? "testpassword123";

export async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(TEST_EMAIL);
  await page.getByLabel(/password|contraseña/i).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /sign in|iniciar sesión/i }).click();
  // Wait for redirect to /home after login
  await page.waitForURL(/\/home/);
}
