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

  // E2: Global override persists across reload and updates downstream value
  test("global override persists and updates downstream value", async ({
    page,
  }) => {
    await page.getByRole("tab", { name: "Optimization" }).click();
    await page.getByRole("radio", { name: /custom point values/ }).click();
    await page.getByRole("button", { name: /Customize Point Values/i }).click();

    await page.getByPlaceholder("Search parts…").fill("iron ore");

    // Record the default iron ingot value before override.
    await page.getByPlaceholder("Search parts…").fill("iron ingot");

    // Set a global override for iron ore: search it, fill global column.
    await page.getByPlaceholder("Search parts…").fill("iron ore");
    // The Global column input is the 3rd textbox on the page (0=Unnamed Factory,
    // 1=Search parts…, 2=Global override, 3=Factory override).
    const globalInput = page.getByRole("textbox").nth(2);
    await globalInput.fill("999");
    await globalInput.press("Tab"); // commit

    // Reload and verify override persists.
    await page.reload();
    await page.getByRole("tab", { name: "Optimization" }).click();
    await page.getByRole("radio", { name: /custom point values/ }).click();
    await page.getByRole("button", { name: /Customize Point Values/i }).click();
    await page.getByPlaceholder("Search parts…").fill("iron ore");

    // Global input for iron ore should show 999 (DOM property check via toHaveValue).
    await expect(page.getByRole("textbox").nth(2)).toHaveValue("999");

    // Iron ingot effective value must have changed (downstream recompute).
    // The effective value is shown in the tooltip when hovering over the part name.
    await page.getByPlaceholder("Search parts…").fill("iron ingot");
    await page.getByText("Iron Ingot").first().hover();
    await expect(page.getByRole("tooltip")).toContainText("999");
  });
});
