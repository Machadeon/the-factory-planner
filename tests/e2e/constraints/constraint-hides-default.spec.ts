// spec: plans/ui-three-section-refactor/spec.md (R4, R6b)
// seed: tests/e2e/seed.spec.ts
//
// Adding a part as a constraint moves it from the read-only defaults list into an
// editable constraint row. Live-write: no Apply needed.

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
  test("adding a constraint removes that part from the default limits list", async ({
    page,
  }) => {
    await seedWithIronIngot(page);
    await page.getByRole("tab", { name: "Optimization" }).click();

    const panel = page.getByTestId("constraints-panel");
    await expect(
      panel.getByText("Default limits (add to override):"),
    ).toBeVisible();
    await expect(panel.getByText("max 92100/min (default)")).toBeVisible();

    await panel.getByText("Add constraint").click();
    await page.getByRole("option", { name: "Iron Ore Iron Ore" }).click();

    // Iron Ore leaves the defaults list and becomes an editable row.
    await expect(panel.getByText("max 92100/min (default)")).not.toBeVisible();
    await expect(panel.getByRole("img", { name: "Iron Ore" })).toBeVisible();
    await expect(
      panel.getByRole("textbox", { name: "Max rate" }),
    ).toBeVisible();
    await expect(
      panel.getByRole("textbox", { name: "Min rate" }),
    ).toBeVisible();
  });
});
