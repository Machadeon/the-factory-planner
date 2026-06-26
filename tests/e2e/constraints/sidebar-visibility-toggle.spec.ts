// spec: tests/e2e/constraints/sidebar-visibility-toggle.spec.ts
// seed: tests/e2e/seed.spec.ts

import { expect, type Page, test } from "@playwright/test";

async function seedWithIronPlate(page: Page) {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("sfp:consent", "true");
  });
  await page.reload();
  await page.getByText("Add Product").click();
  await page.getByRole("option", { name: "Iron Plate Iron Plate" }).click();
  await page.getByText("Iron Plate3x15/min2x10/min").click();
}

test.describe("Constraints Dialog", () => {
  test("Constraints section visibility toggle in sidebar", async ({ page }) => {
    // 1. Seed with Iron Plate factory state
    await seedWithIronPlate(page);

    // 2. Find the "Constraints (0)" header and verify content wrapper is visible
    const constraintsHeader = page.getByText("Constraints (0)").locator("..");
    const constraintsWrapper = constraintsHeader.locator("+ div");
    await expect(constraintsWrapper).toHaveCSS("content-visibility", "visible");

    // 3. Click the visibility icon button next to "Constraints (0)"
    await constraintsHeader.getByTestId("VisibilityOffIcon").click();

    // 4. Expect content wrapper has contentVisibility: hidden
    await expect(constraintsWrapper).toHaveCSS("content-visibility", "hidden");

    // 5. Click the icon again to re-show
    await constraintsHeader.getByTestId("VisibilityIcon").click();

    // 6. Expect content wrapper has contentVisibility: visible
    await expect(constraintsWrapper).toHaveCSS("content-visibility", "visible");
  });
});
