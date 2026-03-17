import { test, expect } from "@playwright/test";

test.describe("SEO & Meta", () => {
  test("homepage has meta description", async ({ page }) => {
    await page.goto("/");
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute("content", /.+/);
  });

  test("homepage has Open Graph tags", async ({ page }) => {
    await page.goto("/");
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute("content", /.+/);
  });

  test("pages return 200 status", async ({ page }) => {
    const routes = [
      "/",
      "/marketplace",
      "/marketplace/courses",
      "/marketplace/workshops",
      "/marketplace/practitioners",
      "/streams",
      "/become-practitioner",
    ];

    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.status(), `${route} should return 200`).toBe(200);
    }
  });
});
