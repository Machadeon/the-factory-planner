import { beforeAll, describe, expect, it } from "vitest";
import AssemblyLine from "@/app/models/assembly-line";
import Factory from "@/app/models/factory";
import FactoryRecipe from "@/app/models/factory-recipe";
import { partSlugLookup, recipes } from "@/app/models/game-data";
import type Part from "@/app/models/part";
import ProductionLine from "@/app/models/production-line";
import type Recipe from "@/app/models/recipe";

// R9: a FactoryRecipe assembly line's rate counts whole nested-factory instances and
// must be integer everywhere; the LP must treat factory-recipe variables as integer.
let ironIngotRecipe: Recipe;
let ironIngotPart: Part;

beforeAll(() => {
  // biome-ignore lint/style/noNonNullAssertion: recipe exists in test data
  ironIngotRecipe = recipes.find((r) => r.slug === "recipe-ingotiron-c")!;
  ironIngotPart = partSlugLookup["iron-ingot"];
});

// A nested factory producing 30 iron-ingot / instance (consuming 30 iron-ore).
function ironSubFactoryRecipe(): FactoryRecipe {
  const nested = new Factory();
  nested.update = () => nested._updateRates();
  const pl = new ProductionLine(ironIngotPart, 0, 0, false, false, true);
  pl.assemblyLines = [new AssemblyLine(ironIngotRecipe, 30, 0, 100, 0, false)];
  pl.rate = pl.assemblyLines[0].getPartProductionRate(ironIngotPart);
  nested.productionLines = [pl];
  nested._productionLineLookup[ironIngotPart.slug] = pl;
  nested._updateRates();
  return new FactoryRecipe("sub-id", "Iron Sub", nested);
}

// Outer factory whose iron-ingot line is satisfied by `count` instances of the sub.
function outerWithSub(): { factory: Factory; al: AssemblyLine } {
  const factory = new Factory();
  factory.update = () => factory._updateRates();
  const fr = ironSubFactoryRecipe();
  const al = new AssemblyLine(fr, 1, 0, 100, 0, false);
  const pl = new ProductionLine(ironIngotPart, 0, 0, true, false, true);
  pl.assemblyLines = [al];
  factory.productionLines = [pl];
  factory._productionLineLookup[ironIngotPart.slug] = pl;
  factory._updateRates();
  return { factory, al };
}

describe("integer factory-recipe instances", () => {
  it("AC3: maximize under a part cap floors instances to an integer", () => {
    const { factory, al } = outerWithSub();
    factory._productionLineLookup[ironIngotPart.slug].maximizeOutput = true;
    // Cap iron-ore so the LP would otherwise pick a fractional instance count.
    factory.constraints = [{ partSlug: "iron-ore", max: 50 }];
    factory.autoCalculateRates();
    expect(Number.isInteger(al.rate)).toBe(true);
    expect(al.rate).toBeGreaterThanOrEqual(1);
  });

  it("AC5: an equal target unreachable with whole instances sets solverError", () => {
    const { factory } = outerWithSub();
    // 50/min is not a multiple of 30/instance → no whole-instance solution.
    factory._productionLineLookup[ironIngotPart.slug].outputRate = 50;
    factory.autoCalculateRates();
    expect(factory.solverError).not.toBeNull();
  });
});

describe("AC4: building recipes stay continuous", () => {
  it("a building-recipe line solves to a fractional rate when demanded", () => {
    const factory = new Factory();
    factory.update = () => factory._updateRates();
    const al = new AssemblyLine(ironIngotRecipe, 1, 0, 100, 0, false);
    const pl = new ProductionLine(ironIngotPart, 0, 0, true, false, true);
    pl.assemblyLines = [al];
    pl.outputRate = 45.5; // fractional completions/min — must NOT be forced integer
    factory.productionLines = [pl];
    factory._productionLineLookup[ironIngotPart.slug] = pl;
    factory._updateRates();
    factory.autoCalculateRates();
    expect(factory.solverError).toBeNull();
    expect(Number.isInteger(al.rate)).toBe(false);
  });
});
