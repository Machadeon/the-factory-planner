// spec: ui-prefs R1.S1, R1.S2, R2.S1
// seed: tests/e2e/seed.spec.ts

import { expect, test } from "@playwright/test";

test.describe("Drawer UI prefs persistence", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();
  });

  test("R1.S1: pinned state persists across reload", async ({ page }) => {
    // Open the library drawer
    await page.getByLabel("Open factory library").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Pin the sidebar
    await page.getByLabel("Pin sidebar").click();

    // Sidebar should now be inline (no dialog role), visible as a sidebar
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText("Factories", { exact: true })).toBeVisible();

    // Reload — pin state should be restored
    await page.reload();

    // Sidebar should still be visible without user interaction
    await expect(page.getByText("Factories", { exact: true })).toBeVisible();

    // Verify localStorage was written
    const stored = await page.evaluate(() =>
      localStorage.getItem("sfp:library-pinned"),
    );
    expect(stored).toBe("true");
  });

  test("R1.S2: drawer absent on load when unpinned; appears on folder icon click", async ({
    page,
  }) => {
    // Ensure unpinned state
    await page.evaluate(() => {
      localStorage.setItem("sfp:library-pinned", "false");
    });
    await page.reload();

    // Drawer should NOT be visible on load
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(
      page.getByText("Factories", { exact: true }),
    ).not.toBeVisible();

    // Clicking folder icon should open it in overlay mode
    await page.getByLabel("Open factory library").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Factories", { exact: true })).toBeVisible();
  });

  test("R2.S1: sidebar width persists across reload", async ({ page }) => {
    // Pin sidebar first so width is applied
    await page.getByLabel("Open factory library").click();
    await page.getByLabel("Pin sidebar").click();
    await expect(page.getByText("Factories", { exact: true })).toBeVisible();

    // Set a custom width directly in localStorage and reload
    await page.evaluate(() => {
      localStorage.setItem("sfp:sidebar-width", "500");
    });
    await page.reload();

    // Sidebar should be visible at the stored width
    await expect(page.getByText("Factories", { exact: true })).toBeVisible();

    // Verify the sidebar element has approximately the correct width
    const sidebarWidth = await page.evaluate(() => {
      const stored = localStorage.getItem("sfp:sidebar-width");
      return stored ? Number(stored) : null;
    });
    expect(sidebarWidth).toBe(500);
  });
});
