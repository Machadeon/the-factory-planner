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

    // Outputs section starts expanded — ExpandMoreIcon shown
    await expect(outputsHeader.getByTestId("ExpandMoreIcon")).toBeVisible();

    await outputsHeader.getByTestId("ExpandMoreIcon").click();

    await expect(outputsWrapper).toHaveCSS("content-visibility", "hidden");
    // After collapsing — ChevronRightIcon shown
    await expect(outputsHeader.getByTestId("ChevronRightIcon")).toBeVisible();

    await outputsHeader.getByTestId("ChevronRightIcon").click();

    await expect(outputsWrapper).toHaveCSS("content-visibility", "visible");
    await expect(outputsHeader.getByTestId("ExpandMoreIcon")).toBeVisible();
  });

  test("Toggle Intermediates section visibility", async ({ page }) => {
    await seedWithIronPlate(page);

    const intermediatesHeader = page
      .getByText(/Intermediate Parts \(\d+\)/)
      .locator("..");
    const intermediatesWrapper = intermediatesHeader.locator("+ div");

    // Starts hidden by default — ChevronRightIcon shown
    await expect(
      intermediatesHeader.getByTestId("ChevronRightIcon"),
    ).toBeVisible();
    await expect(intermediatesWrapper).toHaveCSS(
      "content-visibility",
      "hidden",
    );

    await intermediatesHeader.getByTestId("ChevronRightIcon").click();

    await expect(intermediatesWrapper).toHaveCSS(
      "content-visibility",
      "visible",
    );
    await expect(
      intermediatesHeader.getByTestId("ExpandMoreIcon"),
    ).toBeVisible();

    await intermediatesHeader.getByTestId("ExpandMoreIcon").click();

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

    // Inputs section starts expanded — ExpandMoreIcon shown
    await expect(inputsHeader.getByTestId("ExpandMoreIcon")).toBeVisible();

    await inputsHeader.getByTestId("ExpandMoreIcon").click();

    await expect(inputsWrapper).toHaveCSS("content-visibility", "hidden");
    await expect(inputsHeader.getByTestId("ChevronRightIcon")).toBeVisible();

    await inputsHeader.getByTestId("ChevronRightIcon").click();

    await expect(inputsWrapper).toHaveCSS("content-visibility", "visible");
  });
});
