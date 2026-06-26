// spec: plan:auto-recipe-ui.md
// seed: tests/e2e/seed.spec.ts
//
// Verifies the recipe optimizer options dialog: changing the objective + eager toggle and
// applying persists to factory.optimizer (reflected in the sidebar summary and
// retained across a reload).

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

test.describe("Recipe Optimizer Options Dialog", () => {
  test("configuring objective and eager persists across reload", async ({
    page,
  }) => {
    await seedWithIronPlate(page);

    // Default summary shows the max-sink-points objective.
    await expect(page.getByText("Max sink points · fill gaps")).toBeVisible();

    // Open the dialog.
    await page.getByText("Configure").click();
    const dialog = page.getByRole("dialog", {
      name: "Recipe Optimizer Options",
    });
    await expect(dialog).toBeVisible();

    // Switch objective to Minimum power consumption and enable eager.
    await dialog
      .getByRole("radio", { name: "Minimum power consumption" })
      .click();
    await dialog
      .getByRole("switch", { name: "Re-run on every edit (eager)" })
      .check();

    await dialog.getByRole("button", { name: "Apply" }).click();
    await expect(dialog).not.toBeVisible();

    // Sidebar summary reflects the new config.
    await expect(page.getByText("Min power · eager · fill gaps")).toBeVisible();

    // Persisted across reload.
    await page.reload();
    await expect(page.getByText("Min power · eager · fill gaps")).toBeVisible();

    // Reopening the dialog shows the retained values.
    await page.getByText("Configure").click();
    const reopened = page.getByRole("dialog", {
      name: "Recipe Optimizer Options",
    });
    await expect(
      reopened.getByRole("radio", { name: "Minimum power consumption" }),
    ).toBeChecked();
    await expect(
      reopened.getByRole("switch", {
        name: "Re-run on every edit (eager)",
      }),
    ).toBeChecked();
  });

  test("building toggle and available-part rate persist across reload", async ({
    page,
  }) => {
    await seedWithIronPlate(page);

    await page.getByText("Configure").click();
    const dialog = page.getByRole("dialog", {
      name: "Recipe Optimizer Options",
    });
    await expect(dialog).toBeVisible();

    // Disable the Constructor building.
    await dialog
      .getByRole("switch", { name: "Constructor Constructor" })
      .uncheck();

    // Add an available part (Iron Ingot) with a supply rate.
    await dialog.getByText("Add available part").click();
    await page.getByRole("option", { name: "Iron Ingot Iron Ingot" }).click();
    await dialog.getByRole("textbox", { name: "Available /min" }).fill("120");

    await dialog.getByRole("button", { name: "Apply" }).click();
    await expect(dialog).not.toBeVisible();

    await page.reload();
    await page.getByText("Configure").click();
    const reopened = page.getByRole("dialog", {
      name: "Recipe Optimizer Options",
    });

    await expect(
      reopened.getByRole("switch", { name: "Constructor Constructor" }),
    ).not.toBeChecked();
    await expect(
      reopened.getByRole("textbox", { name: "Available /min" }),
    ).toHaveValue("120");
  });
});
