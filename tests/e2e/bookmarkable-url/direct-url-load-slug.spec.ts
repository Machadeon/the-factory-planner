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

  test("?factory=<slug> URL loads the correct factory on direct navigation", async ({
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

    await page.goto("/?factory=iron-works");
    // Wait for factory name to confirm page loaded the correct factory
    await expect(nameInput).toHaveValue("Iron Works");
    expect(new URL(page.url()).searchParams.get("factory")).toBe("iron-works");
    expect(new URL(page.url()).searchParams.get("factoryId")).toBeNull();

    await page.getByLabel("Open factory library").click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Iron Works")).toBeVisible();
    await expect(dialog.getByText("Steel Works")).toBeVisible();
  });
});
