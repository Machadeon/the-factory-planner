// spec: library-button-visibility R1.S1, R1.S2, R1.S3, R1.S4
// seed: tests/e2e/seed.spec.ts

import { expect, test } from "@playwright/test";

test.describe("Library button visibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();
  });

  test("R1.S1: button absent from DOM when drawer is pinned", async ({
    page,
  }) => {
    await page.evaluate(() => {
      localStorage.setItem("sfp:library-pinned", "true");
    });
    await page.reload();

    await expect(page.getByLabel("Open factory library")).toHaveCount(0);
  });

  test("R1.S2: button present and clickable when drawer is unpinned", async ({
    page,
  }) => {
    const btn = page.getByLabel("Open factory library");
    await expect(btn).toBeVisible();
    await btn.click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("R1.S3: button removed from DOM immediately when user pins", async ({
    page,
  }) => {
    // Open drawer then pin it
    await page.getByLabel("Open factory library").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByLabel("Pin sidebar").click();

    // Button must be gone from DOM — no reload required
    await expect(page.getByLabel("Open factory library")).toHaveCount(0);
  });

  test("R1.S4: button restored in DOM immediately when user unpins", async ({
    page,
  }) => {
    // Start pinned
    await page.evaluate(() => {
      localStorage.setItem("sfp:library-pinned", "true");
    });
    await page.reload();

    // Unpin
    await page.getByLabel("Unpin sidebar").click();

    // Button must reappear — no reload required
    await expect(page.getByLabel("Open factory library")).toBeVisible();
  });
});
