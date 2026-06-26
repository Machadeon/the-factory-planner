// spec: Section 9: Factory Library
// seed: tests/e2e/seed.spec.ts

import { expect, test } from "@playwright/test";

test.describe("Factory Library", () => {
  test("Access factory actions menu (Rename, Duplicate, Delete)", async ({
    page,
  }) => {
    // 1. Seed, rename to 'Test Factory', add Iron Plate, select standard recipe, click Save
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();

    // Rename factory
    const factoryNameInput = page.getByRole("textbox", {
      name: "Unnamed Factory",
    });
    await factoryNameInput.clear();
    await factoryNameInput.fill("Test Factory");
    await page.keyboard.press("Tab");

    // Add Iron Plate and select recipe
    await page.getByText("Add Product").click();
    await page.getByRole("option", { name: "Iron Plate Iron Plate" }).click();
    await page.getByText("Iron Plate3x15/min2x10/min").click();

    // Save
    await page.getByLabel(/Save/).click();

    // 2. Open library
    await page.getByLabel("Open factory library").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // expect: 'Test Factory' in list
    await expect(dialog.getByText("Test Factory")).toBeVisible();

    // 3. Click 'Actions' button (kebab/more icon) next to 'Test Factory'
    await page.getByLabel("Actions").click();

    // expect: context menu appears with options: Rename, Export, Duplicate, Move to folder, Delete
    await expect(page.getByRole("menuitem", { name: "Rename" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Export" })).toBeVisible();
    await expect(
      page.getByRole("menuitem", { name: "Duplicate" }),
    ).toBeVisible();
    await expect(
      page.getByRole("menuitem", { name: "Move to folder" }),
    ).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Delete" })).toBeVisible();

    // 4. Click 'Duplicate'
    await page.getByRole("menuitem", { name: "Duplicate" }).click();

    // expect: copy appears in library list (e.g. 'Test Factory (copy)')
    await expect(dialog.getByText("Test Factory (copy)")).toBeVisible();

    // Close dialog
    await page.keyboard.press("Escape");
  });
});
