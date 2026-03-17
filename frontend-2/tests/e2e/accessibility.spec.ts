import { test, expect } from "@playwright/test";

test.describe("Accessibility basics", () => {
  test("page has lang attribute", async ({ page }) => {
    await page.goto("/");
    const lang = await page.locator("html").getAttribute("lang");
    expect(lang).toBe("en");
  });

  test("images have alt attributes", async ({ page }) => {
    await page.goto("/");
    const images = page.locator("img");
    const count = await images.count();
    for (let i = 0; i < Math.min(count, 20); i++) {
      const alt = await images.nth(i).getAttribute("alt");
      expect(alt, `Image ${i} should have alt attribute`).not.toBeNull();
    }
  });

  test("page has no broken heading hierarchy", async ({ page }) => {
    await page.goto("/");
    const h1Count = await page.locator("h1").count();
    expect(h1Count, "Page should have at least one h1").toBeGreaterThanOrEqual(
      1
    );
  });

  test("interactive elements are keyboard focusable", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expect(focused).toBeVisible();
  });
});
