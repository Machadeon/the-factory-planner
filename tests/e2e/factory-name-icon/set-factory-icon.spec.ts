// spec: specs/plan.md
// seed: tests/e2e/seed.spec.ts

import { expect, test } from "@playwright/test";

test.describe("Factory Name and Icon", () => {
  test("Set the factory icon via the icon picker", async ({ page }) => {
    // 1. Navigate to http://localhost:3000 with the seed state applied
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();

    // expect: The page loads with the default factory icon (or no icon) visible in the header
    await expect(page.getByLabel("Set factory icon")).toBeVisible();

    // 2. Click the 'Set factory icon' button (the icon image next to the factory name field)
    await page.getByLabel("Set factory icon").click();

    // expect: An icon picker panel opens showing a grid of all game part icons and a 'Search parts...' text field
    const searchField = page.getByRole("textbox", { name: "Search parts..." });
    await expect(searchField).toBeVisible();

    // 3. Type 'Iron' in the 'Search parts...' text field
    await searchField.fill("Iron");

    // expect: The icon grid filters to show only items whose names contain 'Iron'
    await expect(
      page.getByRole("button", { name: "Iron Plate", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Iron Ingot", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Iron Ore", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Iron Rod", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Iron Rebar", exact: true }),
    ).toBeVisible();

    // 4. Click the 'Iron Plate' icon button
    await page.getByRole("button", { name: "Iron Plate", exact: true }).click();

    // expect: The icon picker closes and the factory header now shows the Iron Plate icon next to the factory name
    await expect(searchField).not.toBeVisible();
    await expect(page.getByRole("img", { name: "Factory icon" })).toBeVisible();
  });
});
