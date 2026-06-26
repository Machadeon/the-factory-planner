// spec: tests/e2e/constraints/constraint-hides-default.spec.ts
// seed: tests/e2e/seed.spec.ts
//
// NOTE: Iron Ore appears in the default limits section because the Iron Ingot Smelter
// recipe includes Iron Ore in factory.allParts(), and Iron Ore has a defaultResourceLimits
// entry. Adding Iron Ore as a constraint moves it from the read-only defaults section
// into an editable constraint row.

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
  test("Adding a constraint removes that part from the default limits list", async ({
    page,
  }) => {
    // 1. Seed with Iron Ingot factory (Smelter: Iron Ore -> Iron Ingot)
    await seedWithIronIngot(page);

    // 2. Click "Edit constraints"
    await page.getByText("Edit constraints").click();

    const dialog = page.getByRole("dialog", { name: "Resource Constraints" });

    // 3. Note Iron Ore appears in "Default limits (add to override):" section
    await expect(
      dialog.getByText("Default limits (add to override):"),
    ).toBeVisible();
    await expect(dialog.getByText("max 92100/min (default)")).toBeVisible();

    // 4. Click "Add constraint" and select Iron Ore (a part from the default limits list)
    await page
      .locator("div")
      .filter({ hasText: /^Add constraint$/ })
      .click();
    await page.getByRole("option", { name: "Iron Ore Iron Ore" }).click();

    // 5. Expect Iron Ore no longer appears in the "Default limits (add to override):" section
    await expect(
      dialog.getByText("Default limits (add to override):"),
    ).not.toBeVisible();
    await expect(dialog.getByText("max 92100/min (default)")).not.toBeVisible();

    // 6. Expect Iron Ore now appears as an editable constraint row with Min/Max rate inputs
    await expect(dialog.getByRole("img", { name: "Iron Ore" })).toBeVisible();
    await expect(
      dialog.getByRole("textbox", { name: "Max rate" }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("textbox", { name: "Min rate" }),
    ).toBeVisible();
  });
});
