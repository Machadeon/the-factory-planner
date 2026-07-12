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

  test("Switching tabs uses replaceState and does not add history entries", async ({
    page,
  }) => {
    await fillFactoryName(page, "Test Factory");
    await page.keyboard.press("Tab");
    await page.getByLabel(/Save/).click();
    await page.waitForURL(/factory=/);

    const lengthBefore = await page.evaluate(() => window.history.length);

    await page.getByRole("tab", { name: "Optimization" }).click();
    await expect.poll(() => new URL(page.url()).hash).toBe("#optimization");
    await page.getByRole("tab", { name: "Logistics" }).click();
    await expect.poll(() => new URL(page.url()).hash).toBe("#logistics");
    await page.getByRole("tab", { name: "Planning" }).click();
    await expect.poll(() => new URL(page.url()).hash).toBe("#planning");

    const lengthAfter = await page.evaluate(() => window.history.length);
    expect(lengthAfter).toBe(lengthBefore);
  });
});
