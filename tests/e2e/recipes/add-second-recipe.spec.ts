// spec: specs/plan.md - Recipe Selection
// seed: tests/e2e/seed.spec.ts

import { expect, test } from "@playwright/test";

test.describe("Recipe Selection", () => {
  test("Add a second recipe to a production line", async ({ page }) => {
    // 1. Seed, navigate to /
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();

    // 2. Add Iron Plate and select standard Iron Plate recipe
    await page.getByText("Add Product").click();
    await page.getByRole("option", { name: "Iron Plate Iron Plate" }).click();
    await page.getByText("Iron Plate3x15/min2x10/min").click();

    // Production lines are collapsed by default; expand to access assembly line details
    await page.getByTestId("ChevronRightIcon").first().click();

    // expect: assembly line with standard recipe visible
    await expect(
      page.getByRole("img", { name: "Constructor" }).first(),
    ).toBeVisible();

    // expect: 'Add Recipe' button visible below
    await expect(page.getByText("Add Recipe")).toBeVisible();

    // 3. Click 'Add Recipe' button
    await page.getByText("Add Recipe").click();

    // expect: remaining alternate recipe cards appear
    await expect(page.getByText("Alternate: Coated Iron Plate")).toBeVisible();
    await expect(page.getByText("Alternate: Steel Cast Plate")).toBeVisible();

    // 4. Click 'Alternate: Coated Iron Plate'
    await page.getByText("Alternate: Coated Iron Plate").click();

    // expect: second assembly line row appears below the first; both visible
    await expect(
      page.getByRole("img", { name: "Constructor" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: "Assembler" }).first(),
    ).toBeVisible();

    // expect: 'Actual: 10/min' shown (both recipes together produce the target)
    await expect(page.getByText("Actual: 10/min")).toBeVisible();
  });
});
