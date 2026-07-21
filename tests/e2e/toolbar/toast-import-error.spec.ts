// spec: C2 toast primitive — kill alert()
// seed: tests/e2e/seed.spec.ts

import { expect, test } from "@playwright/test";

test.describe("Toast on import error", () => {
  test("Unrecognized JSON import shows a dismissable error toast (not a blocking alert)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();

    // Fail fast if a blocking alert() ever returns: auto-dismiss any dialog and
    // record it so the assertion below can detect a regression.
    let sawDialog = false;
    page.on("dialog", (d) => {
      sawDialog = true;
      void d.dismiss();
    });

    // Upload a JSON file that is neither a library nor a single factory.
    await page
      .getByTestId("file-import-input:Import factory from file")
      .setInputFiles({
        name: "bad.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify({ nonsense: true })),
      });

    const region = page.getByTestId("toast-region");
    const toast = region.getByTestId("toast");
    await expect(toast).toBeVisible();
    await expect(toast).toContainText("Unrecognized JSON format.");
    expect(sawDialog).toBe(false);

    // Dismissable via its close control.
    await region.getByTestId("toast-close").click();
    await expect(toast).toHaveCount(0);
  });
});
