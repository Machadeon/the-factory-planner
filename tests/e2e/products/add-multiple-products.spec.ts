// spec: Adding and Removing Products
// seed: tests/e2e/seed.spec.ts

import { expect, test } from "@playwright/test";

test.describe("Adding and Removing Products", () => {
  test("Add multiple products to the factory", async ({ page }) => {
    // 1. Navigate to http://localhost:3000 with the seed state applied
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();

    // expect: The main area shows 'add a product to manually select recipes and rates'
    await expect(
      page.getByText("add a product to manually select recipes and rates"),
    ).toBeVisible();

    // 2. Click 'Add Product', type 'Iron Plate', and select 'Iron Plate'
    await page.getByText("Add Product").click();
    await page.getByRole("combobox", { name: "Part" }).fill("Iron Plate");
    await page.getByRole("option", { name: "Iron Plate Iron Plate" }).click();

    // expect: A production line for Iron Plate appears
    await expect(
      page.getByRole("img", { name: "Iron Plate" }).first(),
    ).toBeVisible();
    await expect(page.getByText("Iron Plate").first()).toBeVisible();

    // 3. Click 'Add Product' again, type 'Wire', and select 'Wire'
    await page.getByText("Add Product").click();
    await page.getByRole("combobox", { name: "Part" }).fill("Wire");
    await page.getByRole("option", { name: "Wire Wire" }).click();

    // expect: A second production line for Wire appears below the Iron Plate row
    await expect(page.getByRole("img", { name: "Wire" }).first()).toBeVisible();
    await expect(page.getByText("Wire").first()).toBeVisible();
    // Both production lines are visible simultaneously
    await expect(
      page.getByRole("img", { name: "Iron Plate" }).first(),
    ).toBeVisible();

    // 4. Click 'Add Product' again, type 'Concrete', and select 'Concrete'
    await page.getByText("Add Product").click();
    await page.getByRole("combobox", { name: "Part" }).fill("Concrete");
    await page.getByRole("option", { name: "Concrete Concrete" }).click();

    // expect: A third production line for Concrete appears
    await expect(
      page.getByRole("img", { name: "Concrete" }).first(),
    ).toBeVisible();
    await expect(page.getByText("Concrete").first()).toBeVisible();
    // All three production lines are visible
    await expect(
      page.getByRole("img", { name: "Iron Plate" }).first(),
    ).toBeVisible();
    await expect(page.getByRole("img", { name: "Wire" }).first()).toBeVisible();
  });
});
