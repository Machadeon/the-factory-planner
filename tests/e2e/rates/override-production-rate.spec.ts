import { expect, test } from "@playwright/test";

test("Override the Production Rate for a production line", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("sfp:consent", "true");
  });
  await page.reload();

  await page.getByText("Add Product").click();
  await page.getByRole("option", { name: "Iron Plate Iron Plate" }).click();
  await page.getByText("Iron Plate3x15/min2x10/min").click();

  await expect(
    page.getByRole("textbox", { name: "Factory Output Rate" }),
  ).toHaveValue("10");
  const productionRateField = page.getByRole("textbox", {
    name: "Production Rate",
  });
  await expect(productionRateField).toHaveValue("10");
  await expect(productionRateField).toBeDisabled();
  const productionRateControls = page
    .getByRole("textbox", { name: "Production Rate" })
    .locator("../../..");
  await expect(
    productionRateControls.getByLabel("Override rate"),
  ).toBeVisible();

  await productionRateControls.getByLabel("Override rate").click();

  await expect(productionRateField).toBeEnabled();
  await expect(
    productionRateControls.getByLabel("Autocalculate rate"),
  ).toBeVisible();

  await productionRateField.fill("20");
  await page.keyboard.press("Enter");

  await expect(productionRateField).toHaveValue("20");
  await expect(page.getByText("Actual: 20/min")).toBeVisible();
  await expect(page.getByText("20/min").first()).toBeVisible();
});
