// spec: Sidebar section visibility toggles in FactoryOverviewComponent

import { expect, test } from "@playwright/test";

test.describe("Sidebar Section Visibility Toggles", () => {
  async function seedWithIronPlate(page: import("@playwright/test").Page) {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();

    await page.getByText("Add Product").click();
    await page.getByRole("option", { name: "Iron Plate Iron Plate" }).click();
    await page.getByText("Iron Plate3x15/min2x10/min").click();
  }

  test("Toggle Outputs section visibility", async ({ page }) => {
    await seedWithIronPlate(page);

    await expect(page.getByText("Outputs (1)")).toBeVisible();

    const outputsHeader = page.getByText("Outputs (1)").locator("..");
    const outputsWrapper = outputsHeader.locator("+ div");

    await expect(outputsHeader.getByTestId("VisibilityOffIcon")).toBeVisible();

    await outputsHeader.getByTestId("VisibilityOffIcon").click();

    await expect(outputsWrapper).toHaveCSS("content-visibility", "hidden");
    await expect(outputsHeader.getByTestId("VisibilityIcon")).toBeVisible();

    await outputsHeader.getByTestId("VisibilityIcon").click();

    await expect(outputsWrapper).toHaveCSS("content-visibility", "visible");
    await expect(outputsHeader.getByTestId("VisibilityOffIcon")).toBeVisible();
  });

  test("Toggle Intermediates section visibility", async ({ page }) => {
    await seedWithIronPlate(page);

    const intermediatesHeader = page
      .getByText(/Intermediate Parts \(\d+\)/)
      .locator("..");
    const intermediatesWrapper = intermediatesHeader.locator("+ div");

    // Starts hidden by default
    await expect(
      intermediatesHeader.getByTestId("VisibilityIcon"),
    ).toBeVisible();
    await expect(intermediatesWrapper).toHaveCSS(
      "content-visibility",
      "hidden",
    );

    await intermediatesHeader.getByTestId("VisibilityIcon").click();

    await expect(intermediatesWrapper).toHaveCSS(
      "content-visibility",
      "visible",
    );
    await expect(
      intermediatesHeader.getByTestId("VisibilityOffIcon"),
    ).toBeVisible();

    await intermediatesHeader.getByTestId("VisibilityOffIcon").click();

    await expect(intermediatesWrapper).toHaveCSS(
      "content-visibility",
      "hidden",
    );
  });

  test("Toggle Inputs section visibility", async ({ page }) => {
    await seedWithIronPlate(page);

    await expect(page.getByText("Inputs (1)")).toBeVisible();

    const inputsHeader = page.getByText("Inputs (1)").locator("..");
    const inputsWrapper = inputsHeader.locator("+ div");

    await expect(inputsHeader.getByTestId("VisibilityOffIcon")).toBeVisible();

    await inputsHeader.getByTestId("VisibilityOffIcon").click();

    await expect(inputsWrapper).toHaveCSS("content-visibility", "hidden");
    await expect(inputsHeader.getByTestId("VisibilityIcon")).toBeVisible();

    await inputsHeader.getByTestId("VisibilityIcon").click();

    await expect(inputsWrapper).toHaveCSS("content-visibility", "visible");
  });
});
