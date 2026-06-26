// spec: bugs/inconsistent-warning-visibility.md
// seed: tests/e2e/seed.spec.ts

import { expect, test } from "@playwright/test";

test.describe("Solver Warning Visibility", () => {
  async function setupFactory(page: import("@playwright/test").Page) {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();

    // Add Fuel production line with Unpackage Fuel recipe
    await page.getByText("Add Product").click();
    await page.getByRole("option", { name: "Fuel Fuel" }).click();
    await page.getByText("Unpackage Fuel2x10/min2x10/").click();

    // Add Packaged Fuel production line with Alternate: Diluted Packaged Fuel recipe
    await page.getByText("Add Product").click();
    await page.locator('input[role="combobox"]').fill("Packaged Fuel");
    await page
      .locator('role=option[name="Packaged Fuel Packaged Fuel"]')
      .click();
    await page
      .getByText("Alternate: Diluted Packaged Fuel1x5/min2x10/min2x10/min")
      .click();

    // Add Packaged Water production line (uses default Packaged Water recipe)
    await page.getByText("Add Product").click();
    await page.locator('input[role="combobox"]').fill("Packaged Water");
    await page
      .locator('role=option[name="Packaged Water Packaged Water"]')
      .click();
  }

  // The Diluted Packaged Fuel assembly line runs in a 2-slot Refinery.
  // Its Somersloop slider has max=2, which distinguishes it from clock speed
  // sliders (max=250) and disabled sloop sliders (max=0).
  function getSloopSlider(page: import("@playwright/test").Page) {
    return page.locator('input[type="range"][max="2"]');
  }

  test("Solver warning appears when slooping creates imbalance", async ({
    page,
  }) => {
    await setupFactory(page);

    // Enable slooping to 1 on the Diluted Packaged Fuel assembly line
    const sloopSlider = getSloopSlider(page);
    await sloopSlider.focus();
    await page.keyboard.press("ArrowRight");

    // Assert the solver warning alert is visible
    await expect(
      page.getByRole("alert").filter({
        hasText:
          "The following intermediate parts cannot be perfectly balanced",
      }),
    ).toBeVisible();
  });

  test("Solver warning reappears after dismiss when sloop count returns to previous value", async ({
    page,
  }) => {
    await setupFactory(page);

    const warningAlert = page.getByRole("alert").filter({
      hasText: "The following intermediate parts cannot be perfectly balanced",
    });
    const sloopSlider = getSloopSlider(page);

    // Enable slooping to 1 on the Diluted Packaged Fuel assembly line
    await sloopSlider.focus();
    await page.keyboard.press("ArrowRight");

    // Assert the initial warning is visible (sloop=1)
    await expect(warningAlert).toBeVisible();

    // Dismiss the alert
    await page.getByRole("button", { name: "Close" }).click();
    await expect(warningAlert).not.toBeVisible();

    // Change sloop to 2 — alert should reappear
    await sloopSlider.focus();
    await page.keyboard.press("ArrowRight");
    await expect(warningAlert).toBeVisible();

    // Change sloop back to 1 — alert must reappear (regression: previously the same
    // error text as sloop=1 caused the dismissed state to persist instead of resetting)
    await sloopSlider.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(warningAlert).toBeVisible();
  });
});
