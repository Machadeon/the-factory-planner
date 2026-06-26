// spec: Section 7: Expand and Collapse Production Lines
// seed: tests/e2e/seed.spec.ts

import { expect, test } from "@playwright/test";

test.describe("Expand and Collapse Production Lines", () => {
  test("Use 'Expand all' and 'Collapse all' buttons", async ({ page }) => {
    // 1. Seed, add Iron Plate and Wire, each with standard recipes
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();

    // Add Iron Plate
    await page.getByText("Add Product").click();
    await page.getByRole("option", { name: "Iron Plate Iron Plate" }).click();
    await page.getByText("Iron Plate3x15/min2x10/min").click();

    // Add Wire
    await page.getByText("Add Product").click();
    await page.getByRole("option", { name: "Wire Wire" }).click();
    // Select the standard Wire recipe (Constructor)
    await page.getByText("Wire1x5/min2x10/min").click();

    // expect: both production lines expanded
    await expect(
      page.getByRole("img", { name: "Iron Plate" }).first(),
    ).toBeVisible();
    await expect(page.getByRole("img", { name: "Wire" }).first()).toBeVisible();
    // Both should have Constructor assembly lines visible
    const constructorIcons = page.getByRole("img", { name: "Constructor" });
    await expect(constructorIcons.first()).toBeVisible();

    // 2. Click 'Collapse all' button
    await page.getByLabel("Collapse all").click();

    // expect: all production lines collapse, only header rows visible
    await expect(page.getByText("Iron Plate").first()).toBeVisible();
    await expect(page.getByText("Wire").first()).toBeVisible();
    await expect(
      page.getByRole("img", { name: "Constructor" }),
    ).not.toBeVisible();
    await expect(
      page.getByRole("img", { name: "Machine clock speed" }),
    ).not.toBeVisible();

    // 3. Click 'Expand all' button
    await page.getByLabel("Expand all").click();

    // expect: all production lines expand, assembly details visible
    await expect(
      page.getByRole("img", { name: "Constructor" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: "Machine clock speed" }).first(),
    ).toBeVisible();
  });
});
