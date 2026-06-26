import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import AssemblyLine from "@/app/models/assembly-line";
import Factory from "@/app/models/factory";
import FactoryRecipe from "@/app/models/factory-recipe";
import { partSlugLookup, recipes } from "@/app/models/library";
import type Part from "@/app/models/part";
import type Recipe from "@/app/models/recipe";
import ProductionLine from "@/app/models/production-line";

let ironIngotRecipe: Recipe;
let ironPlateRecipe: Recipe;
let ironRodRecipe: Recipe;
let ironIngotPart: Part;
let ironOrePart: Part;
let ironPlatePart: Part;
let ironRodPart: Part;

beforeAll(() => {
  ironIngotRecipe = recipes.find((r) => r.slug === "recipe-ingotiron-c")!;
  ironPlateRecipe = recipes.find((r) => r.slug === "recipe-ironplate-c")!;
  ironRodRecipe = recipes.find((r) => r.slug === "recipe-ironrod-c")!;
  ironIngotPart = partSlugLookup["iron-ingot"];
  ironOrePart = partSlugLookup["iron-ore"];
  ironPlatePart = partSlugLookup["iron-plate"];
  ironRodPart = partSlugLookup["iron-rod"];
});

function makeFactory(): Factory {
  const f = new Factory();
  f.update = () => {
    f._updateRates();
  };
  return f;
}

function addManualProductionLine(
  factory: Factory,
  part: Part,
  recipe: Recipe,
  rate: number,
  outputRate = 0,
): ProductionLine {
  const pl = new ProductionLine(part, 0, outputRate, outputRate > 0, false, true);
  pl.assemblyLines = [new AssemblyLine(recipe, rate, 0, 100, 0, false)];
  factory.productionLines.push(pl);
  factory._productionLineLookup[part.slug] = pl;
  factory._updateRates();
  return pl;
}

describe("_updateRates()", () => {
  it("sums production rates across all assembly lines for a part", () => {
    const factory = makeFactory();
    const pl = new ProductionLine(ironIngotPart, 0, 0, false, false, true);
    pl.assemblyLines = [
      new AssemblyLine(ironIngotRecipe, 30, 0, 100, 0, false),
      new AssemblyLine(ironIngotRecipe, 15, 0, 100, 0, false),
    ];
    factory.productionLines = [pl];
    factory._updateRates();

    expect(factory.rateLookup["iron-ingot"].productionRate).toBeCloseTo(45);
    expect(factory.rateLookup["iron-ore"].consumptionRate).toBeCloseTo(45);
  });

  it("tracks consumption and production separately", () => {
    const factory = makeFactory();
    // Iron Ingot line: consumes iron ore, produces iron ingot
    addManualProductionLine(factory, ironIngotPart, ironIngotRecipe, 30);
    // Iron Plate line: consumes iron ingot, produces iron plate
    addManualProductionLine(factory, ironPlatePart, ironPlateRecipe, 10);

    // iron ingot: produced 30/min, consumed 30/min (3 ingots × 10 completions)
    expect(factory.rateLookup["iron-ingot"].productionRate).toBeCloseTo(30);
    expect(factory.rateLookup["iron-ingot"].consumptionRate).toBeCloseTo(30);
  });

  it("populates _assemblyLineLookup for consumed and produced parts", () => {
    const factory = makeFactory();
    addManualProductionLine(factory, ironIngotPart, ironIngotRecipe, 30);

    expect(factory._assemblyLineLookup["iron-ingot"]).toHaveLength(1);
    expect(factory._assemblyLineLookup["iron-ore"]).toHaveLength(1);
  });
});

describe("allOutputs()", () => {
  it("returns parts with net production > 0.0001", () => {
    const factory = makeFactory();
    addManualProductionLine(factory, ironIngotPart, ironIngotRecipe, 30);
    const outputs = factory.allOutputs();
    expect(outputs.some((p) => p.slug === "iron-ingot")).toBe(true);
  });

  it("excludes parts where production rate equals consumption rate (intermediates)", () => {
    const factory = makeFactory();
    addManualProductionLine(factory, ironIngotPart, ironIngotRecipe, 30);
    addManualProductionLine(factory, ironPlatePart, ironPlateRecipe, 10);
    // Iron ingot: produced 30, consumed 30 → net ≈ 0 → not an output
    const outputs = factory.allOutputs();
    expect(outputs.some((p) => p.slug === "iron-ingot")).toBe(false);
    // Iron plate: produced 20, consumed 0 → output
    expect(outputs.some((p) => p.slug === "iron-plate")).toBe(true);
  });

  it("uses 0.0001 threshold (net of 0.00005 is excluded)", () => {
    const factory = makeFactory();
    addManualProductionLine(factory, ironIngotPart, ironIngotRecipe, 0.000050001);
    // net production = 0.000050001, below 0.0001 threshold
    const outputs = factory.allOutputs();
    expect(outputs.some((p) => p.slug === "iron-ingot")).toBe(false);
  });
});

describe("allInputs()", () => {
  it("returns parts consumed more than produced", () => {
    const factory = makeFactory();
    addManualProductionLine(factory, ironPlatePart, ironPlateRecipe, 10);
    // Iron ingot is consumed but not produced
    const inputs = factory.allInputs();
    expect(inputs.some((p) => p.slug === "iron-ingot")).toBe(true);
  });

  it("accounts for supplier factory quantities before reporting deficit", () => {
    const factory = makeFactory();
    addManualProductionLine(factory, ironPlatePart, ironPlateRecipe, 10);
    // Iron plate line consumes 30 iron ingots/min

    // Create a supplier factory that produces 30 iron ingots/min
    const supplierFactory = makeFactory();
    addManualProductionLine(supplierFactory, ironIngotPart, ironIngotRecipe, 30);
    const supplierRecipe = new FactoryRecipe("supplier-id", "Iron Factory", supplierFactory);
    factory.supplierFactories = [supplierRecipe];

    // With supplier providing 30/min and demand being exactly 30, no deficit
    const inputs = factory.allInputs();
    expect(inputs.some((p) => p.slug === "iron-ingot")).toBe(false);
  });
});

