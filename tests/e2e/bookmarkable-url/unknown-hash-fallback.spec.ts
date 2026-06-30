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

  test("Unknown hash value falls back to the default Planning tab", async ({
    page,
  }) => {
    const nameInput = page.getByRole("textbox", { name: "Factory name" });

    await nameInput.fill("Iron Works");
    await page.keyboard.press("Tab");
    await page.getByLabel(/Save/).click();
    await page.waitForURL(/factory=/);

    await page.goto("/?factory=iron-works#nonexistenttab");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("tab", { name: "Planning", selected: true }),
    ).toBeVisible();
    await expect(nameInput).toHaveValue("Iron Works");
  });
});
