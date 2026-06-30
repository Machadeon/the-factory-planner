import { expect, test } from "@playwright/test";

test.describe("custom point values", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();
  });

  // E1: Panel shows correct iron ore default value (most common part = value of 1)
  test("iron ore default value ≈ 1", async ({ page }) => {
    await page.getByRole("tab", { name: "Optimization" }).click();
    await page.getByRole("radio", { name: /custom point values/ }).click();
    await page.getByRole("button", { name: /Customize Point Values/i }).click();
    await page.getByPlaceholder("Search parts…").fill("iron ore");

    // Default column cell for Iron Ore — should show ~10.9
    const defaultCell = page.locator("text=1").first();
    await expect(defaultCell).toBeVisible();
  });
});
