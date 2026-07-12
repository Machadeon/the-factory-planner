// spec: Section 8: Factory Toolbar Actions
// seed: tests/e2e/seed.spec.ts

import { expect, test } from "@playwright/test";
import { fillFactoryName } from "../helpers";

test.describe("Factory Toolbar Actions", () => {
  test("Save the factory manually", async ({ page }) => {
    // 1. Seed, rename factory to 'My Iron Factory', add Iron Plate, select standard recipe
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();

    // Rename factory
    await fillFactoryName(page, "My Iron Factory");
    await page.keyboard.press("Tab");

    // Add Iron Plate and select recipe
    await page.getByText("Add Product").click();
    await page.getByRole("option", { name: "Iron Plate Iron Plate" }).click();
    await page.getByText("Iron Plate3x15/min2x10/min").click();

    // 2. Click 'Save' button in top toolbar
    await page.getByLabel(/Save/).click();

    // expect: factory saved (Save label no longer shows unsaved changes)
    await expect(page.getByLabel("Save", { exact: true })).toBeVisible();

    // 3. Click 'Open factory library' button
    await page.getByLabel("Open factory library").click();

    // expect: library dialog opens showing 'My Iron Factory' in the list
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("My Iron Factory")).toBeVisible();

    // Close dialog
    await page.keyboard.press("Escape");
  });
});
