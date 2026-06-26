import { expect, test } from "@playwright/test";

test("Sidebar shows power consumption after adding a recipe", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("sfp:consent", "true");
  });
  await page.reload();

  await expect(page.getByText("0 MW").first()).toBeVisible();

  await page.getByText("Add Product").click();
  await page.getByRole("option", { name: "Iron Plate Iron Plate" }).click();
  await page.getByText("Iron Plate3x15/min2x10/min").click();

  // Power & Modules section shows non-zero MW
  const powerText = page
    .getByText("Power & Modules")
    .locator("..")
    .getByText(/\d+(\.\d+)? MW/);
  await expect(powerText).toBeVisible();
  const firstPower = Number(
    (await powerText.textContent())?.replace(" MW", ""),
  );
  expect(firstPower).toBeGreaterThan(0);

  // Add Wire with standard recipe — power should increase
  await page.getByText("Add Product").click();
  await page.getByRole("option", { name: "Wire Wire" }).click();
  // Select standard Wire recipe
  await page.getByText("Wire1x5/min2x10/min").click();

  const secondPower = Number(
    (await powerText.textContent())?.replace(" MW", ""),
  );
  expect(secondPower).toBeGreaterThan(firstPower);
});
