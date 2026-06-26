// spec: specs/plan.md - Recipe Selection
// seed: tests/e2e/seed.spec.ts

import { expect, test } from "@playwright/test";

test.describe("Recipe Selection", () => {
  test("Select an alternate recipe for a product", async ({ page }) => {
    // 1. Seed, navigate to /
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();

    // 2. Add Iron Plate product
    await page.getByText("Add Product").click();
    await page.getByRole("option", { name: "Iron Plate Iron Plate" }).click();

    // 3. Click 'Alternate: Coated Iron Plate' recipe card from the recipe picker
    await page.getByText("Alternate: Coated Iron Plate").click();

    // expect: assembly line appears using Coated Iron Plate recipe with Assembler building
    await expect(
      page.getByRole("img", { name: "Assembler" }).first(),
    ).toBeVisible();

    // expect: Sidebar shows Iron Plate output
    await expect(page.getByText("Outputs (1)")).toBeVisible();
    await expect(page.getByText("10/min").first()).toBeVisible();

    // expect: Sidebar shows both Iron Ingot and Plastic as inputs
    await expect(page.getByText("Inputs (2)")).toBeVisible();
    await expect(
      page.getByRole("img", { name: "Iron Ingot" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: "Plastic" }).first(),
    ).toBeVisible();
  });
});
