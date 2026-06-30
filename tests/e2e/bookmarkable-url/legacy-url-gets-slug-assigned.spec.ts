// spec: bookmarkable URL
// seed: tests/e2e/seed.spec.ts

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

  test("Factory loaded via legacy URL gets a slug generated and URL updated to slug form", async ({
    page,
  }) => {
    const factoryId = "legacy-no-slug-xyz789";

    // 1. Inject a legacy factory (no `slug` field) into localStorage via addInitScript
    //    so it runs before any page code on the next navigation, bypassing beforeunload.
    await page.addInitScript(
      ({ id }) => {
        const lib = {
          schemaVersion: 5,
          folders: [],
          factories: [
            {
              schemaVersion: 5,
              id,
              name: "Copper Smelter",
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

    // 2. Navigate via the legacy ?factoryId= URL
    await page.goto(`/?factoryId=${factoryId}`);

    // 3. Wait for the URL to update from the legacy form to the slug form
    await page.waitForURL(/factory=copper-smelter/);

    // 4. Assert URL `factory` param equals `copper-smelter`
    const params = new URL(page.url()).searchParams;
    expect(params.get("factory")).toBe("copper-smelter");

    // 5. Assert URL `factoryId` param is null/absent
    expect(params.get("factoryId")).toBeNull();

    // 6–7. Read localStorage and assert factory now has slug field equal to `copper-smelter`
    const storedLib = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("sfp:library") ?? "{}"),
    );
    const storedFactory = storedLib.factories?.find(
      (f: { id: string }) => f.id === factoryId,
    );
    expect(storedFactory?.slug).toBe("copper-smelter");
  });
});
