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

  test("Back/forward navigation preserves factory and tab hash", async ({
    page,
  }) => {
    const nameInput = page.getByRole("textbox", { name: "Factory name" });
    const dialog = page.getByRole("dialog");

    await nameInput.fill("Iron Works");
    await page.keyboard.press("Tab");
    await expect(page.getByLabel(/Save \(unsaved/)).toBeVisible();
    await page.getByLabel(/Save/).click();
    await expect(page).toHaveURL(/factory=iron-works/);

    await page.getByLabel("Open factory library").click();
    await expect(dialog).toBeVisible();
    await page.getByLabel("New factory").click();
    await expect(dialog).not.toBeVisible();

    await nameInput.fill("Steel Works");
    await page.keyboard.press("Tab");
    await expect(page.getByLabel(/Save \(unsaved/)).toBeVisible();
    await page.getByLabel(/Save/).click();
    await expect(page).toHaveURL(/factory=steel-works/);

    await page.getByRole("tab", { name: "Logistics" }).click();
    await expect.poll(() => new URL(page.url()).hash).toBe("#logistics");

    await page.getByLabel("Open factory library").click();
    await expect(dialog).toBeVisible();
    await dialog.getByText("Iron Works").click();
    await expect(dialog).not.toBeVisible();
    await expect(page).toHaveURL(/factory=iron-works/);
    await expect(nameInput).toHaveValue("Iron Works");

    // Back → Steel Works on Logistics tab
    await page.goBack();
    await expect(page).toHaveURL(/factory=steel-works/);
    await expect(nameInput).toHaveValue("Steel Works");
    await expect(
      page.getByRole("tab", { name: "Logistics", selected: true }),
    ).toBeVisible();

    // Forward → Iron Works
    await page.goForward();
    await expect(page).toHaveURL(/factory=iron-works/);
    await expect(nameInput).toHaveValue("Iron Works");
  });
});
