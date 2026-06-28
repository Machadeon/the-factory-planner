// spec: plans/ui-three-section-refactor/spec.md (R6, AC6)
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

test.describe("Optimization section is modal-free", () => {
  test("constraints and optimizer config are inline, not dialogs", async ({
    page,
  }) => {
    await seedWithIronPlate(page);
    await page.getByRole("tab", { name: "Optimization" }).click();

    // Constraints + optimizer config render inline.
    await expect(page.getByText("Resource Constraints")).toBeVisible();
    await expect(page.getByText(/Recipe Optimizer/)).toBeVisible();

    // No modal dialog open at rest.
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
