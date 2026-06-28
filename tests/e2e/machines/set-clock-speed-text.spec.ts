import { expect, test } from "@playwright/test";

test("Set clock speed by typing in the percentage field", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("sfp:consent", "true");
  });
  await page.reload();

  await page.getByText("Add Product").click();
  await page.getByRole("option", { name: "Iron Plate Iron Plate" }).click();
  await page.getByText("Iron Plate3x15/min2x10/min").click();

  // Production lines are collapsed by default; expand to access machine controls
  await page.getByTestId("ChevronRightIcon").first().click();

  // Clock speed % textbox is the second unlabeled textbox in the controls
  // DOM order: factory name, output rate, production rate (disabled), machine count, clock speed %
  const clockSpeedField = page.getByRole("textbox").nth(4);
  await expect(clockSpeedField).toHaveValue("100");

  await clockSpeedField.fill("50");
  await page.keyboard.press("Tab");

  await expect(clockSpeedField).toHaveValue("50");
  await expect(page.getByRole("slider").first()).toHaveValue("50");
});
