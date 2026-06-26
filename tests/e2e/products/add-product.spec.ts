// spec: Adding and Removing Products
// seed: tests/e2e/seed.spec.ts

import { expect, test } from "@playwright/test";

test.describe("Adding and Removing Products", () => {
  test("Add a product via the 'Add Product' button", async ({ page }) => {
    // 1. Navigate to http://localhost:3000 with the seed state applied
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();

    // expect: The main area shows 'Add a product to get started' and an 'Add Product' button
    await expect(page.getByText("Add a product to get started")).toBeVisible();
    await expect(page.getByText("Add Product")).toBeVisible();
    // expect: The overview sidebar shows 'Outputs (0)', 'Inputs (0)', and 'Intermediate Parts (0)'
    await expect(page.getByText("Outputs (0)")).toBeVisible();
    await expect(page.getByText("Inputs (0)")).toBeVisible();
    await expect(page.getByText("Intermediate Parts (0)")).toBeVisible();

    // 2. Click the 'Add Product' button
    await page.getByText("Add Product").click();

    // expect: A Part selector combobox appears with a dropdown listing all available game parts in alphabetical order
    const partCombobox = page.getByRole("combobox", { name: "Part" });
    await expect(partCombobox).toBeVisible();
    const partListbox = page.getByRole("listbox", { name: "Part" });
    await expect(partListbox).toBeVisible();
    // Verify first option is alphabetically first (Adaptive Control Unit)
    await expect(
      partListbox.getByRole("option", { name: /Adaptive Control Unit/ }),
    ).toBeVisible();

    // 3. Type 'Iron Plate' in the Part combobox
    await partCombobox.fill("Iron Plate");

    // expect: The dropdown filters to show 'Iron Plate' and 'Reinforced Iron Plate'
    await expect(
      page.getByRole("option", { name: "Iron Plate Iron Plate" }),
    ).toBeVisible();
    await expect(
      page.getByRole("option", {
        name: "Reinforced Iron Plate Reinforced Iron Plate",
      }),
    ).toBeVisible();

    // 4. Click the 'Iron Plate' option in the dropdown
    await page.getByRole("option", { name: "Iron Plate Iron Plate" }).click();

    // expect: A production line row for Iron Plate appears with a part icon and 'Iron Plate' label
    await expect(
      page.getByRole("img", { name: "Iron Plate" }).first(),
    ).toBeVisible();
    await expect(page.getByText("Iron Plate").first()).toBeVisible();

    // expect: A 'Factory Output Rate' text field (default 10)
    await expect(
      page.getByRole("textbox", { name: "Factory Output Rate" }),
    ).toHaveValue("10");

    // expect: A 'Production Rate' text field (disabled, default 10)
    const productionRateField = page.getByRole("textbox", {
      name: "Production Rate",
    });
    await expect(productionRateField).toHaveValue("10");
    await expect(productionRateField).toBeDisabled();

    // expect: An '/min' label
    await expect(page.getByText("/min", { exact: true })).toBeVisible();

    // expect: An 'Override rate' button
    await expect(page.getByLabel("Override rate")).toBeVisible();

    // expect: An 'Actual: 0/min (-10)' status
    await expect(page.getByText("Actual: 0/min (-10)")).toBeVisible();

    // expect: Available recipe cards below it (Standard, Alternate: Coated Iron Plate, Alternate: Steel Cast Plate)
    await expect(page.getByText("Iron Plate").nth(1)).toBeVisible();
    await expect(page.getByText("Alternate: Coated Iron Plate")).toBeVisible();
    await expect(page.getByText("Alternate: Steel Cast Plate")).toBeVisible();
  });
});
