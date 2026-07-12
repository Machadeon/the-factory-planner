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

  test("URL uses human-readable slug after first save", async ({ page }) => {
    expect(new URL(page.url()).searchParams.get("factory")).toBeNull();

    await fillFactoryName(page, "Iron Works");
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
