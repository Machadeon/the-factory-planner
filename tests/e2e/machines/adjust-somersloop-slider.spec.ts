import { expect, test } from "@playwright/test";

test("Adjust Somersloop slots via the slider", async ({ page }) => {
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
  await page.getByTestId("ChevronRightIcon").click();

  const sloopSlider = page.getByRole("slider").last();
  await expect(sloopSlider).toHaveValue("0");
  await expect(page.getByText("0 Somersloops")).toBeVisible();

  // Step=1; ArrowRight moves +1
  await sloopSlider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(sloopSlider).toHaveValue("1");
  await expect(page.getByText(/[1-9] Somersloops/)).toBeVisible();
});
