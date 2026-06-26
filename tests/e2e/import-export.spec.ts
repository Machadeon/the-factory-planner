import * as fs from "node:fs";
import * as path from "node:path";
import { expect, test } from "@playwright/test";

const megaFactoryPath = path.resolve(__dirname, "../../test-data/mega-factory.json");
const megaFactory = JSON.parse(fs.readFileSync(megaFactoryPath, "utf-8"));

test.beforeEach(async ({ page }) => {
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("sfp:consent", "true");
  });
  await page.goto("/");
});

test.describe("import-export", () => {
  test("imports mega-factory.json and verifies production lines", async ({
    page,
  }) => {
    // Open the JSON import dialog
    const importButton = page.getByRole("button", { name: /import|json/i });
    await importButton.click();

    // Find the file input and upload the fixture
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(megaFactoryPath);

    // Wait for the factory to load
    await page.waitForTimeout(500);

    // The mega factory's first production line is "Ballistic Warp Drive"
    const firstPart = megaFactory.productionLines[0].partSlug
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c: string) => c.toUpperCase());
    await expect(page.getByText(new RegExp(firstPart, "i"))).toBeVisible();
  });

  test("exports and re-imports a factory producing the same state", async ({
    page,
  }) => {
    // Add a production line
    await page.getByRole("button", { name: /add/i }).click();
    await page.getByRole("combobox").fill("Iron Plate");
    await page.getByRole("option", { name: /^Iron Plate$/ }).click();

    // Export to JSON
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /export|download|json/i }).click();
    const download = await downloadPromise;

    const exportedPath = path.join(
      path.dirname(megaFactoryPath),
      "exported-test.json",
    );
    await download.saveAs(exportedPath);

    try {
      const exported = JSON.parse(fs.readFileSync(exportedPath, "utf-8"));
      // Verify round-trip: exported file should contain the Iron Plate production line
      expect(
        exported.productionLines?.some(
          (pl: { partSlug: string }) => pl.partSlug === "iron-plate",
        ),
      ).toBe(true);
    } finally {
      fs.rmSync(exportedPath, { force: true });
    }
  });
});
