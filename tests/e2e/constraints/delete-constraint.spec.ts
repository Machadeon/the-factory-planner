// spec: plans/ui-three-section-refactor/spec.md (R4, R6b)
// seed: tests/e2e/seed.spec.ts
//
// Live-write: the ✕ button removes the constraint from the model immediately
// (no Apply/Cancel).

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
  test("deleting a constraint removes it immediately", async ({ page }) => {
    await seedWithIronPlate(page);
    await page.getByRole("tab", { name: "Optimization" }).click();

    await page.getByText("Add constraint").click();
    await page.getByRole("option", { name: "Iron Ingot Iron Ingot" }).click();
    const maxRate = page.getByRole("textbox", { name: "Max rate" });
    await maxRate.fill("60");
    await maxRate.press("Tab");
    await expect(maxRate).toHaveValue("60");

    // Remove the row.
    await page.getByRole("button", { name: "Remove constraint" }).click();

    // The editable constraint row is gone; the panel falls back to the
    // read-only default limits + Add constraint affordance.
    await expect(page.getByRole("textbox", { name: "Max rate" })).toHaveCount(
      0,
    );
    await expect(
      page.getByTestId("constraints-panel").getByText("Add constraint"),
    ).toBeVisible();
  });
});
