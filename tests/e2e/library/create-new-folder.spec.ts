// spec: Section 9: Factory Library
// seed: tests/e2e/seed.spec.ts

import { expect, test } from "@playwright/test";

test.describe("Factory Library", () => {
  test("Create a new folder in the library", async ({ page }) => {
    // 1. Seed, click 'Open factory library'
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();

    await page.getByLabel("Open factory library").click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // 2. Click 'New folder' button
    await page.getByLabel("New folder").click();

    // expect: new folder entry appears with inline text field pre-filled 'New Folder' and focused
    const folderNameInput = page.getByRole("textbox");
    await expect(folderNameInput).toBeVisible();
    await expect(folderNameInput).toBeFocused();
    await expect(folderNameInput).toHaveValue("New Folder");

    // 3. Clear field, type 'Iron Factories', press Enter
    await folderNameInput.fill("Iron Factories");
    await page.keyboard.press("Enter");

    // expect: folder 'Iron Factories' appears in library list
    await expect(dialog.getByText("Iron Factories")).toBeVisible();

    // Close dialog
    await page.keyboard.press("Escape");
  });
});
