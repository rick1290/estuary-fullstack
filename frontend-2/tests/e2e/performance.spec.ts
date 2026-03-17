import { test, expect } from "@playwright/test";

test.describe("Performance", () => {
  test("homepage loads within 10 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const loadTime = Date.now() - start;
    expect(loadTime, "Page should load within 10s").toBeLessThan(10_000);
  });

  test("no console errors on homepage", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });
    await page.goto("/");
    await page.waitForTimeout(2000);

    // Filter out known third-party errors
    const criticalErrors = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("third-party")
    );
    expect(
      criticalErrors,
      `Found console errors: ${criticalErrors.join(", ")}`
    ).toHaveLength(0);
  });

  test("no broken resource requests on homepage", async ({ page }) => {
    const failedRequests: string[] = [];
    page.on("response", (response) => {
      if (response.status() >= 400 && !response.url().includes("favicon")) {
        failedRequests.push(`${response.status()} ${response.url()}`);
      }
    });
    await page.goto("/");
    await page.waitForTimeout(2000);
    expect(
      failedRequests,
      `Failed requests: ${failedRequests.join(", ")}`
    ).toHaveLength(0);
  });
});
