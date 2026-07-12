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

  test("Switching factories via the library updates hash to current active tab", async ({
    page,
  }) => {
    const dialog = page.getByRole("dialog");

    await fillFactoryName(page, "Iron Works");
    await page.keyboard.press("Tab");
    await expect(page.getByLabel(/Save \(unsaved/)).toBeVisible();
    await page.getByLabel(/Save/).click();
    await expect(page).toHaveURL(/factory=iron-works/);
    expect(new URL(page.url()).hash).toBe("#planning");

    await page.getByLabel("Open factory library").click();
    await expect(dialog).toBeVisible();
    await page.getByLabel("New factory").click();
    await expect(dialog).not.toBeVisible();

    await fillFactoryName(page, "Steel Works");
    await page.keyboard.press("Tab");
    await expect(page.getByLabel(/Save \(unsaved/)).toBeVisible();
    await page.getByLabel(/Save/).click();
    await expect(page).toHaveURL(/factory=steel-works/);

    await page.getByLabel("Open factory library").click();
    await expect(dialog).toBeVisible();
    await dialog.getByText("Iron Works").click();
    await expect(dialog).not.toBeVisible();
    await expect(page).toHaveURL(/factory=iron-works/);

    const url = new URL(page.url());
    expect(url.searchParams.get("factory")).toBe("iron-works");
    expect(url.hash).toBeTruthy();
  });
});
