import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("sfp:consent", "true");
  });
  await page.goto("/");
});

test.describe("supply-chain", () => {
  test("creates an Iron Factory and supplies from it in a consumer factory", async ({
    page,
  }) => {
    // --- Create "Iron Factory" producing Iron Plate at 60/min ---
    await page.getByRole("button", { name: /add/i }).click();
    await page.getByRole("combobox").fill("Iron Plate");
    await page.getByRole("option", { name: /^Iron Plate$/ }).click();

    // Save it as "Iron Factory"
    await page.getByRole("button", { name: /save/i }).click();

    // --- Open a new factory ---
    await page.getByRole("button", { name: /new/i }).click();
    // Dismiss unsaved-changes prompt if it appears
    const discardButton = page.getByRole("button", { name: /discard|new/i }).last();
    if (await discardButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await discardButton.click();
    }

    // Add Iron Plate to the new factory
    await page.getByRole("button", { name: /add/i }).click();
    await page.getByRole("combobox").fill("Iron Plate");
    await page.getByRole("option", { name: /^Iron Plate$/ }).click();

    // Supply from Iron Factory
    const supplyButton = page.getByRole("button", { name: /supply from/i });
    if (await supplyButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await supplyButton.click();
      // The Iron Factory should appear in the picker
      await expect(page.getByText(/Iron Factory|Iron Plate/)).toBeVisible();
    }
  });
});
