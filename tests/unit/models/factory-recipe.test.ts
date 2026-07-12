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
let _ironOrePart: Part;

beforeAll(() => {
  // biome-ignore lint/style/noNonNullAssertion: recipe should exist in test data
  ironIngotRecipe = recipes.find((r) => r.slug === "recipe-ingotiron-c")!;
  ironIngotPart = partSlugLookup["iron-ingot"];
  _ironOrePart = partSlugLookup["iron-ore"];
});

function buildIronIngotFactory(rate: number): Factory {
  const factory = new Factory();

  const pl = new ProductionLine(ironIngotPart, 0, 0, false, false);
  const al = new AssemblyLine({
    recipe: ironIngotRecipe,
    rate: rate,
    allowRemainder: false,
  });
  pl.assemblyLines = [al];
  pl.rate = al.getPartProductionRate(ironIngotPart);
  factory.productionLines = [pl];
  factory._productionLineLookup[ironIngotPart.slug] = pl;
  factory._updateRates();
  return factory;
}

describe("FactoryRecipe", () => {
  it("net outputs become products", () => {
    const factory = buildIronIngotFactory(30);
    // Iron ingot factory: produces 30 ingots/min, consumes 30 ore/min
    const fr = new FactoryRecipe("test-id", "Iron Factory", factory);

    // Net output: iron-ingot (produced 30, consumed 0)
    const ingotProduct = fr.getProduct("iron-ingot");
    expect(ingotProduct).toBeDefined();
    expect(ingotProduct?.quantity).toBeCloseTo(30);
  });

  it("net inputs become ingredients", () => {
    const factory = buildIronIngotFactory(30);
    const fr = new FactoryRecipe("test-id", "Iron Factory", factory);

    // Net input: iron-ore (produced 0, consumed 30)
    const oreIngredient = fr.getIngredient("iron-ore");
    expect(oreIngredient).toBeDefined();
    expect(oreIngredient?.quantity).toBeCloseTo(30);
  });

  it("zero-net parts are not in products or ingredients", () => {
    // A factory that produces AND consumes iron-ingot at equal rates
    const factory = new Factory();
    const pl1 = new ProductionLine(ironIngotPart, 0, 0, false, false);
    pl1.assemblyLines = [
      new AssemblyLine({
        recipe: ironIngotRecipe,
        rate: 30,
        allowRemainder: false,
      }),
    ];
    // This is a degenerate case; just verify zero-net parts are excluded
    factory.productionLines = [pl1];
    factory._productionLineLookup[ironIngotPart.slug] = pl1;
    factory._updateRates();
    // Override rateLookup to simulate balanced iron-ingot (produced=consumed)
    factory.rateLookup["iron-ingot"] = {
      productionRate: 30,
      consumptionRate: 30,
    };

    const fr = new FactoryRecipe("test-id", "Iron Factory", factory);
    expect(fr.getProduct("iron-ingot")).toBeUndefined();
    expect(fr.getIngredient("iron-ingot")).toBeUndefined();
  });

  it("captures avgPowerPerInstance from the factory's total power", () => {
    const factory = buildIronIngotFactory(30);
    // 1 Smelter at 100% clock: 4 MW * (100/100)^1.321928 = 4 MW
    const fr = new FactoryRecipe("test-id", "Iron Factory", factory);
    expect(fr.avgPowerPerInstance).toBeCloseTo(4);
    expect(fr.minPowerPerInstance).toBeCloseTo(4);
    expect(fr.maxPowerPerInstance).toBeCloseTo(4);
  });

  it("captures shardsPerInstance from the factory's total shards", () => {
    const factory = buildIronIngotFactory(30);
    // No power shards used → 0 shards total
    const fr = new FactoryRecipe("test-id", "Iron Factory", factory);
    expect(fr.shardsPerInstance).toBe(0);
  });

  it("captures sloopsPerInstance from the factory's total sloops", () => {
    const factory = buildIronIngotFactory(30);
    // No sloops used → 0 sloops total
    const fr = new FactoryRecipe("test-id", "Iron Factory", factory);
    expect(fr.sloopsPerInstance).toBe(0);
  });

  it("isFactoryRecipe is true", () => {
    const factory = buildIronIngotFactory(30);
    const fr = new FactoryRecipe("test-id", "Iron Factory", factory);
    expect(fr.isFactoryRecipe).toBe(true);
  });

  it("slug is factory:<id>", () => {
    const factory = buildIronIngotFactory(30);
    const fr = new FactoryRecipe("abc-123", "Iron Factory", factory);
    expect(fr.slug).toBe("factory:abc-123");
  });
});
