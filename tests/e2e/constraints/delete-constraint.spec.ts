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
  test("Delete constraint removes it from sidebar after Apply", async ({
    page,
  }) => {
    // 1. Seed with Iron Plate factory state
    await seedWithIronPlate(page);

    // 2. Click "Edit constraints", "Add constraint", select Iron Ingot, fill Max rate = 60, click Apply
    await page.locator("text=Edit constraints").click();
    await page.locator("text=Add constraint").click();
    await page.getByRole("option", { name: "Iron Ingot Iron Ingot" }).click();
    await page.getByRole("textbox", { name: "Max rate" }).fill("60");
    await page.getByRole("button", { name: "Apply" }).click();

    // 3. Verify sidebar shows "Constraints (1)"
    await expect(page.getByText("Constraints (1)")).toBeVisible();

    // 4. Click "Edit constraints" again
    await page.locator("text=Edit constraints").click();

    // 5. Click the delete (trash) icon on the Iron Ingot row
    await page
      .locator(".flex.flex-row.items-center.gap-x-2.mb-2 > .cursor-pointer")
      .click();

    // 6. Expect Iron Ingot constraint row disappears; default limits section still visible
    const dialog = page.getByRole("dialog", { name: "Resource Constraints" });
    await expect(
      dialog.getByRole("textbox", { name: "Min rate" }),
    ).not.toBeVisible();
    await expect(
      dialog.getByText("Default limits (add to override):"),
    ).toBeVisible();

    // 7. Click "Apply"
    await page.getByRole("button", { name: "Apply" }).click();

    // 8. Expect sidebar shows "Constraints (0)" and "No constraints set."
    await expect(page.getByText("Constraints (0)")).toBeVisible();
    await expect(
      page.getByText("No constraints set.", { exact: true }),
    ).toBeVisible();
  });
});
