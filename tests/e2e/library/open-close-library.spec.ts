// spec: Section 9: Factory Library
// seed: tests/e2e/seed.spec.ts

import { expect, test } from "@playwright/test";

test.describe("Factory Library", () => {
  test("Open and close the factory library", async ({ page }) => {
    // 1. Seed
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();

    // 2. Click 'Open factory library' button (folder icon) in toolbar
    await page.getByLabel("Open factory library").click();

    // expect: library dialog opens with 'Factories' heading
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Factories", { exact: true })).toBeVisible();

    // expect: 'New factory', 'New folder', 'Import' buttons visible
    await expect(page.getByLabel("New factory")).toBeVisible();
    await expect(page.getByLabel("New folder")).toBeVisible();
    await expect(page.getByLabel("Import", { exact: true })).toBeVisible();

    // expect: 'Export all' button visible
    await expect(page.getByLabel("Export all factories")).toBeVisible();
    await expect(page.getByText("Export all")).toBeVisible();

    // 3. Press Escape to close dialog
    await page.keyboard.press("Escape");

    // expect: dialog closes, main factory view visible
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByText("add a product to manually select recipes and rates"),
    ).toBeVisible();
  });
});
