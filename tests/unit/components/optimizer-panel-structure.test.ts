import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const exists = (rel: string) => existsSync(join(ROOT, rel));

const NEW_FILES = [
  "app/components/optimization/OptimizerPanel.tsx",
  "app/components/optimization/OptimizerRecipeFilters.tsx",
  "app/components/optimization/AvailablePartsEditor.tsx",
  "app/components/optimization/SourceFactoriesEditor.tsx",
  "app/components/optimization/PointValuesPanel.tsx",
  "app/components/optimization/RecipeListPanel.tsx",
];

const OLD_PATHS = [
  "app/components/RecipeOptimizerPanel.tsx",
  "app/components/PointValuesPanel.tsx",
  "app/components/RecipeListPanel.tsx",
];

// Count `export default function X` / `export function X` / `export default X`
// top-level component-shaped exports; a real single-component file has exactly one.
function countExportedComponents(src: string): number {
  const matches = src.match(
    /export default function \w+|export default \w+;|^export function [A-Z]\w*/gm,
  );
  return matches ? matches.length : 0;
}

describe("optimizer panel split into single-purpose files (R3.S1)", () => {
  it("all six files exist under app/components/optimization/, each exporting one component", () => {
    for (const rel of NEW_FILES) {
      expect(exists(rel)).toBe(true);
      const count = countExportedComponents(read(rel));
      expect(count).toBe(1);
    }
  });

  it("none of the old paths exist anymore", () => {
    for (const rel of OLD_PATHS) {
      expect(exists(rel)).toBe(false);
    }
  });
});

describe("single call site updated (R3.S2)", () => {
  it("OptimizationSection imports OptimizerPanel from the new path", () => {
    const src = read("app/components/optimization/OptimizationSection.tsx");
    expect(src).toMatch(/from\s+["']\.\/OptimizerPanel["']/);
  });

  it("no file under app/ imports the deleted RecipeOptimizerPanel path", () => {
    const result = execSync(
      `grep -rl -E "from\\s+[\\"'].*RecipeOptimizerPanel[\\"']" "${join(ROOT, "app")}" || true`,
      { encoding: "utf8" },
    );
    expect(result.trim()).toBe("");
  });
});

describe("cascade logic not duplicated inline (R1.S2)", () => {
  it("OptimizerRecipeFilters calls the named optimizer-config exports rather than redeclaring them", () => {
    const src = read("app/components/optimization/OptimizerRecipeFilters.tsx");
    expect(src).toMatch(/updatePhase\(/);
    expect(src).toMatch(/toggleCategory\(/);
    expect(src).toMatch(/toggleBuilding\(/);
    expect(src).not.toMatch(/function updatePhase\(/);
    expect(src).not.toMatch(/function toggleCategory\(/);
    expect(src).not.toMatch(/function toggleBuilding\(/);
  });

  it("no other file under app/components declares these function names", () => {
    const result = execSync(
      `grep -rl -E "function (updatePhase|toggleCategory|toggleBuilding)\\(" "${join(ROOT, "app/components")}" || true`,
      { encoding: "utf8" },
    );
    const hits = result
      .trim()
      .split("\n")
      .filter((l: string) => l.length > 0);
    expect(hits).toEqual([]);
  });
});
