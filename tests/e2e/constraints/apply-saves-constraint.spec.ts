// spec: plans/ui-three-section-refactor/spec.md (R4, R6b)
// seed: tests/e2e/seed.spec.ts
//
// Live-write: editing the panel persists to the model immediately (no Apply) and
// survives a reload via autosave.

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
  test("constraint with max rate persists immediately and across reload", async ({
    page,
  }) => {
    await seedWithIronPlate(page);
    await page.getByRole("tab", { name: "Optimization" }).click();

    await page.getByText("Add constraint").click();
    await page.getByRole("option", { name: "Iron Ingot Iron Ingot" }).click();
    const maxRate = page.getByRole("textbox", { name: "Max rate" });
    await maxRate.fill("60");
    await maxRate.press("Tab");

    await expect(maxRate).toHaveValue("60");
    await expect(
      page.getByRole("img", { name: "Iron Ingot" }).first(),
    ).toBeVisible();

    // Persisted via autosave across reload.
    await page.reload();
    await page.getByRole("tab", { name: "Optimization" }).click();
    await expect(page.getByRole("textbox", { name: "Max rate" })).toHaveValue(
      "60",
    );
  });
});
