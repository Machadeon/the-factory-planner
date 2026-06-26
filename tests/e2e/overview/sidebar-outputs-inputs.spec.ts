import { expect, test } from "@playwright/test";

test("Sidebar shows correct outputs and inputs after adding a recipe", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("sfp:consent", "true");
  });
  await page.reload();

  await expect(page.getByText("Outputs (0)")).toBeVisible();
  await expect(page.getByText("Inputs (0)")).toBeVisible();
  await expect(page.getByText("Intermediate Parts (0)")).toBeVisible();
  await expect(page.getByText("0 Power Shards")).toBeVisible();
  await expect(page.getByText("0 Somersloops")).toBeVisible();

  await page.getByText("Add Product").click();
  await page.getByRole("option", { name: "Iron Plate Iron Plate" }).click();
  await page.getByText("Iron Plate3x15/min2x10/min").click();

  // Production lines are collapsed by default; expand to make inner rates visible
  await page.getByTestId("ChevronRightIcon").click();

  await expect(page.getByText("Outputs (1)")).toBeVisible();
  await expect(page.getByText("10/min").first()).toBeVisible();
  await expect(page.getByText("Inputs (1)")).toBeVisible();
  await expect(page.getByText("15/min").first()).toBeVisible();
  await expect(
    page
      .getByText("Power & Modules")
      .locator("..")
      .locator("+ div")
      .getByText(/\d+(\.\d+)? MW/),
  ).toBeVisible();
});
