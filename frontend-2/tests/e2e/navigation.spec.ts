import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("navigates to marketplace", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Marketplace" }).first().click();
    await page.waitForURL(/\/marketplace/);
    await expect(page.getByText("Wellness Marketplace")).toBeVisible();
  });

  test("navigates to practitioners page", async ({ page }) => {
    await page.goto("/marketplace/practitioners");
    await expect(page.getByText("Expert Guides")).toBeVisible();
  });

  test("navigates to streams page", async ({ page }) => {
    await page.goto("/streams");
    await expect(page).toHaveURL(/\/streams/);
  });

  test("navigates to become a practitioner page", async ({ page }) => {
    await page.goto("/become-practitioner");
    await expect(page).toHaveURL(/\/become-practitioner/);
  });
});
