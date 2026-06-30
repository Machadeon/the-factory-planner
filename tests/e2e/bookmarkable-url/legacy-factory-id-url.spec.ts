// spec: bookmarkable URL
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

  test("Legacy ?factoryId=<uuid> URL still loads the factory", async ({
    page,
  }) => {
    const nameInput = page.getByRole("textbox", { name: "Factory name" });

    // 1. Fill factory name "Iron Works", press Tab, click Save, wait for URL to contain factory=
    await nameInput.fill("Iron Works");
    await page.keyboard.press("Tab");
    await page.getByLabel(/Save/).click();
    await page.waitForURL(/factory=/);

    // 2. Read the factory's UUID id from localStorage
    const factoryId = await page.evaluate(() => {
      const lib = JSON.parse(localStorage.getItem("sfp:library") ?? "{}");
      return lib.factories?.[0]?.id ?? null;
    });

    // 3. Assert factoryId is a non-empty string
    expect(factoryId).toBeTruthy();

    // 4. Perform a FULL PAGE navigation via page.goto with the legacy URL format
    await page.goto(`/?factoryId=${factoryId}`);

    // 5. Wait for the factory name to load (confirms page is ready)
    // 6. Assert factory name input shows "Iron Works"
    await expect(nameInput).toHaveValue("Iron Works");

    // 7. Assert URL `factory` param equals `iron-works` (slug form, upgraded from legacy)
    // 8. Assert URL `factoryId` param is null/absent
    const params = new URL(page.url()).searchParams;
    expect(params.get("factory")).toBe("iron-works");
    expect(params.get("factoryId")).toBeNull();
  });
});
