// spec: plans/ui-three-section-refactor/spec.md (R4, R6b)
// seed: tests/e2e/seed.spec.ts
//
// The recipe optimizer config is now an inline live-write panel in the Optimization
// tab (formerly RecipeOptimizerOptionsDialog). Changes apply immediately (no Apply)
// and persist across a reload.

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

test.describe("Recipe Optimizer panel", () => {
  test("configuring objective and eager persists across reload", async ({
    page,
  }) => {
    await seedWithIronPlate(page);
    await page.getByRole("tab", { name: "Optimization" }).click();

    // Default summary shows the min-resources objective.
    await expect(page.getByText(/Min resources · fill gaps/)).toBeVisible();

    // Switch objective to Minimum power consumption and enable eager — live-write.
    await page
      .getByRole("radio", { name: "Minimum power consumption" })
      .click();
    await page
      .getByRole("switch", { name: "Re-run on every edit (eager)" })
      .check();

    // Summary reflects the new config immediately.
    await expect(page.getByText(/Min power · eager · fill gaps/)).toBeVisible();

    // Persisted across reload.
    await page.reload();
    await page.getByRole("tab", { name: "Optimization" }).click();
    await expect(page.getByText(/Min power · eager · fill gaps/)).toBeVisible();
    await expect(
      page.getByRole("radio", { name: "Minimum power consumption" }),
    ).toBeChecked();
    await expect(
      page.getByRole("switch", { name: "Re-run on every edit (eager)" }),
    ).toBeChecked();
  });

  test("building toggle and available-part rate persist across reload", async ({
    page,
  }) => {
    await seedWithIronPlate(page);
    await page.getByRole("tab", { name: "Optimization" }).click();

    // Disable the Constructor building.
    await page
      .getByRole("switch", { name: "Constructor Constructor" })
      .uncheck();

    // Add an available part (Iron Ingot) with a supply rate.
    await page.getByText("Add available part").click();
    await page.getByRole("option", { name: "Iron Ingot Iron Ingot" }).click();
    const avail = page.getByRole("textbox", { name: "Available /min" });
    await avail.fill("120");
    await avail.press("Tab");

    await page.reload();
    await page.getByRole("tab", { name: "Optimization" }).click();

    await expect(
      page.getByRole("switch", { name: "Constructor Constructor" }),
    ).not.toBeChecked();
    await expect(
      page.getByRole("textbox", { name: "Available /min" }),
    ).toHaveValue("120");
  });
});
