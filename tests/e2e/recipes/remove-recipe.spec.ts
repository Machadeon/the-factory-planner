// spec: specs/plan.md - Recipe Selection
// seed: tests/e2e/seed.spec.ts

import { expect, test } from "@playwright/test";

test.describe("Recipe Selection", () => {
  test("Remove a recipe from a production line", async ({ page }) => {
    // 1. Seed, navigate to /
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();

    // 2. Add Iron Plate, select standard recipe, click 'Add Recipe', select 'Alternate: Coated Iron Plate'
    await page.getByText("Add Product").click();
    await page.getByRole("option", { name: "Iron Plate Iron Plate" }).click();
    await page.getByText("Iron Plate3x15/min2x10/min").click();

    // Production lines are collapsed by default; expand to access assembly line details
    await page.getByTestId("ChevronRightIcon").first().click();

    await page.getByText("Add Recipe").click();
    await page.getByText("Alternate: Coated Iron Plate").click();

    // expect: two assembly line rows visible (Constructor and Assembler)
    await expect(
      page.getByRole("img", { name: "Constructor" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: "Assembler" }).first(),
    ).toBeVisible();

    // 3. Click 'Remove recipe' button (trash icon) on the second assembly line (Coated Iron Plate)
    // There are two 'Remove recipe' buttons; click the last one (Coated Iron Plate is second)
    await page.getByLabel("Remove recipe").last().click();

    // expect: Coated Iron Plate row removed, only standard Iron Plate row remains
    await expect(
      page.getByRole("img", { name: "Assembler" }).first(),
    ).not.toBeVisible();
    await expect(
      page.getByRole("img", { name: "Constructor" }).first(),
    ).toBeVisible();

    // expect: 'Actual: 10/min' still shown from the remaining standard recipe
    await expect(page.getByText("Actual: 10/min")).toBeVisible();
  });
});
