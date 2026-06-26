// spec: Section 8: Factory Toolbar Actions
// seed: tests/e2e/seed.spec.ts

import { expect, test } from "@playwright/test";

test.describe("Factory Toolbar Actions", () => {
  test("View factory JSON dialog", async ({ page }) => {
    // 1. Seed, add Iron Plate, select standard recipe
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();

    await page.getByText("Add Product").click();
    await page.getByRole("option", { name: "Iron Plate Iron Plate" }).click();
    await page.getByText("Iron Plate3x15/min2x10/min").click();

    // 2. Click 'View factory JSON' button in top toolbar
    await page.getByLabel("View factory JSON").click();

    // expect: dialog opens titled 'Factory JSON' with 'Copy to clipboard' button
    const dialog = page.getByRole("dialog", { name: /Factory JSON/ });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Copy to clipboard" }),
    ).toBeVisible();

    // expect: scrollable text area showing JSON with schemaVersion, id, name, productionLines
    const jsonText = dialog.getByText(/"schemaVersion"/);
    await expect(jsonText).toBeVisible();
    await expect(dialog.getByText(/"productionLines"/)).toBeVisible();
    await expect(dialog.getByText(/"name"/)).toBeVisible();

    // 3. Click 'Copy to clipboard'
    await dialog.getByRole("button", { name: "Copy to clipboard" }).click();

    // expect: button responds (clipboard API invoked - no error thrown)
    await expect(dialog).toBeVisible();

    // 4. Click 'Close'
    await page.getByRole("button", { name: "Close" }).click();

    // expect: dialog closes, factory unchanged
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText("Iron Plate").first()).toBeVisible();
  });
});
