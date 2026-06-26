// spec: tests/e2e/constraints/add-constraint-hidden-when-all-constrained.spec.ts
// seed: tests/e2e/seed.spec.ts
//
// NOTE: The Iron Plate factory (standard recipe) has 2 parts in factory.allParts():
// Iron Ingot and Iron Plate. Once both are constrained, the
// "Add constraint" clickable is hidden (allowedSlugs.size <= existingSlugs.length).

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
  test("Add constraint button hidden when all factory parts are constrained", async ({
    page,
  }) => {
    // 1. Seed with Iron Plate factory state
    await seedWithIronPlate(page);

    // 2. Click "Edit constraints"
    await page.getByText("Edit constraints").click();

    const dialog = page.getByRole("dialog", { name: "Resource Constraints" });
    const addConstraintButton = page
      .locator("div")
      .filter({ hasText: /^Add constraint$/ });

    // 3. Add first constraint: Iron Ingot
    await addConstraintButton.click();
    await page.getByRole("option", { name: "Iron Ingot Iron Ingot" }).click();

    // "Add constraint" should still be visible (Iron Plate remains)
    await expect(addConstraintButton).toBeVisible();

    // 4. Add second constraint: Iron Plate
    await addConstraintButton.click();
    await page.getByRole("option", { name: "Iron Plate Iron Plate" }).click();

    // 5. Expect "Add constraint" button is no longer visible (all parts constrained)
    await expect(addConstraintButton).not.toBeVisible();

    // Verify both constraint rows are present
    await expect(dialog.getByRole("img", { name: "Iron Ingot" })).toBeVisible();
    await expect(dialog.getByRole("img", { name: "Iron Plate" })).toBeVisible();
  });
});
