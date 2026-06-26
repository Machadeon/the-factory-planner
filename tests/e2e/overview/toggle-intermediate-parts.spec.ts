import { expect, test } from "@playwright/test";

test("Toggle intermediate parts visibility in the sidebar", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("sfp:consent", "true");
  });
  await page.reload();

  // Add Reinforced Iron Plate (needs Iron Plate + Iron Rod as ingredients)
  await page.getByText("Add Product").click();
  await page
    .getByRole("option", {
      name: "Reinforced Iron Plate Reinforced Iron Plate",
    })
    .click();
  // Select standard recipe: 6x Iron Plate + 12x Screw → 1x Reinforced Iron Plate
  await page
    .getByText("Reinforced Iron Plate6x60/min12x120/min1x10/min")
    .click();

  // Add Iron Plate as a product so it becomes intermediate
  await page.getByText("Add Product").click();
  await page.getByRole("option", { name: "Iron Plate Iron Plate" }).click();
  // Select the standard Iron Plate recipe (Constructor with Iron Ingot input)
  // Rates may vary depending on calculated output, so match by recipe name only
  await page
    .getByText(/^Iron Plate\d+x/)
    .first()
    .click();

  // Iron Plate is now both produced and consumed → intermediate
  await expect(page.getByText(/Intermediate Parts \([1-9]/)).toBeVisible();

  // Toggle visibility ON — VisibilityIcon data-testid
  await page.getByTestId("VisibilityIcon").click();
  // Intermediate parts detail rows are now visible (production + consumption rates shown)
  await expect(page.getByTestId("VisibilityOffIcon")).toBeVisible();

  // Toggle visibility OFF
  await page.getByTestId("VisibilityOffIcon").click();
  await expect(page.getByTestId("VisibilityIcon")).toBeVisible();
});
