import { beforeAll, describe, expect, it } from "vitest";
import AssemblyLine from "@/app/models/assembly-line";
import Factory from "@/app/models/factory";
import FactoryRecipe from "@/app/models/factory-recipe";
import { partSlugLookup, recipes } from "@/app/models/game-data";
import type Part from "@/app/models/part";
import ProductionLine from "@/app/models/production-line";
import type Recipe from "@/app/models/recipe";

// AC2 (R2.6): FactoryRecipe exposes a footprint-area-per-instance equal to the summed
// machine floor area (width * length * machineCount) of the nested factory, so the
// graph can size a sub-factory node to its real footprint.
let ironIngotRecipe: Recipe;
let ironIngotPart: Part;

beforeAll(() => {
  // biome-ignore lint/style/noNonNullAssertion: recipe exists in test data
  ironIngotRecipe = recipes.find((r) => r.slug === "recipe-ingotiron-c")!;
  ironIngotPart = partSlugLookup["iron-ingot"];
});

function buildIronIngotFactory(rate: number): Factory {
  const factory = new Factory();
  factory.update = () => factory._updateRates();
  const pl = new ProductionLine(ironIngotPart, 0, 0, false, false, true);
  pl.assemblyLines = [
    new AssemblyLine(ironIngotRecipe, rate, 0, 100, 0, false),
  ];
  pl.rate = pl.assemblyLines[0].getPartProductionRate(ironIngotPart);
  factory.productionLines = [pl];
  factory._productionLineLookup[ironIngotPart.slug] = pl;
  factory._updateRates();
  return factory;
}

describe("FactoryRecipe.footprintAreaPerInstance", () => {
  it("equals one smelter footprint for a single-smelter sub-factory", () => {
    const factory = buildIronIngotFactory(30); // 30/min = 1 smelter at 100%
    const fr = new FactoryRecipe("test-id", "Iron Factory", factory);
    const { width, length } = ironIngotRecipe.building.size;
    const expected = 1 * width * length;
    expect(
      (fr as unknown as { footprintAreaPerInstance: number })
        .footprintAreaPerInstance,
    ).toBeCloseTo(expected);
  });

  it("scales with machine count", () => {
    const factory = buildIronIngotFactory(90); // 3 smelters
    const fr = new FactoryRecipe("test-id", "Iron Factory", factory);
    const { width, length } = ironIngotRecipe.building.size;
    expect(
      (fr as unknown as { footprintAreaPerInstance: number })
        .footprintAreaPerInstance,
    ).toBeCloseTo(3 * width * length);
  });
});
