// spec: Section 8: Factory Toolbar Actions
// seed: tests/e2e/seed.spec.ts

import { expect, test } from "@playwright/test";

test.describe("Factory Toolbar Actions", () => {
  test("Clear the factory", async ({ page }) => {
    // 1. Seed, add Iron Plate, select standard recipe
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();

    await page.getByText("Add Product").click();
    await page.getByRole("option", { name: "Iron Plate Iron Plate" }).click();
    await page.getByText("Iron Plate3x15/min2x10/min").click();

    await expect(page.getByText("Iron Plate").first()).toBeVisible();

    // 2. Click 'Clear factory' button (trash icon) in top toolbar
    await page.getByLabel("Clear factory").click();

    // expect: factory cleared, main area shows 'Add a product to get started'
    await expect(page.getByText("Add a product to get started")).toBeVisible();
    // expect: sidebar resets to Outputs (0), Inputs (0)
    await expect(page.getByText("Outputs (0)")).toBeVisible();
    await expect(page.getByText("Inputs (0)")).toBeVisible();
  });

  test("Show confirmation dialog when clearing factory with unsaved changes", async ({
    page,
  }) => {
    // 1. Initialize and disable autosave
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();

    // Disable autosave to allow unsaved changes
    const autosaveSwitch = page.getByLabel("Autosave on");
    await autosaveSwitch.click();
    await expect(page.getByLabel("Autosave off")).toBeVisible();

    // 2. Add a product (creates unsaved changes)
    await page.getByText("Add Product").click();
    await page.getByRole("option", { name: "Iron Plate Iron Plate" }).click();

    // expect: Iron Plate appears and save button shows unsaved indicator
    await expect(page.getByText("Iron Plate").first()).toBeVisible();
    await expect(page.getByLabel("Save (unsaved changes)")).toBeVisible();

    // 3. Click 'Clear factory' button with unsaved changes
    await page.getByLabel("Clear factory").click();

    // expect: Confirmation dialog appears with title "Clear factory?"
    const dialog = page.getByRole("dialog", { name: "Clear factory?" });
    await expect(dialog).toBeVisible();
    await expect(
      page.getByText(
        "You have unsaved changes in the current factory. What would you like to do?",
      ),
    ).toBeVisible();

    // expect: Dialog has three buttons: Cancel, Discard & clear, Save & clear
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Discard & clear" }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Save & clear" }),
    ).toBeVisible();
  });

  test("Cancel button keeps unsaved factory", async ({ page }) => {
    // 1. Setup: disable autosave and add a product
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();

    await page.getByLabel("Autosave on").click();
    await page.getByText("Add Product").click();
    await page.getByRole("option", { name: "Iron Plate Iron Plate" }).click();

    // 2. Click clear factory and then click Cancel
    await page.getByLabel("Clear factory").click();
    await page
      .getByRole("dialog", { name: "Clear factory?" })
      .getByRole("button", { name: "Cancel" })
      .click();

    // expect: Dialog closes, factory still has Iron Plate product
    await expect(
      page.getByRole("dialog", { name: "Clear factory?" }),
    ).not.toBeVisible();
    await expect(page.getByText("Iron Plate").first()).toBeVisible();
    // expect: Unsaved changes indicator still visible
    await expect(page.getByLabel("Save (unsaved changes)")).toBeVisible();
  });

  test("Discard & clear button clears factory without saving", async ({
    page,
  }) => {
    // 1. Setup: disable autosave and add a product
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();

    await page.getByLabel("Autosave on").click();
    await page.getByText("Add Product").click();
    await page.getByRole("option", { name: "Iron Plate Iron Plate" }).click();
    await expect(page.getByText("Iron Plate").first()).toBeVisible();

    // 2. Click clear factory and then click Discard & clear
    await page.getByLabel("Clear factory").click();
    await page
      .getByRole("dialog", { name: "Clear factory?" })
      .getByRole("button", { name: "Discard & clear" })
      .click();

    // expect: Dialog closes, factory is cleared
    await expect(
      page.getByRole("dialog", { name: "Clear factory?" }),
    ).not.toBeVisible();
    await expect(page.getByText("Add a product to get started")).toBeVisible();
    // expect: Outputs and Inputs reset
    await expect(page.getByText("Outputs (0)")).toBeVisible();
    await expect(page.getByText("Inputs (0)")).toBeVisible();
  });

  test("Save & clear button saves and then clears factory", async ({
    page,
  }) => {
    // 1. Setup: disable autosave and add a product
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();

    await page.getByLabel("Autosave on").click();
    await page.getByText("Add Product").click();
    await page.getByRole("option", { name: "Iron Plate Iron Plate" }).click();
    await expect(page.getByText("Iron Plate").first()).toBeVisible();

    // Get the initial localStorage to verify factory was saved
    const initialState = await page.evaluate(() => {
      const lib = localStorage.getItem("sfp:library");
      return lib ? JSON.parse(lib) : null;
    });

    // 2. Click clear factory and then click Save & clear
    await page.getByLabel("Clear factory").click();
    await page
      .getByRole("dialog", { name: "Clear factory?" })
      .getByRole("button", { name: "Save & clear" })
      .click();

    // expect: Dialog closes, factory is cleared
    await expect(
      page.getByRole("dialog", { name: "Clear factory?" }),
    ).not.toBeVisible();
    await expect(page.getByText("Add a product to get started")).toBeVisible();
    // expect: Outputs and Inputs reset
    await expect(page.getByText("Outputs (0)")).toBeVisible();
    await expect(page.getByText("Inputs (0)")).toBeVisible();

    // expect: Factory was saved (library now has factories)
    const savedState = await page.evaluate(() => {
      const lib = localStorage.getItem("sfp:library");
      return lib ? JSON.parse(lib) : null;
    });
    expect(savedState?.factories?.length || 0).toBeGreaterThan(
      initialState?.factories?.length || 0,
    );
  });
});
