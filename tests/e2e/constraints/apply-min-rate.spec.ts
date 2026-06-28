// spec: plans/ui-three-section-refactor/spec.md (R4, R6b)
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

test.describe("Constraints panel", () => {
  test("constraint with a min rate is saved on the row", async ({ page }) => {
    await seedWithIronPlate(page);
    await page.getByRole("tab", { name: "Optimization" }).click();

    await page.getByText("Add constraint").click();
    await page.getByRole("option", { name: "Iron Ingot Iron Ingot" }).click();
    const minRate = page.getByRole("textbox", { name: "Min rate" });
    await minRate.fill("30");
    await minRate.press("Tab");

    await expect(minRate).toHaveValue("30");
    await expect(
      page.getByRole("img", { name: "Iron Ingot" }).first(),
    ).toBeVisible();
  });
});
