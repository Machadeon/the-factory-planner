// spec: Section 9: Factory Library
// seed: tests/e2e/seed.spec.ts

import { expect, test } from "@playwright/test";
import { fillFactoryName } from "../helpers";

test.describe("Factory Library", () => {
  test("Delete a factory from the library", async ({ page }) => {
    // 1. Seed, rename to 'Factory To Delete', add Iron Plate, select standard recipe, click Save
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();

    // Rename factory
    await fillFactoryName(page, "Factory To Delete");
    await page.keyboard.press("Tab");

    // Add Iron Plate and select recipe
    await page.getByText("Add Product").click();
    await page.getByRole("option", { name: "Iron Plate Iron Plate" }).click();
    await page.getByText("Iron Plate3x15/min2x10/min").click();

    // Save
    await page.getByLabel(/Save/).click();

    // 2. Open library, click 'Actions' next to 'Factory To Delete', click 'Delete'
    await page.getByLabel("Open factory library").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await expect(dialog.getByText("Factory To Delete")).toBeVisible();

    await page.getByLabel("Actions").click();
    await page.getByRole("menuitem", { name: "Delete" }).click();

    // Confirm deletion in the confirmation dialog
    await page.getByRole("button", { name: "Delete" }).click();

    // expect: factory removed from library list
    await expect(dialog.getByText("Factory To Delete")).not.toBeVisible();

    // Close dialog
    await page.keyboard.press("Escape");
  });
});
