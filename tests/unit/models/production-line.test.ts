import { beforeAll, describe, expect, it } from "vitest";
import AssemblyLine from "@/app/models/assembly-line";
import { partSlugLookup, recipeLookup, recipes } from "@/app/models/game-data";
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

describe("constructor (side-effect-free)", () => {
  // Auto-recipe ownership moved to Factory.addProductionLine (see factory.test.ts).
  it("does not auto-create an AssemblyLine for a sole-recipe part", () => {
    const pl = new ProductionLine(singleRecipePart, 10, 10, false, false);
    expect(pl.assemblyLines).toHaveLength(0);
  });

  it("does not auto-create for a multi-recipe part", () => {
    // iron-ingot has 5 recipes
    expect(recipeLookup[multiRecipePart.slug].length).toBeGreaterThan(1);
    const pl = new ProductionLine(multiRecipePart, 10, 10, false, false);
    expect(pl.assemblyLines).toHaveLength(0);
  });

  it("stores the part, rate, outputRate, and flags correctly", () => {
    const pl = new ProductionLine(ironIngotPart, 30, 60, true, false);
    expect(pl.part).toBe(ironIngotPart);
    expect(pl.rate).toBe(30);
    expect(pl.outputRate).toBe(60);
    expect(pl.autoCalculateRate).toBe(true);
    expect(pl.autoCreated).toBe(false);
  });
});

describe("rate reflects sum of assembly line production rates", () => {
  it("rate from two assembly lines sums correctly via manual update", () => {
    const pl = new ProductionLine(ironIngotPart, 0, 0, false, false);
    pl.assemblyLines = [
      new AssemblyLine({
        recipe: ironIngotRecipe,
        rate: 30,
        allowRemainder: false,
      }), // 30/min
      new AssemblyLine({
        recipe: ironIngotRecipe,
        rate: 15,
        allowRemainder: false,
      }), // 15/min
    ];
    // Production rate from all assembly lines is 30 + 15 = 45
    const total = pl.assemblyLines.reduce(
      (sum, al) => sum + al.getPartProductionRate(ironIngotPart),
      0,
    );
    expect(total).toBeCloseTo(45);
  });
});

describe("recipeInstanceRate (R2.S1)", () => {
  it("returns (rate − Σ getPartProductionRate) / recipe.productLookup[slug]", () => {
    const pl = new ProductionLine(ironIngotPart, 90, 90, false, false);
    pl.assemblyLines = [
      new AssemblyLine({
        recipe: ironIngotRecipe,
        rate: 30,
        allowRemainder: false,
      }),
    ];
    const actual = pl.assemblyLines.reduce(
      (sum, al) => sum + al.getPartProductionRate(ironIngotPart),
      0,
    );
    const expected =
      (pl.rate - actual) / ironIngotRecipe.productLookup[ironIngotPart.slug];
    expect(pl.recipeInstanceRate(ironIngotRecipe)).toBeCloseTo(expected);
  });

  it("with no assembly lines equals rate / product quantity", () => {
    const pl = new ProductionLine(ironIngotPart, 60, 60, false, false);
    expect(pl.recipeInstanceRate(ironIngotRecipe)).toBeCloseTo(
      60 / ironIngotRecipe.productLookup[ironIngotPart.slug],
    );
  });
});

describe("splitRecipeRates (R2.S2)", () => {
  it("scales each assembly line rate by n/(n+1) and changes nothing else", () => {
    const pl = new ProductionLine(ironIngotPart, 0, 0, false, false);
    pl.assemblyLines = [
      new AssemblyLine({ recipe: ironIngotRecipe, rate: 30 }),
      new AssemblyLine({ recipe: ironIngotRecipe, rate: 15 }),
      new AssemblyLine({ recipe: ironIngotRecipe, rate: 9 }),
    ];
    const n = pl.assemblyLines.length; // 3
    const before = pl.assemblyLines.map((al) => al.rate);
    pl.splitRecipeRates();
    pl.assemblyLines.forEach((al, i) => {
      expect(al.rate).toBeCloseTo((before[i] * n) / (n + 1));
    });
    // recipes untouched
    expect(pl.assemblyLines.every((al) => al.recipe === ironIngotRecipe)).toBe(
      true,
    );
  });
});
