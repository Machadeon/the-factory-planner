import { expect, test } from "@playwright/test";

test("Add production line from the inputs section of the sidebar", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("sfp:consent", "true");
  });
  await page.reload();

  await page.getByText("Add Product").click();
  await page.getByRole("option", { name: "Iron Plate Iron Plate" }).click();
  await page.getByText("Iron Plate3x15/min2x10/min").click();

  // Production lines are collapsed by default; expand to make inner rates visible
  await page.getByTestId("ChevronRightIcon").first().click();

  await expect(page.getByText("Inputs (1)")).toBeVisible();
  await expect(page.getByText("15/min").first()).toBeVisible();

  // Click the "Add production line" button next to Iron Ingot in the sidebar Inputs section
  await page
    .getByText("Inputs (1)")
    .locator("..")
    .locator("+ div")
    .getByLabel("Add production line")
    .click();

  // A new production line for Iron Ingot should now appear in the factory
  // (recipe picker is shown for Iron Ingot, sidebar still shows Inputs (1) until a recipe is selected)
  await expect(
    page.getByRole("img", { name: "Iron Ingot" }).first(),
  ).toBeVisible();
  // Iron Ingot production line header is visible
  await expect(page.getByText("Iron Ingot").first()).toBeVisible();
});
