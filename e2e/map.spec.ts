import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Map", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("map page loads and shows the canvas", async ({ page }) => {
    await page.goto("/map");
    // maplibre renders a canvas element
    await expect(page.locator("canvas")).toBeVisible({ timeout: 10000 });
  });

  test("filter buttons are visible", async ({ page }) => {
    await page.goto("/map");
    await expect(page.getByRole("button", { name: /all|todos/i }).first()).toBeVisible({ timeout: 8000 });
  });

  test("search box accepts input", async ({ page }) => {
    await page.goto("/map");
    const search = page.getByPlaceholder(/buscar|search/i).first();
    await expect(search).toBeVisible({ timeout: 8000 });
    await search.fill("Aneto");
    // Results dropdown should appear
    await expect(page.getByText("Aneto").first()).toBeVisible({ timeout: 5000 });
  });
});
