// spec: specs/plan.md
// seed: tests/e2e/seed.spec.ts

import { expect, test } from "@playwright/test";

test.describe("Factory Name and Icon", () => {
  test("Rename the factory via the header text field", async ({ page }) => {
    // 1. Navigate to http://localhost:3000 with the seed state applied
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();

    const nameField = page.getByRole("textbox", { name: "Unnamed Factory" });

    // expect: The page loads and the factory header shows the placeholder name 'Unnamed Factory' in the name text field
    await expect(nameField).toBeVisible();

    // 2. Click the factory name text field labeled 'Unnamed Factory' in the header
    await nameField.click();

    // expect: The text field becomes focused
    await expect(nameField).toBeFocused();

    // 3. Clear the existing text and type 'Iron Works'
    await nameField.fill("Iron Works");

    // expect: The text field now shows 'Iron Works'
    await expect(nameField).toHaveValue("Iron Works");

    // 4. Press Tab or click elsewhere to confirm
    await page.keyboard.press("Tab");

    // expect: The factory header displays 'Iron Works' as the factory name
    await expect(nameField).toHaveValue("Iron Works");
  });
});
