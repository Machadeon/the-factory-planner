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

  test("URL uses human-readable slug after first save", async ({ page }) => {
    const nameInput = page.getByRole("textbox", { name: "Factory name" });

    expect(new URL(page.url()).searchParams.get("factory")).toBeNull();

    await nameInput.fill("Iron Works");
    await page.keyboard.press("Tab");
    await expect(page.getByLabel(/Save \(unsaved/)).toBeVisible();
    expect(new URL(page.url()).searchParams.get("factory")).toBeNull();

    await page.getByLabel(/Save/).click();
    await page.waitForURL(/factory=/);

    const params = new URL(page.url()).searchParams;
    expect(params.get("factory")).toBe("iron-works");
    expect(params.get("factoryId")).toBeNull();
    await expect(page.getByLabel(/Save \(unsaved/)).not.toBeVisible();
  });
});
