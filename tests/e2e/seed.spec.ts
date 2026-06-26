import { expect, test } from "@playwright/test";

test("seed", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("sfp:consent", "true");
  });
  await page.reload();

  await expect(page.locator("main")).toBeVisible();
});
