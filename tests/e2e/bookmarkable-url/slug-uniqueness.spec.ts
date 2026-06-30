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

  test("Two factories with the same name get unique slugs", async ({
    page,
  }) => {
    const nameInput = page.getByRole("textbox", { name: "Factory name" });
    const dialog = page.getByRole("dialog");

    await nameInput.fill("Iron Works");
    await page.keyboard.press("Tab");
    await page.getByLabel(/Save/).click();
    await page.waitForURL(/factory=/);
    const slug1 = new URL(page.url()).searchParams.get("factory") ?? "";
    expect(slug1).toBe("iron-works");

    await page.getByLabel("Open factory library").click();
    await expect(dialog).toBeVisible();
    await page.getByLabel("New factory").click();
    await expect(dialog).not.toBeVisible();

    await nameInput.fill("Iron Works");
    await page.keyboard.press("Tab");
    await page.getByLabel(/Save/).click();
    await page.waitForURL(/factory=/);
    const slug2 = new URL(page.url()).searchParams.get("factory") ?? "";

    expect(slug2).toBe("iron-works-2");
    expect(slug2).not.toBe(slug1);
  });
});
