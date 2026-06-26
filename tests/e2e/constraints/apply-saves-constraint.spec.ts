// spec: tests/e2e/constraints/constraints-dialog.plan.md
// seed: tests/e2e/seed.spec.ts
//
// NOTE: The PartSelector only exposes parts present in factory.allParts(), which
// for an Iron Plate factory (standard recipe) are Iron Ingot and Iron Plate.
// Iron Ore is NOT produced or consumed by any recipe in this factory and therefore
// does not appear in the dropdown. Iron Ingot is used here as the constrained part.

import { expect, type Page, test } from "@playwright/test";

async function seedWithIronPlate(page: Page) {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("sfp:consent", "true");
  });
  await page.reload();
  await page.getByText("Add Product").click();
  await page.getByRole("option", { name: "Iron Plate Iron Plate" }).click();
  await page.getByText("Iron Plate3x15/min2x10/min").click();
}

test.describe("Constraints Dialog", () => {
  test("Apply saves constraint with max rate and updates sidebar", async ({
    page,
  }) => {
    // 1. Seed with Iron Plate factory state
    await seedWithIronPlate(page);

    // 2. Click "Edit constraints" button
    await page.locator("text=Edit constraints").click();

    // 3. Click "Add constraint" inside dialog
    await page.locator("text=Add constraint").click();

    // 4. Select Iron Ingot from PartSelector
    await page.getByRole("option", { name: "Iron Ingot Iron Ingot" }).click();

    // 5. Fill "Max rate" field with "60"
    await page.getByRole("textbox", { name: "Max rate" }).fill("60");

    // 6. Click "Apply"
    await page.getByRole("button", { name: "Apply" }).click();

    // 7. Expect dialog closes
    await expect(
      page.getByRole("dialog", { name: "Resource Constraints" }),
    ).not.toBeVisible();

    // 8. Expect sidebar shows "Constraints (1)"
    await expect(page.getByText("Constraints (1)")).toBeVisible();

    // 9. Expect sidebar shows Iron Ingot entry with text "max 60/min"
    await expect(page.getByText("max 60/min")).toBeVisible();
    await expect(
      page.getByRole("img", { name: "Iron Ingot" }).first(),
    ).toBeVisible();
  });
});
