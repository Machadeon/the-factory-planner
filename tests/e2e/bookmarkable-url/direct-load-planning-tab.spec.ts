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

  test("Direct load of /?factory=<slug>#planning opens on the Planning tab", async ({
    page,
  }) => {
    const nameInput = page.getByRole("textbox", { name: "Unnamed Factory" });

    await nameInput.fill("Iron Works");
    await page.keyboard.press("Tab");
    await expect(page.getByLabel(/Save \(unsaved/)).toBeVisible();
    await page.getByLabel(/Save/).click();
    await page.waitForURL(/factory=/);

    await page.getByRole("tab", { name: "Logistics" }).click();
    await expect.poll(() => new URL(page.url()).hash).toBe("#logistics");

    await page.goto("/?factory=iron-works#planning");
    // Wait for factory name to confirm page loaded the correct factory

    await expect(
      page.getByRole("tab", { name: "Planning", selected: true }),
    ).toBeVisible();
    await expect(nameInput).toHaveValue("Iron Works");
    expect(new URL(page.url()).hash).toBe("#planning");
  });
});
