import { beforeAll, describe, expect, it } from "vitest";
import AssemblyLine from "@/app/models/assembly-line";
import Factory from "@/app/models/factory";
import FactoryRecipe from "@/app/models/factory-recipe";
import { partSlugLookup, recipes } from "@/app/models/game-data";
import type Part from "@/app/models/part";
import ProductionLine from "@/app/models/production-line";
import type Recipe from "@/app/models/recipe";

let ironIngotRecipe: Recipe;
let ironIngotPart: Part;

beforeAll(() => {
  // biome-ignore lint/style/noNonNullAssertion: recipe should exist in test data
  ironIngotRecipe = recipes.find((r) => r.slug === "recipe-ingotiron-c")!;
  ironIngotPart = partSlugLookup["iron-ingot"];
});

function buildIronIngotFactory(rate: number): Factory {
  const factory = new Factory();
  const pl = new ProductionLine(ironIngotPart, 0, 0, false, false);
  pl.assemblyLines = [new AssemblyLine({ recipe: ironIngotRecipe, rate })];
  pl.rate = pl.assemblyLines[0].getPartProductionRate(ironIngotPart);
  factory.productionLines = [pl];
  factory._productionLineLookup[ironIngotPart.slug] = pl;
  factory._updateRates();
  return factory;
}

describe("AnyRecipe narrowing (recipe-type-model R1.S1, R2.S1)", () => {
  it("narrows a FactoryRecipe line to read capability fields without casts", () => {
    const nested = buildIronIngotFactory(30);
    const fr = new FactoryRecipe("nested-id", "Iron Factory", nested);
    const al = new AssemblyLine({ recipe: fr, rate: 2 });

    // Narrowing on isFactoryRecipe yields FactoryRecipe capability fields.
    expect(al.recipe.isFactoryRecipe).toBe(true);
    if (al.recipe.isFactoryRecipe) {
      expect(al.recipe.avgPowerPerInstance).toBeCloseTo(4);
      expect(al.recipe.shardsPerInstance).toBe(0);
      expect(al.recipe.sloopsPerInstance).toBe(0);
      expect(al.recipe.footprintAreaPerInstance).toBeGreaterThan(0);
    }
    // Power consumption scales by instance count (rate) — no cast path.
    expect(al.getPowerConsumption().avg).toBeCloseTo(2 * 4);
  });

  it("narrows a plain Recipe line to building/processingTime", () => {
    const al = new AssemblyLine({ recipe: ironIngotRecipe, rate: 30 });
    expect(al.recipe.isFactoryRecipe).toBe(false);
    if (!al.recipe.isFactoryRecipe) {
      expect(al.recipe.building).toBeDefined();
      expect(al.recipe.processingTime).toBeGreaterThan(0);
    }
  });
});
