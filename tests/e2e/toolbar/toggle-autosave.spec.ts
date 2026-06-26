// spec: Section 8: Factory Toolbar Actions
// seed: tests/e2e/seed.spec.ts

import { expect, test } from "@playwright/test";

test.describe("Factory Toolbar Actions", () => {
  test("Toggle the autosave switch", async ({ page }) => {
    // 1. Seed
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();

    // expect: 'Autosave on' switch visible in toolbar and toggled ON
    await expect(page.getByLabel("Autosave on")).toBeVisible();
    const autosaveSwitch = page.getByLabel("Autosave on").getByRole("switch");
    await expect(autosaveSwitch).toBeChecked();

    // 2. Click the switch
    await page.getByLabel("Autosave on").getByRole("switch").click();

    // expect: switch changes to OFF, label updates to 'Autosave off'
    await expect(page.getByLabel("Autosave off")).toBeVisible();
    const autosaveSwitchOff = page
      .getByLabel("Autosave off")
      .getByRole("switch");
    await expect(autosaveSwitchOff).not.toBeChecked();

    // 3. Click switch again
    await page.getByLabel("Autosave off").getByRole("switch").click();

    // expect: switch changes to ON, label updates to 'Autosave on'
    await expect(page.getByLabel("Autosave on")).toBeVisible();
    await expect(
      page.getByLabel("Autosave on").getByRole("switch"),
    ).toBeChecked();
  });
});
