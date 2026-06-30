// spec: plans/bookmarkable-url/
// seed: tests/e2e/seed.spec.ts

import { expect, test } from "@playwright/test";

test.describe("bookmarkable URL", () => {
  test("URL changes to the new factory slug when switching factories via the library", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();

    // 1. Fill factory name "Factory A", press Tab. Click Save.
    //    Wait for URL to contain `factory=`. Capture `factory` URL param as `slugA`. Assert `slugA === 'factory-a'`.
    await page.getByRole("textbox", { name: "Factory name" }).fill("Factory A");
    await page.keyboard.press("Tab");
    await page.getByLabel(/Save/).click();
    await expect(page).toHaveURL(/factory=/);
    const slugA = new URL(page.url()).searchParams.get("factory");
    expect(slugA).toBe("factory-a");

    // 2. Open factory library. Assert dialog visible. Click "New factory". Assert dialog closes.
    //    Assert URL has NO `factory` param (null).
    await page.getByLabel("Open factory library").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByLabel("New factory").click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect
      .poll(() => new URL(page.url()).searchParams.get("factory"))
      .toBeNull();

    // 3. Fill factory name "Factory B", press Tab. Click Save.
    //    Wait for URL to contain `factory=`. Capture `factory` URL param as `slugB`. Assert `slugB !== slugA`.
    await page.getByRole("textbox", { name: "Factory name" }).fill("Factory B");
    await page.keyboard.press("Tab");
    await page.getByLabel(/Save/).click();
    await expect(page).toHaveURL(/factory=/);
    const slugB = new URL(page.url()).searchParams.get("factory");
    expect(slugB).not.toBe(slugA);

    // 4. Open factory library. Assert both "Factory A" and "Factory B" visible in dialog.
    await page.getByLabel("Open factory library").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog").getByText("Factory A")).toBeVisible();
    await expect(page.getByRole("dialog").getByText("Factory B")).toBeVisible();

    // 5. Click "Factory A" in list. Assert dialog closes. Assert factory name shows "Factory A".
    //    Wait for URL to contain `slugA`.
    await page.getByRole("dialog").getByText("Factory A").click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "Factory name" }),
    ).toHaveValue("Factory A");
    await expect(page).toHaveURL(new RegExp(`factory=${slugA}`));

    // 6. Assert URL contains `slugA`. Assert URL does NOT contain `slugB`.
    expect(new URL(page.url()).searchParams.get("factory")).toBe(slugA);
    expect(new URL(page.url()).searchParams.get("factory")).not.toBe(slugB);
  });
});
