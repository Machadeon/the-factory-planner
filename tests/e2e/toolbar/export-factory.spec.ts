// spec: Section 8: Factory Toolbar Actions
// seed: tests/e2e/seed.spec.ts

import { expect, test } from "@playwright/test";

test.describe("Factory Toolbar Actions", () => {
  test("Export the current factory as a JSON file", async ({ page }) => {
    // 1. Seed, rename factory to 'Export Test', add Iron Plate, select standard recipe
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();

    // Rename factory
    const factoryNameInput = page.getByRole("textbox", {
      name: "Factory name",
    });
    await factoryNameInput.clear();
    await factoryNameInput.fill("Export Test");
    await page.keyboard.press("Tab");

    // Add Iron Plate and select recipe
    await page.getByText("Add Product").click();
    await page.getByRole("option", { name: "Iron Plate Iron Plate" }).click();
    await page.getByText("Iron Plate3x15/min2x10/min").click();

    // 2. Click 'Export current factory' button in top toolbar
    // expect: JSON file download triggered
    const downloadPromise = page.waitForEvent("download");
    await page.getByLabel("Export current factory").click();
    const download = await downloadPromise;

    // expect: the download was triggered with a filename
    expect(download.suggestedFilename()).toMatch(/\.json$/);
  });
});
