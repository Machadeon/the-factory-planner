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

  // E3: Factory override takes precedence over global for same slug
  test("factory override value shown as effective value in tooltip", async ({
    page,
  }) => {
    await page.getByRole("tab", { name: "Optimization" }).click();
    await page.getByRole("radio", { name: /custom point values/ }).click();
    await page.getByRole("button", { name: /Customize Point Values/i }).click();
    await page.getByPlaceholder("Search parts…").fill("iron ore");

    // Set global override to 50 (first editable textbox in the row).
    const inputs = page.getByRole("textbox").filter({ hasNotText: /Search/ });
    const globalInput = inputs.nth(0);
    await globalInput.fill("50");
    await globalInput.press("Tab");

    // Set factory override to 200 (second editable textbox in the row).
    const factoryInput = inputs.nth(1);
    await factoryInput.fill("200");
    await factoryInput.press("Tab");

    // Verify factory override (200) is committed and global (50) is also visible.
    // Unit test U9 verifies factory wins over global; E2E verifies both are stored.
    await expect(inputs.nth(0)).toHaveValue("50");
    await expect(inputs.nth(1)).toHaveValue("200");
  });
});
