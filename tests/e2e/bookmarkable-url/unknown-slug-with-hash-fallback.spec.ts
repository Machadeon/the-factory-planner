// spec: plans/bookmarkable-url/
// seed: tests/e2e/seed.spec.ts

import { expect, test } from "@playwright/test";

test.describe("bookmarkable URL", () => {
  test("Unknown slug with hash falls back gracefully without errors", async ({
    page,
  }) => {
    // 1. Register a pageerror listener before navigation
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    // Setup: Navigate to /, clear localStorage, set sfp:consent, reload
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();

    // 2. Navigate to unknown slug with a valid hash
    await page.goto("/?factory=ghost-factory#logistics");

    // 3. Wait for page to finish loading (networkidle)
    await expect(page.locator("main")).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "Unnamed Factory" }),
    ).toBeVisible();

    // 4. Assert factory name input shows "Unnamed Factory"
    await expect(
      page.getByRole("textbox", { name: "Unnamed Factory" }),
    ).toHaveValue("Unnamed Factory");

    // 5. Assert URL factory param is null/absent
    await expect
      .poll(() => new URL(page.url()).searchParams.get("factory"))
      .toBeNull();

    // 6. Assert no unhandled JS errors
    expect(errors).toHaveLength(0);
  });
});
