import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..");

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

const PLANNING_FILES = [
  "app/components/planning/ProductionLineRow.tsx",
  "app/components/planning/ProductionLineDetails.tsx",
  "app/components/planning/RecipePicker.tsx",
  "app/components/planning/FactoryRecipeCard.tsx",
];

describe("production-line-structure (R1.S1, R3.S5, R5.S2)", () => {
  it("R1.S1 each planning file exists with one default export and ≤300 lines", () => {
    for (const rel of [
      ...PLANNING_FILES,
      "app/components/ProductionLineComponent.tsx", // retained composition parent
    ]) {
      const src = read(rel);
      expect(src.split("\n").length, `${rel} line count`).toBeLessThanOrEqual(
        300,
      );
      const defaultExports = src.match(/export default/g) ?? [];
      expect(defaultExports.length, `${rel} default exports`).toBe(1);
    }
  });

  it("R3.S5 no useEffect derives picker visibility from needMoreProduction", () => {
    for (const rel of [
      ...PLANNING_FILES,
      "app/components/ProductionLineComponent.tsx",
    ]) {
      const src = read(rel);
      // No effect body references needMoreProduction (the removed derived-state sync).
      const effectBlocks = src.match(/useEffect\(([\s\S]*?)\}, \[/g) ?? [];
      for (const block of effectBlocks) {
        expect(
          block,
          `${rel} effect must not sync needMoreProduction`,
        ).not.toMatch(/needMoreProduction/);
      }
    }
  });

  it("R5.S2 planning production-line files contain no var declarations", () => {
    for (const rel of PLANNING_FILES) {
      const src = read(rel);
      expect(src, `${rel} contains var`).not.toMatch(/\bvar\s+[A-Za-z_$]/);
    }
  });
});
