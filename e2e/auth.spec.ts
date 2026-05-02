import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Authentication", () => {
  test("login redirects to /home", async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/home/);
  });

  test("invalid credentials shows error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("nobody@example.com");
    await page.getByLabel(/password|contraseña/i).fill("wrongpassword");
    await page.getByRole("button", { name: /sign in|iniciar sesión/i }).click();
    await expect(page.getByText(/invalid|incorrecto|credenciales/i)).toBeVisible();
  });

  test("unauthenticated visit to /home redirects to /login", async ({ page }) => {
    await page.goto("/home");
    await expect(page).toHaveURL(/\/login/);
  });
});
