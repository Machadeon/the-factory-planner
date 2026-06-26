import { expect, test } from "@playwright/test";

test("Enter a math expression in the Factory Output Rate field", async ({
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

  await page.getByRole("textbox", { name: "Factory Output Rate" }).fill("60*2");
  await page.keyboard.press("Enter");

  await expect(
    page.getByRole("textbox", { name: "Factory Output Rate" }),
  ).toHaveValue("120");
  await expect(page.getByText("Actual: 120/min")).toBeVisible();
  await expect(page.getByText("120/min").first()).toBeVisible();
});
