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

  test("Copying /?factory=slug#logistics and reloading loads correct factory on Logistics tab", async ({
    page,
  }) => {
    const nameInput = page.getByRole("textbox", { name: "Factory name" });

    // 1. Fill factory name "Iron Works", press Tab, click Save, wait for URL factory=iron-works
    await nameInput.fill("Iron Works");
    await page.keyboard.press("Tab");
    await expect(page.getByLabel(/Save \(unsaved/)).toBeVisible();
    await page.locator('[aria-label^="Save"]').click();
    await expect(page).toHaveURL(/factory=iron-works/);

    // 2. Click the "Logistics" tab, wait for URL hash to equal #logistics
    await page.getByRole("tab", { name: "Logistics" }).click();
    await expect.poll(() => new URL(page.url()).hash).toBe("#logistics");

    // 3. Captured URL should be /?factory=iron-works#logistics
    // 4. Perform a FULL PAGE navigation preserving localStorage
    await page.goto("/?factory=iron-works#logistics");

    // 5. Wait for page content to load (no waitForLoadState per best practices)
    // 6. Assert factory name input shows "Iron Works"
    await expect(nameInput).toHaveValue("Iron Works");

    // 7. Assert "Logistics" tab is selected/active
    await expect(
      page.getByRole("tab", { name: "Logistics", selected: true }),
    ).toBeVisible();

    // 8. Assert URL factory param equals iron-works and hash equals #logistics
    const url = new URL(page.url());
    expect(url.searchParams.get("factory")).toBe("iron-works");
    expect(url.hash).toBe("#logistics");
  });
});
