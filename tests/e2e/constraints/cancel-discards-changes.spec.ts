// spec: tests/e2e/constraints/constraints-dialog.plan.md
// seed: tests/e2e/seed.spec.ts

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
  test("Cancel discards unsaved constraint additions", async ({ page }) => {
    // 1. Seed with Iron Plate factory state
    await seedWithIronPlate(page);

    // 2. Click "Edit constraints" button
    await page.getByText("Edit constraints").click();

    // 3. Click "Add constraint" inside dialog
    await page.getByText("Add constraint").click();

    // 4. Select "Iron Ingot" from PartSelector (available factory input)
    await page.getByRole("combobox", { name: "Part" }).fill("Iron Ingot");
    await page.getByRole("option", { name: "Iron Ingot Iron Ingot" }).click();

    // 5. Expect Iron Ingot row appears in dialog
    const dialog = page.getByRole("dialog", { name: "Resource Constraints" });
    await expect(dialog.getByRole("img", { name: "Iron Ingot" })).toBeVisible();

    // 6. Click "Cancel"
    await page.getByRole("button", { name: "Cancel" }).click();

    // 7. Expect dialog closes and sidebar shows "Constraints (0)"
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText("Constraints (0)")).toBeVisible();

    // 8. Reopen dialog — expect no Iron Ingot constraint row (it was cancelled),
    //    default limits section shown instead of empty-state message
    await page.getByText("Edit constraints").click();
    await expect(
      page.getByRole("dialog", { name: "Resource Constraints" }),
    ).toBeVisible();
    await expect(
      page.getByText("Default limits (add to override):"),
    ).toBeVisible();
    await expect(
      page
        .getByRole("dialog", { name: "Resource Constraints" })
        .getByRole("textbox", { name: "Min rate" }),
    ).not.toBeVisible();
  });
});
