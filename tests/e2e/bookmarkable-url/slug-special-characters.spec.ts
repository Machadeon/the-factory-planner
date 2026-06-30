// spec: plans/bookmarkable-url/
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

  test("Special characters in factory name produce a URL-safe slug", async ({
    page,
  }) => {
    const jsErrors: string[] = [];
    page.on("pageerror", (err) => jsErrors.push(err.message));

    const nameInput = page.getByRole("textbox", { name: "Factory name" });

    // 1. Fill factory name input with "Oil & Gas Processing #1!", press Tab
    await nameInput.fill("Oil & Gas Processing #1!");
    await page.keyboard.press("Tab");

    // 2. Click Save. Wait for URL to contain `factory=`.
    await page.getByLabel(/Save/).click();
    await page.waitForURL(/factory=/);

    // 3. Get `factory` param from URL search params
    const slug = new URL(page.url()).searchParams.get("factory") ?? "";

    // 4. Assert slug matches `/^[a-z0-9-]+$/` — only lowercase letters, digits, hyphens
    expect(slug).toMatch(/^[a-z0-9-]+$/);

    // 5. Assert slug length is greater than 0
    expect(slug.length).toBeGreaterThan(0);

    // 6. Assert no JS errors occurred on the page
    expect(jsErrors).toHaveLength(0);
  });
});
