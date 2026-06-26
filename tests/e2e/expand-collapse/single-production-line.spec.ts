// spec: Section 7: Expand and Collapse Production Lines
// seed: tests/e2e/seed.spec.ts

import { expect, test } from "@playwright/test";

test.describe("Expand and Collapse Production Lines", () => {
  test("Collapse and expand a single production line", async ({ page }) => {
    // 1. Seed, add Iron Plate, select standard recipe
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();

    await page.getByText("Add Product").click();
    await page.getByRole("option", { name: "Iron Plate Iron Plate" }).click();
    await page.getByText("Iron Plate3x15/min2x10/min").click();

    // expect: production line expanded, assembly line and machine controls visible
    await expect(
      page.getByRole("img", { name: "Constructor" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: "Machine clock speed" }),
    ).toBeVisible();

    // 2. Click the expand/collapse toggle icon on the production line header row
    await page.getByTestId("ExpandMoreIcon").click();

    // expect: production line collapses, assembly details hidden, header row still visible
    await expect(
      page.getByRole("img", { name: "Iron Plate" }).first(),
    ).toBeVisible();
    await expect(page.getByText("Iron Plate").first()).toBeVisible();
    await expect(
      page.getByRole("img", { name: "Constructor" }).first(),
    ).not.toBeVisible();
    await expect(
      page.getByRole("img", { name: "Machine clock speed" }),
    ).not.toBeVisible();

    // 3. Click the collapse icon (ChevronRight) to expand again
    await page.getByTestId("ChevronRightIcon").click();

    // expect: production line expands, assembly details visible again
    await expect(
      page.getByRole("img", { name: "Constructor" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: "Machine clock speed" }),
    ).toBeVisible();
  });
});
