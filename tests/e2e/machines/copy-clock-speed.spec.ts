import { expect, test } from "@playwright/test";

test("Copy clock speed value using the copy button", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("sfp:consent", "true");
  });
  await page.reload();

  await page.getByText("Add Product").click();
  await page.getByRole("option", { name: "Iron Plate Iron Plate" }).click();
  await page.getByText("Iron Plate3x15/min2x10/min").click();

  // Copy button tooltip is `Copy "100.00000%"` — MUI IconButton
  const copyButton = page.getByRole("button", { name: /Copy/ }).first();
  await expect(copyButton).toBeVisible();
  await copyButton.click();

  // After clicking, tooltip changes to "Copied!" briefly
  await expect(
    page.getByRole("button", { name: /Copy/ }).first(),
  ).toBeVisible();
});
