import { expect, test } from "@playwright/test";

test("Change the Factory Output Rate for a production line", async ({
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

  await expect(
    page.getByRole("textbox", { name: "Factory Output Rate" }),
  ).toHaveValue("10");
  await expect(page.getByText("Actual: 10/min")).toBeVisible();

  await page.getByRole("textbox", { name: "Factory Output Rate" }).fill("30");
  await page.keyboard.press("Tab");

  await expect(
    page.getByRole("textbox", { name: "Factory Output Rate" }),
  ).toHaveValue("30");
  await expect(page.getByText("Actual: 30/min")).toBeVisible();
  await expect(page.getByText("30/min").first()).toBeVisible();
  await expect(page.getByText("45/min").first()).toBeVisible();
});
