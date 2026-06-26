// spec: Adding and Removing Products
// seed: tests/e2e/seed.spec.ts

import { expect, test } from "@playwright/test";

test.describe("Adding and Removing Products", () => {
  test("Search and select a product using autocomplete filtering", async ({
    page,
  }) => {
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

    // 2. Click 'Add Product'
    await page.getByText("Add Product").click();

    // expect: The Part combobox appears with its dropdown open
    const partCombobox = page.getByRole("combobox", { name: "Part" });
    await expect(partCombobox).toBeVisible();
    await expect(page.getByRole("listbox", { name: "Part" })).toBeVisible();

    // 3. Type 'Rein' in the Part combobox
    await partCombobox.fill("Rein");

    // expect: The dropdown filters to show only 'Reinforced Iron Plate'
    const partListbox = page.getByRole("listbox", { name: "Part" });
    await expect(
      partListbox.getByRole("option", {
        name: "Reinforced Iron Plate Reinforced Iron Plate",
      }),
    ).toBeVisible();
    // Verify no other options are shown (Iron Plate should not appear)
    await expect(
      partListbox.getByRole("option", { name: "Iron Plate Iron Plate" }),
    ).not.toBeVisible();

    // 4. Click 'Reinforced Iron Plate' in the dropdown
    await page
      .getByRole("option", {
        name: "Reinforced Iron Plate Reinforced Iron Plate",
      })
      .click();

    // expect: A production line row for Reinforced Iron Plate appears with the part icon and name
    await expect(
      page.getByRole("img", { name: "Reinforced Iron Plate" }).first(),
    ).toBeVisible();
    await expect(page.getByText("Reinforced Iron Plate").first()).toBeVisible();

    // expect: Recipe options for Reinforced Iron Plate are shown
    await expect(page.getByText("Reinforced Iron Plate").first()).toBeVisible();
  });
});
