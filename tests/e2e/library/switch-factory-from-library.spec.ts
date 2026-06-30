// spec: Section 9: Factory Library
// seed: tests/e2e/seed.spec.ts

import { expect, test } from "@playwright/test";

test.describe("Factory Library", () => {
  test("Switch to a saved factory from the library", async ({ page }) => {
    // 1. Seed, rename factory to 'Factory A', add Iron Plate, select standard recipe, click Save
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();

    // Rename factory
    const factoryNameInput = page.getByRole("textbox", {
      name: "Factory name",
    });
    await factoryNameInput.clear();
    await factoryNameInput.fill("Factory A");
    await page.keyboard.press("Tab");

    // Add Iron Plate and select recipe
    await page.getByText("Add Product").click();
    await page.getByRole("option", { name: "Iron Plate Iron Plate" }).click();
    await page.getByText("Iron Plate3x15/min2x10/min").click();

    // Save
    await page.getByLabel(/Save/).click();

    // 2. Open library, click 'New factory' — creates empty factory
    await page.getByLabel("Open factory library").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await page.getByLabel("New factory").click();
    await expect(dialog).not.toBeVisible();

    // expect: now on empty factory
    await expect(
      page.getByText("add a product to manually select recipes and rates"),
    ).toBeVisible();

    // 3. Open library again, click 'Factory A'
    await page.getByLabel("Open factory library").click();
    await expect(dialog).toBeVisible();

    await dialog.getByText("Factory A").click();

    // expect: dialog closes, 'Factory A' loads with Iron Plate production line
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText("Iron Plate").first()).toBeVisible();

    // expect: factory name shows 'Factory A'
    await expect(
      page.getByRole("textbox", { name: "Factory name" }),
    ).toHaveValue("Factory A");
  });
});
