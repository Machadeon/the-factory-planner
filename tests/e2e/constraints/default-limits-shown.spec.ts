// spec: plans/ui-three-section-refactor/spec.md (R4)
// seed: tests/e2e/seed.spec.ts
//
// Iron Ore enters factory.allParts() via the Iron Ingot Smelter recipe and has a
// defaultResourceLimits entry (92100/min), so it shows in the default limits list.

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
  await page.getByText("Iron Ingot1x10/min1x10/min").click();
}

test.describe("Constraints panel", () => {
  test("shows default limits for parts with default resource limits", async ({
    page,
  }) => {
    await seedWithIronIngot(page);
    await page.getByRole("tab", { name: "Optimization" }).click();

    const panel = page.getByTestId("constraints-panel");
    await expect(
      panel.getByText("Default limits (add to override):"),
    ).toBeVisible();
    await expect(panel.getByText("max 92100/min (default)")).toBeVisible();
    await expect(panel.getByRole("img", { name: "Iron Ore" })).toBeVisible();
  });
});
