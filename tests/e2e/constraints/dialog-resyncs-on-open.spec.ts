// spec: tests/e2e/constraints/dialog-resyncs-on-open.spec.ts
// seed: tests/e2e/seed.spec.ts
//
// NOTE: The ConstraintsDialog re-syncs its local state from factory.constraints
// every time the dialog opens (useEffect on `open`). After Apply, factory.constraints
// is updated. Reopening the dialog should show the saved constraint (Iron Ingot, max 60).

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
  test("Dialog re-syncs state when reopened after Apply", async ({ page }) => {
    // 1. Seed with Iron Plate factory state
    await seedWithIronPlate(page);

    // 2. Click "Edit constraints", add Iron Ingot constraint with Max rate = 60, Apply
    await page.getByText("Edit constraints").click();
    await page
      .locator("div")
      .filter({ hasText: /^Add constraint$/ })
      .click();
    await page.getByRole("option", { name: "Iron Ingot Iron Ingot" }).click();
    await page.getByRole("textbox", { name: "Max rate" }).fill("60");
    await page.getByRole("button", { name: "Apply" }).click();

    // 3. Expect sidebar shows "Constraints (1)"
    await expect(page.getByText("Constraints (1)")).toBeVisible();

    // 4. Click "Edit constraints" again
    await page.getByText("Edit constraints").click();

    const dialog = page.getByRole("dialog", { name: "Resource Constraints" });

    // 5. Expect Iron Ingot constraint row is shown with Max rate = 60
    await expect(dialog.getByRole("img", { name: "Iron Ingot" })).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: "Max rate" })).toHaveValue(
      "60",
    );

    // 6. Expect Min rate field is empty
    await expect(dialog.getByRole("textbox", { name: "Min rate" })).toHaveValue(
      "",
    );

    // 7. Click Cancel
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).not.toBeVisible();
  });
});
