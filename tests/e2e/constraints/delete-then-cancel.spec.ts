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
  test("Delete then Cancel does not remove constraint", async ({ page }) => {
    // 1. Seed with Iron Plate factory state
    await seedWithIronPlate(page);

    // 2. Click "Edit constraints", Add constraint, select Iron Ingot, fill Max rate = 60, click Apply
    await page.locator("text=Edit constraints").click();
    await page.locator("text=Add constraint").click();
    await page.getByRole("option", { name: "Iron Ingot Iron Ingot" }).click();
    await page.getByRole("textbox", { name: "Max rate" }).fill("60");
    await page.getByRole("button", { name: "Apply" }).click();

    // 3. Verify sidebar shows "Constraints (1)"
    await expect(page.getByText("Constraints (1)")).toBeVisible();

    // 4. Click "Edit constraints" again
    await page.locator("text=Edit constraints").click();

    // 5. Click the delete icon on Iron Ingot row
    await page
      .locator(".flex.flex-row.items-center.gap-x-2.mb-2 > .cursor-pointer")
      .click();

    // 6. Click "Cancel"
    await page.getByRole("button", { name: "Cancel" }).click();

    // 7. Expect sidebar still shows "Constraints (1)" with Iron Ingot "max 60/min"
    await expect(page.getByText("Constraints (1)")).toBeVisible();
    await expect(page.getByText("max 60/min")).toBeVisible();
    // Iron Ingot icon appears in the sidebar constraints section
    await expect(
      page
        .getByText("Constraints (1)")
        .locator("..")
        .locator("+ div")
        .getByRole("img", { name: "Iron Ingot" }),
    ).toBeVisible();
  });
});
