import { expect, test } from "@playwright/test";
import { fillFactoryName } from "../helpers";

test.describe("bookmarkable URL", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();
  });

  test("URL hash reflects the active tab", async ({ page }) => {
    // 1. Fill factory name, press Tab, click Save, wait for URL to contain factory=
    await fillFactoryName(page, "Test Factory");
    await page.keyboard.press("Tab");
    await page.getByLabel(/Save/).click();
    await page.waitForURL(/factory=/);

    // 2. Assert URL hash equals #planning (default tab after save)
    expect(new URL(page.url()).hash).toBe("#planning");

    // 3. Click the "Optimization" tab
    await page.getByRole("tab", { name: "Optimization" }).click();

    // 4. Wait/assert URL hash changes to #optimization
    await expect.poll(() => new URL(page.url()).hash).toBe("#optimization");

    // 5. Click the "Logistics" tab
    await page.getByRole("tab", { name: "Logistics" }).click();

    // 6. Wait/assert URL hash changes to #logistics
    await expect.poll(() => new URL(page.url()).hash).toBe("#logistics");

    // 7. Click the "Planning" tab
    await page.getByRole("tab", { name: "Planning" }).click();

    // 8. Wait/assert URL hash changes back to #planning
    await expect.poll(() => new URL(page.url()).hash).toBe("#planning");
  });
});
