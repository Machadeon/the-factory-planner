// spec: tests/e2e/constraints/default-limits-shown.spec.ts
// seed: tests/e2e/seed.spec.ts
//
// NOTE: To get Iron Ore into factory.allParts() (needed for the default limits section),
// we add Iron Ingot as a product with the standard Smelter recipe (Iron Ore → Iron Ingot).
// Iron Ore has an entry in defaultResourceLimits (92100/min), so it appears in the
// "Default limits (add to override):" section of the dialog.

import { expect, type Page, test } from "@playwright/test";

async function seedWithIronIngot(page: Page) {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("sfp:consent", "true");
  });
  await page.reload();
  await page.getByText("Add Product").click();
  await page.getByRole("option", { name: "Iron Ingot Iron Ingot" }).click();
  // Click the Smelter recipe row to select it and open the sidebar
  // (recipe row: 1x Iron Ore → 1x Iron Ingot at current rate)
  await page.getByText("Iron Ingot1x10/min1x10/min").click();
}

test.describe("Constraints Dialog", () => {
  test("Default limits section appears when factory has parts with default resource limits", async ({
    page,
  }) => {
    // 1. Seed with Iron Ingot factory (Smelter recipe: Iron Ore -> Iron Ingot)
    await seedWithIronIngot(page);

    // 2. Click "Edit constraints"
    await page.getByText("Edit constraints").click();

    // 3. Expect "Default limits (add to override):" text is visible
    const dialog = page.getByRole("dialog", { name: "Resource Constraints" });
    await expect(
      dialog.getByText("Default limits (add to override):"),
    ).toBeVisible();

    // 4. Expect at least one read-only part row in the default limits section
    // (rows have no Min/Max rate input fields — just part name and "max X/min (default)" text)
    await expect(dialog.getByText("max 92100/min (default)")).toBeVisible();
    await expect(dialog.getByRole("img", { name: "Iron Ore" })).toBeVisible();
  });
});
