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

  test("Unknown slug in URL falls back gracefully and URL resets to /", async ({
    page,
  }) => {
    const nameInput = page.getByRole("textbox", { name: "Unnamed Factory" });
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/?factory=nonexistent-slug-xyz");
    await page.waitForLoadState("networkidle");

    await expect(nameInput).toHaveValue("Unnamed Factory");
    await expect
      .poll(() => new URL(page.url()).searchParams.get("factory"))
      .toBeNull();
    expect(errors).toHaveLength(0);
  });
});
