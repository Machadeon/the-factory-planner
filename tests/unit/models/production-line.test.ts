import { beforeAll, describe, expect, it } from "vitest";
import AssemblyLine from "@/app/models/assembly-line";
import { partSlugLookup, recipeLookup, recipes } from "@/app/models/library";
import type Part from "@/app/models/part";
import ProductionLine from "@/app/models/production-line";
import type Recipe from "@/app/models/recipe";

let ironIngotRecipe: Recipe;
let ironIngotPart: Part;
let multiRecipePart: Part; // iron-ingot has 5 recipes → no auto-create
let singleRecipePart: Part; // packaged-rocket-fuel has exactly 1 recipe

beforeAll(() => {
  // biome-ignore lint/style/noNonNullAssertion: recipe should exist in test data
  ironIngotRecipe = recipes.find((r) => r.slug === "recipe-ingotiron-c")!;
  ironIngotPart = partSlugLookup["iron-ingot"];
  multiRecipePart = partSlugLookup["iron-ingot"];
  // Find a part with exactly 1 recipe
  singleRecipePart =
    Object.keys(recipeLookup)
      .filter((slug) => recipeLookup[slug].length === 1)
      .map((slug) => partSlugLookup[slug])
      .find(Boolean) ?? partSlugLookup["packaged-rocket-fuel"];
});

describe("constructor", () => {
  it("auto-creates one AssemblyLine when exactly one recipe exists", () => {
    const pl = new ProductionLine(singleRecipePart, 10, 10, false, false);
    expect(pl.assemblyLines).toHaveLength(1);
  });

  it("does not auto-create when suppressAutoRecipe=true", () => {
    const pl = new ProductionLine(singleRecipePart, 10, 10, false, false, true);
    expect(pl.assemblyLines).toHaveLength(0);
  });

  it("does not auto-create when part has multiple recipes", () => {
    // iron-ingot has 5 recipes
    expect(recipeLookup[multiRecipePart.slug].length).toBeGreaterThan(1);
    const pl = new ProductionLine(multiRecipePart, 10, 10, false, false);
    expect(pl.assemblyLines).toHaveLength(0);
  });

  it("stores the part, rate, outputRate, and flags correctly", () => {
    const pl = new ProductionLine(ironIngotPart, 30, 60, true, false, true);
    expect(pl.part).toBe(ironIngotPart);
    expect(pl.rate).toBe(30);
    expect(pl.outputRate).toBe(60);
    expect(pl.autoCalculateRate).toBe(true);
    expect(pl.autoCreated).toBe(false);
  });
});

describe("rate reflects sum of assembly line production rates", () => {
  it("rate from two assembly lines sums correctly via manual update", () => {
    const pl = new ProductionLine(ironIngotPart, 0, 0, false, false, true);
    pl.assemblyLines = [
      new AssemblyLine(ironIngotRecipe, 30, 0, 100, 0, false), // 30/min
      new AssemblyLine(ironIngotRecipe, 15, 0, 100, 0, false), // 15/min
    ];
    // Production rate from all assembly lines is 30 + 15 = 45
    const total = pl.assemblyLines.reduce(
      (sum, al) => sum + al.getPartProductionRate(ironIngotPart),
      0,
    );
    expect(total).toBeCloseTo(45);
  });
});
