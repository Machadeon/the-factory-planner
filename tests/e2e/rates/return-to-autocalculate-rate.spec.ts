import { expect, test } from "@playwright/test";

test("Return to autocalculate after overriding production rate", async ({
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

  const productionRateField = page.getByRole("textbox", {
    name: "Production Rate",
  });
  const productionRateControls = productionRateField.locator("../../..");

  await productionRateControls.getByLabel("Override rate").click();

  await productionRateField.fill("25");
  await page.keyboard.press("Enter");

  await expect(productionRateField).toHaveValue("25");
  await expect(
    productionRateControls.getByLabel("Autocalculate rate"),
  ).toBeVisible();

  await productionRateControls.getByLabel("Autocalculate rate").click();

  await expect(productionRateField).toBeDisabled();
  await expect(
    productionRateControls.getByLabel("Override rate"),
  ).toBeVisible();
});
