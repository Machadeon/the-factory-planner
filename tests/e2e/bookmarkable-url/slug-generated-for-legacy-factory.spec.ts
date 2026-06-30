import { expect, test } from "@playwright/test";

test.describe("bookmarkable URL", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("sfp:consent", "true");
    });
    await page.reload();
  });

  test("Legacy factory without a slug gets one generated and URL updated on load", async ({
    page,
  }) => {
    const factoryId = "legacy-factory-abc123";

    await page.evaluate(
      ({ id }) => {
        const lib = {
          schemaVersion: 5,
          folders: [],
          factories: [
            {
              schemaVersion: 5,
              id,
              name: "Copper Works",
              folderId: null,
              autoAddProductLines: false,
              productionLines: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        };
        localStorage.setItem("sfp:library", JSON.stringify(lib));
        localStorage.setItem("sfp:current", id);
      },
      { id: factoryId },
    );

    await page.goto(`/?factoryId=${factoryId}`);
    // Wait for the app to detect the legacy URL, generate a slug, and redirect
    await page.waitForURL(/factory=copper-works/);

    const nameInput = page.getByRole("textbox", { name: "Factory name" });
    await expect(nameInput).toHaveValue("Copper Works");

    const params = new URL(page.url()).searchParams;
    expect(params.get("factory")).toBe("copper-works");
    expect(params.get("factoryId")).toBeNull();

    const storedLib = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("sfp:library") ?? "{}"),
    );
    const stored = storedLib.factories.find(
      (f: { id: string }) => f.id === factoryId,
    );
    expect(stored?.slug).toBe("copper-works");
  });
});
