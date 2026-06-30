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

  test("Browser back button loads the previously viewed factory", async ({
    page,
  }) => {
    const nameInput = page.getByRole("textbox", { name: "Unnamed Factory" });
    const dialog = page.getByRole("dialog");

    // Save "Factory A", capture slugA
    await nameInput.fill("Factory A");
    await page.keyboard.press("Tab");
    await page.getByLabel(/Save/).click();
    await page.waitForURL(/factory=/);
    const slugA = new URL(page.url()).searchParams.get("factory") ?? "";

    // Open library → New factory → Save "Factory B" → capture slugB
    await page.getByLabel("Open factory library").click();
    await expect(dialog).toBeVisible();
    await page.getByLabel("New factory").click();
    await expect(dialog).not.toBeVisible();

    await nameInput.fill("Factory B");
    await page.keyboard.press("Tab");
    await page.getByLabel(/Save/).click();
    await page.waitForURL(/factory=/);
    const slugB = new URL(page.url()).searchParams.get("factory") ?? "";

    // Open library, click "Factory A"; URL = /?factory=<slugA>, name = "Factory A"
    await page.getByLabel("Open factory library").click();
    await expect(dialog).toBeVisible();
    await dialog.getByText("Factory A").click();
    await expect(dialog).not.toBeVisible();
    await expect(nameInput).toHaveValue("Factory A");
    await page.waitForURL(new RegExp(`factory=${slugA}`));

    // Browser back → URL contains slugB, name = "Factory B"
    await page.goBack();
    await page.waitForURL(new RegExp(`factory=${slugB}`));
    expect(page.url()).toContain(slugB);
    await expect(nameInput).toHaveValue("Factory B");

    // Browser forward → URL contains slugA, name = "Factory A"
    await page.goForward();
    await page.waitForURL(new RegExp(`factory=${slugA}`));
    expect(page.url()).toContain(slugA);
    await expect(nameInput).toHaveValue("Factory A");
  });
});
