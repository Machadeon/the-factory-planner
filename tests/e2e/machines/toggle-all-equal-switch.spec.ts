import { expect, test } from "@playwright/test";

test("Toggle the 'All equal' clock speed switch", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("sfp:consent", "true");
  });
  await page.reload();

  await page.getByText("Add Product").click();
  await page.getByRole("option", { name: "Iron Plate Iron Plate" }).click();
  await page.getByText("Iron Plate3x15/min2x10/min").click();

  await page.getByRole("textbox", { name: "Factory Output Rate" }).fill("25");
  await page.keyboard.press("Tab");

  // The switch label changes based on current state:
  //   unchecked = "Machines run at mixed clock speeds (bank + remainder)"
  //   checked   = "All machines run at the same clock speed"
  // By default at 25/min (1.25 machines), remainder mode is active = unchecked
  // Locate the switch by its aria-label in either state
  const allEqualSwitch = page.getByRole("switch", { name: /clock speed/ });
  await expect(allEqualSwitch).not.toBeChecked();

  // Toggle ON — enables all-equal mode
  await allEqualSwitch.click();
  await expect(allEqualSwitch).toBeChecked();

  // Toggle back OFF
  await allEqualSwitch.click();
  await expect(allEqualSwitch).not.toBeChecked();
});
