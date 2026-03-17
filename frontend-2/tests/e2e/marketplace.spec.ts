import { test, expect } from "@playwright/test";

test.describe("Marketplace", () => {
  test("courses page loads", async ({ page }) => {
    await page.goto("/marketplace/courses");
    await expect(page.getByText("Transformative Courses")).toBeVisible();
  });

  test("workshops page loads", async ({ page }) => {
    await page.goto("/marketplace/workshops");
    await expect(page.getByText("Immersive Workshops")).toBeVisible();
  });

  test("practitioners page loads with listings", async ({ page }) => {
    await page.goto("/marketplace/practitioners");
    await expect(page.getByText("Expert Guides")).toBeVisible();
  });

  test("marketplace main page loads", async ({ page }) => {
    await page.goto("/marketplace");
    await expect(page.getByText("Wellness Marketplace")).toBeVisible();
  });
});
