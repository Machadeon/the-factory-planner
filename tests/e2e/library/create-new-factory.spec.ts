// spec: Section 9: Factory Library
// seed: tests/e2e/seed.spec.ts

import { expect, test } from "@playwright/test";

test.describe("Factory Library", () => {
  test("Create a new factory from the library", async ({ page }) => {
    // 1. Seed, add Iron Plate, select standard recipe (make factory non-empty)
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();

    await page.getByText("Add Product").click();
    await page.getByRole("option", { name: "Iron Plate Iron Plate" }).click();
    await page.getByText("Iron Plate3x15/min2x10/min").click();

    await expect(page.getByText("Iron Plate").first()).toBeVisible();

    // 2. Click 'Open factory library', then click 'New factory'
    await page.getByLabel("Open factory library").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await page.getByLabel("New factory").click();

    // expect: dialog closes, main area resets to 'Add a product to get started'
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText("Add a product to get started")).toBeVisible();

    // expect: factory name resets to 'Unnamed Factory'
    await expect(
      page.getByRole("textbox", { name: "Unnamed Factory" }),
    ).toBeVisible();
  });
});
