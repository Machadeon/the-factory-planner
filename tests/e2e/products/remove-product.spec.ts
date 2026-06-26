// spec: Adding and Removing Products
// seed: tests/e2e/seed.spec.ts

import { expect, test } from "@playwright/test";

test.describe("Adding and Removing Products", () => {
  test("Remove a product from the factory", async ({ page }) => {
    // 1. Navigate to http://localhost:3000 with the seed state applied
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();

    // expect: The main area shows 'Add a product to get started'
    await expect(page.getByText("Add a product to get started")).toBeVisible();

    // 2. Click 'Add Product', type 'Iron Plate', and select 'Iron Plate' from the dropdown
    await page.getByText("Add Product").click();
    await page.getByRole("combobox", { name: "Part" }).fill("Iron Plate");
    await page.getByRole("option", { name: "Iron Plate Iron Plate" }).click();

    // expect: A production line row for Iron Plate appears
    await expect(
      page.getByRole("img", { name: "Iron Plate" }).first(),
    ).toBeVisible();
    await expect(page.getByText("Iron Plate").first()).toBeVisible();

    // 3. Click the 'Remove product' button (trash icon) at the far right of the Iron Plate production line header
    await page.getByLabel("Remove product").click();

    // expect: The Iron Plate production line is removed and the main area shows 'Add a product to get started' again
    await expect(page.getByText("Add a product to get started")).toBeVisible();
    await expect(page.getByText("Iron Plate")).not.toBeVisible();

    // expect: The overview sidebar resets to 'Outputs (0)', 'Inputs (0)'
    await expect(page.getByText("Outputs (0)")).toBeVisible();
    await expect(page.getByText("Inputs (0)")).toBeVisible();
  });
});
