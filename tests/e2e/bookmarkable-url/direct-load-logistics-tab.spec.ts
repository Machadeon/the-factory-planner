// spec: bookmarkable URL
// seed: tests/e2e/seed.spec.ts

import { expect, test } from "@playwright/test";

test.describe("bookmarkable URL", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();
  });

  test("Direct load of /?factory=slug#logistics opens on the Logistics tab", async ({
    page,
  }) => {
    const nameInput = page.getByRole("textbox", { name: "Factory name" });

    // 1. Fill factory name input with "Iron Works", press Tab, click Save, wait for URL factory=iron-works
    await nameInput.fill("Iron Works");
    await page.keyboard.press("Tab");
    // Wait for React to commit the name change and enter dirty state before saving
    await expect(page.getByLabel(/Save \(unsaved/)).toBeVisible();
    await page.getByLabel(/Save/).click();
    await expect(page).toHaveURL(/factory=iron-works/);

    // 2. Perform a full page navigation to /?factory=iron-works#logistics (simulates pasting a bookmark)
    await page.goto("/?factory=iron-works#logistics");

    // 3. Assert the "Logistics" tab is selected/active
    await expect(
      page.getByRole("tab", { name: "Logistics", selected: true }),
    ).toBeVisible();

    // 4. Assert factory name input shows "Iron Works"
    await expect(
      page.getByRole("textbox", { name: "Factory name" }),
    ).toHaveValue("Iron Works");

    // 5. Assert URL hash is #logistics
    expect(new URL(page.url()).hash).toBe("#logistics");
  });
});
