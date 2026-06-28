// spec: plans/ui-three-section-refactor/spec.md (R1, R2)
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

test.describe("Section tabs", () => {
  test("switching tabs keeps the overview sidebar visible", async ({
    page,
  }) => {
    await seedWithIronPlate(page);

    const planningTab = page.getByRole("tab", { name: "Planning" });
    const optimizationTab = page.getByRole("tab", { name: "Optimization" });
    const logisticsTab = page.getByRole("tab", { name: "Logistics" });

    await expect(planningTab).toBeVisible();
    await expect(optimizationTab).toBeVisible();
    await expect(logisticsTab).toBeVisible();

    // Overview sidebar visible on Planning.
    await expect(page.getByText(/Outputs \(/)).toBeVisible();

    await optimizationTab.click();
    await expect(page.getByText("Production Targets")).toBeVisible();
    await expect(page.getByText(/Outputs \(/)).toBeVisible();

    await logisticsTab.click();
    await expect(page.getByText(/Outputs \(/)).toBeVisible();
  });

  test("inactive section content is not present until its tab is active", async ({
    page,
  }) => {
    await seedWithIronPlate(page);

    // On Planning (default), Optimization content is not rendered (live-write
    // means no draft state to preserve, so inactive sections unmount).
    await expect(page.getByText("Production Targets")).toHaveCount(0);

    await page.getByRole("tab", { name: "Optimization" }).click();
    await expect(page.getByText("Production Targets")).toBeVisible();

    await page.getByRole("tab", { name: "Planning" }).click();
    await expect(page.getByText("Production Targets")).toHaveCount(0);
  });
});
