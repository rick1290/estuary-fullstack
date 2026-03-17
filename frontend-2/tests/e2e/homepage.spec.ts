import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("loads successfully with correct title", async ({ page }) => {
    await expect(page).toHaveTitle(/Wellness Marketplace/);
  });

  test("renders hero section", async ({ page }) => {
    const hero = page.locator("section").first();
    await expect(hero).toBeVisible();
  });

  test("renders main navigation links", async ({ page }) => {
    const nav = page.locator("nav");
    await expect(nav.getByText("Marketplace")).toBeVisible();
    await expect(nav.getByText("Practitioners")).toBeVisible();
    await expect(nav.getByText("Streams")).toBeVisible();
  });

  test("renders homepage sections", async ({ page }) => {
    await expect(
      page.getByText("Featured Practitioners").first()
    ).toBeVisible();
  });

  test("has working Estuary logo link", async ({ page }) => {
    const logo = page.locator('a[href="/"]').first();
    await expect(logo).toBeVisible();
  });
});
