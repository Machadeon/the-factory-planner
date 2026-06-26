import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("sfp:consent", "true");
  });
  await page.goto("/");
});

test.describe("factory-library", () => {
  test("saves a factory and finds it in the library drawer", async ({
    page,
  }) => {
    // Set a factory name
    const nameField = page.getByRole("textbox", { name: /factory name/i });
    if (await nameField.isVisible()) {
      await nameField.fill("Iron Works");
    }

    // Save the factory
    await page.getByRole("button", { name: /save/i }).click();

    // Open the library drawer
    await page.getByRole("button", { name: /library/i }).click();

    // The saved factory should appear in the drawer
    await expect(page.getByText(/Iron Works/)).toBeVisible();
  });

  test("opens a new factory after saving and can reload the saved one", async ({
    page,
  }) => {
    // Add a part and save
    await page.getByRole("button", { name: /add/i }).click();
    await page.getByRole("combobox").fill("Iron Plate");
    await page.getByRole("option", { name: /^Iron Plate$/ }).click();
    await page.getByRole("button", { name: /save/i }).click();

    // Open library and load back
    await page.getByRole("button", { name: /library/i }).click();
    const factoryEntry = page.getByText(/Iron Plate/).first();
    await factoryEntry.click();

    // Production line for Iron Plate should be visible
    await expect(page.getByText("Iron Plate")).toBeVisible();
  });
});
