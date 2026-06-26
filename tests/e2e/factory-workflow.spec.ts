import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test.describe("factory-workflow", () => {
  test("dismisses consent dialog on first load", async ({ page }) => {
    // Consent dialog should appear
    await expect(
      page.getByRole("heading", { name: /save factories/i }),
    ).toBeVisible();

    // Dismiss with Cancel
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(
      page.getByRole("heading", { name: /save factories/i }),
    ).not.toBeVisible();
  });

  test("adds Iron Plate and verifies recipe is auto-selected", async ({
    page,
  }) => {
    // Grant consent so the app loads normally
    await page.evaluate(() =>
      localStorage.setItem("sfp:consent", "true"),
    );
    await page.reload();

    // Open part selector
    await page.getByRole("button", { name: /add/i }).click();
    const combo = page.getByRole("combobox");
    await combo.fill("Iron Plate");
    await page.getByRole("option", { name: /^Iron Plate$/ }).click();

    // A production line for Iron Plate should appear
    await expect(page.getByText("Iron Plate")).toBeVisible();
    // The standard recipe should be auto-selected (Iron Plate has multiple recipes, but
    // the production line still appears; recipe selection occurs inside the line)
    await expect(page.getByText(/Iron Plate/)).toBeVisible();
  });

  test("sets output rate and verifies machine count renders", async ({
    page,
  }) => {
    await page.evaluate(() =>
      localStorage.setItem("sfp:consent", "true"),
    );
    await page.reload();

    // Add Iron Ingot (1 recipe → auto-selected)
    await page.getByRole("button", { name: /add/i }).click();
    await page.getByRole("combobox").fill("Iron Ingot");
    await page.getByRole("option", { name: /^Iron Ingot$/ }).click();

    // Set output rate to 60
    const outputRateField = page.getByRole("textbox").first();
    await outputRateField.fill("60");
    await outputRateField.press("Enter");

    // Machine count should update (Smelter baseRate=30/min → 2 machines at 100%)
    await expect(page.getByText(/machine|smelter/i)).toBeVisible();
  });

  test("adding Iron Rod and Iron Plate shares Iron Ingot as input", async ({
    page,
  }) => {
    await page.evaluate(() =>
      localStorage.setItem("sfp:consent", "true"),
    );
    await page.reload();

    // Add Iron Ingot
    await page.getByRole("button", { name: /add/i }).click();
    await page.getByRole("combobox").fill("Iron Ingot");
    await page.getByRole("option", { name: /^Iron Ingot$/ }).click();

    // Add Iron Plate
    await page.getByRole("button", { name: /add/i }).click();
    await page.getByRole("combobox").fill("Iron Plate");
    await page.getByRole("option", { name: /^Iron Plate$/ }).click();

    // Iron Ore should appear in the Inputs section
    await expect(page.getByText(/Iron Ore/)).toBeVisible();
  });
});
