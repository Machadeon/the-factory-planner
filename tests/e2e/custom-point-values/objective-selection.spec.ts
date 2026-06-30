import { expect, test } from "@playwright/test";

test.describe("custom point values", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();
  });

  // E4: inputValue objective selectable; LP runs without solver error
  test("inputValue objective runs LP without error", async ({ page }) => {
    await page.getByRole("tab", { name: "Optimization" }).click();
    await page.getByRole("radio", { name: /custom point values/ }).click();

    // Confirm objective selected
    await expect(
      page.getByRole("radio", { name: /custom point values/ }),
    ).toBeChecked();

    // Status bar shows "Min input value"
    await expect(page.getByText("Min input value")).toBeVisible();

    // Add a target and solve (PartSelector autocomplete gets autoFocus on add)
    await page.getByText("Add target").click();
    // Target the MUI Autocomplete input by its accessible name "Part" (not the
    // Phase MUI Select which is also role="combobox" and would be matched last).
    await page.getByRole("combobox", { name: "Part" }).fill("Iron Plate");
    // .first() because the accessible name "Iron Plate Iron Plate" (icon alt +
    // label text) and "Reinforced Iron Plate" both match the substring "Iron Plate".
    await page.getByRole("option", { name: "Iron Plate" }).first().click();

    await page.getByRole("button", { name: /Optimize recipes/i }).click();

    // No solver error displayed
    await expect(page.getByText(/No feasible/)).not.toBeVisible();
  });
});
