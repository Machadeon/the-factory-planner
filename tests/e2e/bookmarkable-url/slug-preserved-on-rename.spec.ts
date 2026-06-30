// spec: plans/bookmarkable-url/slug-hash-routing.plan.md
// seed: tests/e2e/seed.spec.ts

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

  test("Renaming a factory does not change its existing slug", async ({
    page,
  }) => {
    const nameInput = page.getByRole("textbox", { name: "Factory name" });

    // 1. Fill factory name input with "Iron Works", press Tab, click Save, wait for URL to contain factory=
    await nameInput.fill("Iron Works");
    await page.keyboard.press("Tab");
    await page.getByLabel(/Save/).click();
    await page.waitForURL(/factory=/);

    // 2. Capture factory URL param as originalSlug; assert it equals iron-works
    const originalSlug = new URL(page.url()).searchParams.get("factory") ?? "";
    expect(originalSlug).toBe("iron-works");

    // 3. Fill factory name input with "Steel Works", press Tab
    await nameInput.fill("Steel Works");
    await page.keyboard.press("Tab");

    // 4. Click Save, wait for URL to stabilize
    await page.getByLabel(/Save/).click();
    await page.waitForURL(/factory=/);

    // 5. Assert factory URL param still equals originalSlug (iron-works) — NOT steel-works
    expect(new URL(page.url()).searchParams.get("factory")).toBe(originalSlug);

    // 6. Reload the page and wait for React to restore the factory URL
    await page.reload();
    await page.waitForURL(/factory=iron-works/);

    // 7. Assert factory URL param still equals iron-works
    expect(new URL(page.url()).searchParams.get("factory")).toBe("iron-works");

    // 8. Assert factory name input shows "Steel Works" (the new name was saved)
    await expect(nameInput).toHaveValue("Steel Works");
  });
});
