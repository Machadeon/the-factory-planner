// spec: specs/plan.md - Recipe Selection
// seed: tests/e2e/seed.spec.ts

import { expect, test } from "@playwright/test";

test.describe("Recipe Selection", () => {
  test("Select the standard recipe for a product", async ({ page }) => {
    // 1. Seed, navigate to /
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();

    // 2. Add Iron Plate product
    await page.getByText("Add Product").click();
    await page.getByRole("option", { name: "Iron Plate Iron Plate" }).click();

    // expect: production line shows three recipe cards: 'Iron Plate' (Constructor),
    // 'Alternate: Coated Iron Plate' (Assembler), 'Alternate: Steel Cast Plate' (Foundry)
    await expect(
      page.getByRole("img", { name: "Constructor" }).first(),
    ).toBeVisible();
    await expect(page.getByRole("img", { name: "Assembler" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Foundry" })).toBeVisible();
    await expect(page.getByText("Alternate: Coated Iron Plate")).toBeVisible();
    await expect(page.getByText("Alternate: Steel Cast Plate")).toBeVisible();

    // 3. Click the standard 'Iron Plate' recipe card
    await page.getByText("Iron Plate3x15/min2x10/min").click();

    // Production lines are collapsed by default; expand to access assembly line details
    await page.getByTestId("ChevronRightIcon").first().click();

    // expect: assembly line row appears (Constructor icon, Iron Ingot 15/min → Iron Plate 10/min)
    await expect(
      page.getByRole("img", { name: "Constructor" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: "Iron Ingot" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: "Iron Plate" }).nth(1),
    ).toBeVisible();

    // expect: Recipe picker disappears (no more unselected recipe cards)
    await expect(
      page.getByText("Alternate: Coated Iron Plate"),
    ).not.toBeVisible();
    await expect(
      page.getByText("Alternate: Steel Cast Plate"),
    ).not.toBeVisible();

    // expect: 'Actual: 10/min' shown
    await expect(page.getByText("Actual: 10/min")).toBeVisible();

    // expect: Sidebar: Outputs (1) Iron Plate +10/min, Inputs (1) Iron Ingot -15/min
    await expect(page.getByText("Outputs (1)")).toBeVisible();
    await expect(page.getByText("10/min").first()).toBeVisible();
    await expect(page.getByText("Inputs (1)")).toBeVisible();
    await expect(page.getByText("15/min").first()).toBeVisible();
  });
});
