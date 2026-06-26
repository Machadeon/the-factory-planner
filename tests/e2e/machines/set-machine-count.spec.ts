import { expect, test } from "@playwright/test";

test("Set machine count by typing in the machine count field", async ({
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

  await page.getByRole("textbox", { name: "Factory Output Rate" }).fill("60");
  await page.keyboard.press("Tab");

  // Machine count textbox is the first unlabeled textbox in the controls
  // DOM order: factory name, output rate, production rate (disabled), machine count, clock speed %
  const machineCountField = page.getByRole("textbox").nth(3);
  // At 60/min output with 20/min per machine, auto-calc gives 3 machines
  await expect(machineCountField).toHaveValue("3");

  await machineCountField.fill("4");
  await page.keyboard.press("Tab");

  await expect(machineCountField).toHaveValue("4");
  // Clock speed should adjust to distribute workload across 4 machines (less than 3 machines worth)
  const clockSpeedField = page.getByRole("textbox").nth(4);
  const speed = await clockSpeedField.inputValue();
  expect(Number(speed)).toBeLessThan(100);
});
