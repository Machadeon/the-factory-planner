// spec: Section 8: Factory Toolbar Actions — autosave persistence
// seed: tests/e2e/seed.spec.ts
//
// Regression: the debounced autosave timer nulled its own ref before calling
// flushAutosave, whose "nothing pending" guard then short-circuited — so the
// scheduled save never ran. Symptoms: the dirty badge never cleared with
// autosave on, and unsaved edits were lost on refresh.

import { expect, test } from "@playwright/test";

async function seedClean(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("sfp:consent", "true");
  });
  await page.reload();
}

async function addIronPlate(page: import("@playwright/test").Page) {
  await page.getByText("Add Product").click();
  await page.getByRole("combobox", { name: "Part" }).fill("Iron Plate");
  await page.getByRole("option", { name: "Iron Plate Iron Plate" }).click();
  await expect(
    page.getByRole("img", { name: "Iron Plate" }).first(),
  ).toBeVisible();
}

test.describe("Autosave persistence", () => {
  test("autosave on: debounced save persists to library and clears the badge", async ({
    page,
  }) => {
    await seedClean(page);
    await expect(
      page.getByLabel("Autosave on").getByRole("switch"),
    ).toBeChecked();

    await addIronPlate(page);

    // The debounced autosave must actually write the factory to the library.
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const raw = localStorage.getItem("sfp:library");
            if (!raw) return 0;
            return JSON.parse(raw).factories?.length ?? 0;
          }),
        { timeout: 5000 },
      )
      .toBeGreaterThan(0);

    // Once the autosave completes, the unsaved-changes dot badge clears.
    await expect(page.getByTestId("icon-button-dot-badge")).toHaveCount(0);
  });

  test("autosave off: edits survive a refresh", async ({ page }) => {
    await seedClean(page);
    await page.getByLabel("Autosave on").getByRole("switch").click();
    await expect(
      page.getByLabel("Autosave off").getByRole("switch"),
    ).not.toBeChecked();

    await addIronPlate(page);

    // Give the debounce window time to flush the unsaved-autosave snapshot.
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("sfp:autosave")), {
        timeout: 5000,
      })
      .not.toBeNull();

    await page.reload();

    // The unsaved factory is restored from the autosave snapshot.
    await expect(
      page.getByRole("img", { name: "Iron Plate" }).first(),
    ).toBeVisible();
  });
});
