import { expect, test } from "@playwright/test";

test("Adjust clock speed via the slider", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("sfp:consent", "true");
  });
  await page.reload();

  await page.getByText("Add Product").click();
  await page.getByRole("option", { name: "Iron Plate Iron Plate" }).click();
  await page.getByText("Iron Plate3x15/min2x10/min").click();

  const clockSlider = page.getByRole("slider").first();
  await expect(clockSlider).toHaveValue("100");
  await expect(page.getByRole("slider").last()).toHaveValue("0");
  await expect(page.getByText("0/machine")).toBeVisible();

  // Marks are [0, 100, 150, 200, 250]; ArrowRight moves to next mark
  await clockSlider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(clockSlider).toHaveValue("150");
  await expect(page.getByText("1/machine")).toBeVisible();

  await page.keyboard.press("ArrowRight");
  await expect(clockSlider).toHaveValue("200");
  await expect(page.getByText("2/machine")).toBeVisible();
});
