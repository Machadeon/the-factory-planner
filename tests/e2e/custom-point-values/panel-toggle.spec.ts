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

  // E5: "Customize Point Values" button toggles panel open/close
  test("button toggles panel", async ({ page }) => {
    await page.getByRole("tab", { name: "Optimization" }).click();
    await page.getByRole("radio", { name: /custom point values/ }).click();

    const openBtn = page.getByRole("button", {
      name: /Customize Point Values/i,
    });
    await openBtn.click();

    // Panel visible — search box appears
    await expect(page.getByPlaceholder("Search parts…")).toBeVisible();

    const hideBtn = page.getByRole("button", { name: /Hide Values/i });
    await hideBtn.click();

    // Panel hidden — search box gone
    await expect(page.getByPlaceholder("Search parts…")).not.toBeVisible();
  });
});
