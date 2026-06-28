// spec: plans/ui-three-section-refactor/spec.md (R4, R6, R6b)
// seed: tests/e2e/seed.spec.ts
//
// Constraints are now an inline live-write panel inside the Optimization tab,
// not a modal dialog.

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

test.describe("Constraints panel", () => {
  test("renders inline in the Optimization tab (no dialog)", async ({
    page,
  }) => {
    await seedWithIronPlate(page);
    await page.getByRole("tab", { name: "Optimization" }).click();

    await expect(page.getByText("Resource Constraints")).toBeVisible();
    await expect(page.getByText("Add constraint")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
