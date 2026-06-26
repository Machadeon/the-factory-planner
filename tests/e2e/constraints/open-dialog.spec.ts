// spec: tests/e2e/constraints/constraints-dialog.plan.md
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

test.describe("Constraints Dialog", () => {
  test("Open dialog shows Resource Constraints title", async ({ page }) => {
    // 1. Seed with Iron Plate factory state
    await seedWithIronPlate(page);

    // 2. Click "Edit constraints" button
    await page.getByText("Edit constraints").click();

    // 3. Expect dialog with title "Resource Constraints" is visible
    await expect(
      page.getByRole("dialog", { name: "Resource Constraints" }),
    ).toBeVisible();

    // 4. Expect "Cancel" and "Apply" buttons in dialog
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Apply" })).toBeVisible();

    // 5. Expect empty-state message
    await expect(
      page.getByText(
        "No constraints set. Add a constraint to limit how much of an input or output this factory uses.",
      ),
    ).toBeVisible();
  });
});