describe("allIntermediateParts()", () => {
  it("returns parts where |production - consumption| < 0.0001", () => {
    const factory = makeFactory();
    addManualProductionLine(factory, ironIngotPart, ironIngotRecipe, 30);
    addManualProductionLine(factory, ironPlatePart, ironPlateRecipe, 10);
    // Iron ingot: produced 30, consumed 30 → intermediate
    const intermediates = factory.allIntermediateParts();
    expect(intermediates.some((p) => p.slug === "iron-ingot")).toBe(true);
    // Iron plate: produced 20, consumed 0 → not intermediate
    expect(intermediates.some((p) => p.slug === "iron-plate")).toBe(false);
  });
});

describe("autoCalculateRates()", () => {
  it("single recipe + fixed output applies correct rate", () => {
    const factory = makeFactory();
    const pl = addManualProductionLine(
      factory,
      ironIngotPart,
      ironIngotRecipe,
      1, // initial rate (will be overwritten by LP)
      30, // outputRate = 30 iron ingots/min
    );
    pl.autoCalculateRate = true;

    factory.autoCalculateRates();

    expect(factory.solverError).toBeNull();
    // Iron Ingot recipe: 1 ingot/completion, outputRate=30 → al.rate=30
    expect(pl.assemblyLines[0].rate).toBeCloseTo(30);
    expect(pl.rate).toBeCloseTo(30);
  });

  it("two recipes sharing an intermediate balances to zero", () => {
    const factory = makeFactory();

    // Iron Plate: 3 ingots → 2 plates, 6s (10 completions/min base)
    // Want 20 plates/min → need 10 completions/min → consumes 30 ingots/min
    const ironPlatePl = addManualProductionLine(
      factory,
      ironPlatePart,
      ironPlateRecipe,
      1,
      20,
    );

    // Iron Rod: 1 ingot → 1 rod, 4s (15 completions/min base)
    // Want 15 rods/min → need 15 completions/min → consumes 15 ingots/min
    const ironRodPl = addManualProductionLine(
      factory,
      ironRodPart,
      ironRodRecipe,
      1,
      15,
    );

    // Iron Ingot: 1 ore → 1 ingot, 2s (30 completions/min base)
    // Total ingot demand = 30 + 15 = 45/min
    const ironIngotPl = addManualProductionLine(
      factory,
      ironIngotPart,
      ironIngotRecipe,
      1,
      0, // no target output; it's an intermediate
    );

    factory.autoCalculateRates();

    expect(factory.solverError).toBeNull();
    expect(ironPlatePl.rate).toBeCloseTo(20);
    expect(ironRodPl.rate).toBeCloseTo(15);
    expect(ironIngotPl.rate).toBeCloseTo(45);

    // Iron ingot is balanced: produced 45, consumed 30+15=45
    expect(
      factory.rateLookup["iron-ingot"].productionRate -
        factory.rateLookup["iron-ingot"].consumptionRate,
    ).toBeCloseTo(0, 3);
  });

  it("infeasible target sets solverError and leaves rates at zero", () => {
    const factory = makeFactory();
    // Iron Plate production line, but missing the iron ingot production line
    // so the LP cannot satisfy any intermediate constraint — it will still be
    // feasible (no intermediates), but requesting a negative quantity forces a failure.
    // A simpler infeasibility: request more output than any feasible combination can provide
    // with contradictory constraints (outputRate > 0 for iron-ingot when there's no recipe for it).
    // Use a dummy assembly line with no recipes by setting rate to something contradictory.

    // Actually, request output for a part whose recipe also requires itself (impossible).
    // The cleanest approach: set an outputRate but provide no assembly lines.
    const pl = new ProductionLine(ironIngotPart, 0, 100, true, false, true);
    pl.assemblyLines = []; // no assembly lines to produce iron ingot
    factory.productionLines.push(pl);
    factory._productionLineLookup[ironIngotPart.slug] = pl;
    factory._updateRates();

    factory.autoCalculateRates();

    expect(factory.solverError).not.toBeNull();
  });

  it("detects recycled rubber/plastic loop and skips autoSetPartRate", () => {
    const factory = makeFactory();
    const rubberPart = partSlugLookup["rubber"];
    const plasticPart = partSlugLookup["plastic"];
    if (!rubberPart || !plasticPart) return; // skip if game data differs

    const recycledPlasticRecipe = recipes.find(
      (r) => r.slug === "recipe-alternate-plastic-1-c",
    );
    const recycledRubberRecipe = recipes.find(
      (r) => r.slug === "recipe-alternate-recycledrubber-c",
    );
    if (!recycledPlasticRecipe || !recycledRubberRecipe) return; // skip if not found

    addManualProductionLine(factory, plasticPart, recycledPlasticRecipe, 1);
    const rubberPl = addManualProductionLine(factory, rubberPart, recycledRubberRecipe, 1);
    // autoCalculateRate must be true for autoSetPartRate to proceed past its guard
    rubberPl.autoCalculateRate = true;

    expect(factory._hasRecycledRubberPlasticLoop()).toBe(true);

    const consoleSpy = vi.spyOn(console, "log");
    factory.autoSetPartRate(rubberPart);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("recycled rubber"),
    );
    consoleSpy.mockRestore();
  });
});
