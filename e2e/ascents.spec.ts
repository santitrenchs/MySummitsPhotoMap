import { test, expect } from "@playwright/test";
import { login } from "./helpers";
import path from "path";

test.describe("Create ascent flow", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("opens new ascent modal from nav CTA", async ({ page }) => {
    // The center + button in the bottom tab bar
    await page.getByRole("link", { name: /log|registrar|nueva/i }).first().click();
    // The pick step (photo upload area) should appear
    await expect(page.getByText(/arrastra|drag|selecciona.*foto|select.*photo/i)).toBeVisible();
  });

  test("create ascent — full flow with photo", async ({ page }) => {
    await page.goto("/ascents/new");

    // Step 1: upload a photo
    const testImage = path.join(__dirname, "fixtures", "test-photo.jpg");
    await page.setInputFiles('input[type="file"]', testImage);

    // Step 2: crop modal — click Next/Siguiente
    await page.getByRole("button", { name: /next|siguiente/i }).click();

    // Step 3: form — fill in required fields
    await page.getByPlaceholder(/cima|peak/i).fill("Aneto");
    await page.getByText("Aneto").first().click(); // select from dropdown

    // Date is pre-filled — check it exists
    await expect(page.locator('input[name="date"]')).not.toBeEmpty();

    // Save
    await page.getByRole("button", { name: /guardar|save/i }).click();

    // Should land on the ascent detail or list after saving
    await expect(page).toHaveURL(/\/ascents/);
  });
});

test.describe("Edit ascent flow", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/ascents");
  });

  test("edit modal opens with existing data", async ({ page }) => {
    // Click the ⋮ menu on the first ascent card
    await page.locator('[aria-label="more options"], button:has-text("⋮")').first().click();
    await page.getByRole("menuitem", { name: /editar|edit/i }).click();

    // The edit modal should open showing the form step directly
    await expect(page.locator('input[name="date"]')).toBeVisible();
  });
});

test.describe("Ascents list", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("ascents page loads", async ({ page }) => {
    await page.goto("/ascents");
    await expect(page).toHaveURL(/\/ascents/);
    // Either shows ascent cards or empty state — either way page loads
    await expect(page.locator("body")).not.toBeEmpty();
  });
});
