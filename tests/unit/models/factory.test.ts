import { beforeAll, describe, expect, it } from "vitest";
import AssemblyLine from "@/app/models/assembly-line";
import Factory from "@/app/models/factory";
import FactoryRecipe from "@/app/models/factory-recipe";
import {
  deserializeFactory,
  serializeFactory,
} from "@/app/models/factory-storage";
import {
  defaultResourceLimits,
  partSlugLookup,
  recipes,
} from "@/app/models/game-data";
import type Part from "@/app/models/part";
import ProductionLine from "@/app/models/production-line";
import type Recipe from "@/app/models/recipe";

let ironIngotRecipe: Recipe;
let ironPlateRecipe: Recipe;
let ironRodRecipe: Recipe;
let ironIngotPart: Part;
let _ironOrePart: Part;
let ironPlatePart: Part;
let ironRodPart: Part;

beforeAll(() => {
  // biome-ignore lint/style/noNonNullAssertion: recipes should exist in test data
  ironIngotRecipe = recipes.find((r) => r.slug === "recipe-ingotiron-c")!;
  // biome-ignore lint/style/noNonNullAssertion: recipes should exist in test data
  ironPlateRecipe = recipes.find((r) => r.slug === "recipe-ironplate-c")!;
  // biome-ignore lint/style/noNonNullAssertion: recipes should exist in test data
  ironRodRecipe = recipes.find((r) => r.slug === "recipe-ironrod-c")!;
  ironIngotPart = partSlugLookup["iron-ingot"];
  _ironOrePart = partSlugLookup["iron-ore"];
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
  const pl = new ProductionLine(
    part,
    0,
    outputRate,
    outputRate > 0,
    false,
    true,
  );
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

  it("drops lookup entries for production lines removed via direct array replacement (R1.S1)", () => {
    const factory = makeFactory();
    addManualProductionLine(factory, ironIngotPart, ironIngotRecipe, 30);
    addManualProductionLine(factory, ironPlatePart, ironPlateRecipe, 10);

    // Bypass removeProductionLine, mirroring
    // OptimizationSection.rejectAllSuggestions.
    factory.productionLines = factory.productionLines.filter(
      (pl) => pl.part.slug !== "iron-plate",
    );
    factory._updateRates();

    expect(factory._productionLineLookup["iron-plate"]).toBeUndefined();
  });

  it("allows re-adding a part after wholesale removal via direct array replacement (R1.S2)", () => {
    const factory = makeFactory();
    addManualProductionLine(factory, ironPlatePart, ironPlateRecipe, 10);

    factory.productionLines = factory.productionLines.filter(
      (pl) => pl.part.slug !== "iron-plate",
    );
    factory._updateRates();

    factory.addProductionLine(ironPlatePart);

    expect(
      factory.productionLines.some((pl) => pl.part.slug === "iron-plate"),
    ).toBe(true);
  });

  it("creates a fresh, tracked production line when re-optimizing after reject-all removed it (R1.S3)", () => {
    const factory = makeFactory();
    factory.optimizer.targets = [{ partSlug: "iron-plate", rate: 30 }];

    factory.optimizeRecipes();
    expect(factory.solverError).toBeNull();
    expect(
      factory.productionLines.some((pl) => pl.part.slug === "iron-plate"),
    ).toBe(true);

    // Simulate OptimizationSection.rejectAllSuggestions: strip auto-created
    // lines via direct array replacement, bypassing removeProductionLine.
    factory.productionLines = factory.productionLines.filter(
      (pl) => !pl.autoCreated,
    );
    factory._updateRates();

    factory.optimizeRecipes();

    expect(factory.solverError).toBeNull();
    expect(
      factory.productionLines.some((pl) => pl.part.slug === "iron-plate"),
    ).toBe(true);
  });

  it("keeps the lookup in sync with normal add/remove API calls (R1.S4)", () => {
    const factory = makeFactory();
    factory.addProductionLine(ironPlatePart);
    factory.addProductionLine(ironIngotPart);

    factory.removeProductionLine(ironPlatePart);
    factory.addProductionLine(ironRodPart);

    expect(Object.keys(factory._productionLineLookup).sort()).toEqual(
      ["iron-ingot", "iron-rod"].sort(),
    );
  });

  it("keeps the untouched line's entry after a partial removal via direct array replacement (R1.S5)", () => {
    const factory = makeFactory();
    addManualProductionLine(factory, ironIngotPart, ironIngotRecipe, 30);
    addManualProductionLine(factory, ironPlatePart, ironPlateRecipe, 10);

    factory.productionLines = factory.productionLines.filter(
      (pl) => pl.part.slug !== "iron-ingot",
    );
    factory._updateRates();

    expect(factory._productionLineLookup["iron-ingot"]).toBeUndefined();
    expect(factory._productionLineLookup["iron-plate"]).toBeTruthy();
  });

  it("empties the lookup once all production lines are removed via direct array replacement (R1.S6)", () => {
    const factory = makeFactory();
    addManualProductionLine(factory, ironIngotPart, ironIngotRecipe, 30);
    addManualProductionLine(factory, ironPlatePart, ironPlateRecipe, 10);

    factory.productionLines = [];
    factory._updateRates();

    expect(Object.keys(factory._productionLineLookup)).toHaveLength(0);
  });

  it("is idempotent across repeated calls with no changes (R1.S7)", () => {
    const factory = makeFactory();
    addManualProductionLine(factory, ironIngotPart, ironIngotRecipe, 30);
    addManualProductionLine(factory, ironPlatePart, ironPlateRecipe, 10);

    const before = { ...factory._productionLineLookup };
    factory._updateRates();
    const after = factory._productionLineLookup;

    expect(Object.keys(after).sort()).toEqual(Object.keys(before).sort());
    expect(after["iron-ingot"]).toBe(before["iron-ingot"]);
    expect(after["iron-plate"]).toBe(before["iron-plate"]);
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
    addManualProductionLine(
      factory,
      ironIngotPart,
      ironIngotRecipe,
      0.000050001,
    );
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
    addManualProductionLine(
      supplierFactory,
      ironIngotPart,
      ironIngotRecipe,
      30,
    );
    const supplierRecipe = new FactoryRecipe(
      "supplier-id",
      "Iron Factory",
      supplierFactory,
    );
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

  it("does not stack-overflow when recipe cycle exists (Fuel ↔ Packaged Fuel)", () => {
    // Regression: autoSetPartRate → setPartRate → autoSetPartRate → ... infinite loop
    // when two production lines form a cycle via their recipe ingredients.
    const factory = makeFactory();
    const liquidFuelPart = partSlugLookup.fuel;
    const packagedFuelPart = partSlugLookup["packaged-fuel"];
    if (!liquidFuelPart || !packagedFuelPart) return;

    // "Unpackage Fuel": consumes packaged-fuel, produces liquid-fuel + fluid-canister
    const unpackageFuelRecipe = recipes.find(
      (r) => r.slug === "recipe-unpackagefuel-c",
    );
    // "Packaged Fuel": consumes liquid-fuel + fluid-canister, produces packaged-fuel
    const packagedFuelRecipe = recipes.find((r) => r.slug === "recipe-fuel-c");
    if (!unpackageFuelRecipe || !packagedFuelRecipe) return;

    const liquidFuelPl = addManualProductionLine(
      factory,
      liquidFuelPart,
      unpackageFuelRecipe,
      10,
    );
    liquidFuelPl.autoCalculateRate = true;

    const packagedFuelPl = addManualProductionLine(
      factory,
      packagedFuelPart,
      packagedFuelRecipe,
      10,
    );
    packagedFuelPl.autoCalculateRate = true;

    // Should not throw RangeError: Maximum call stack size exceeded
    expect(() => factory.autoSetPartRate(liquidFuelPart)).not.toThrow();
    expect(() => factory.autoSetPartRate(packagedFuelPart)).not.toThrow();
  });

  it("detects recycled rubber/plastic loop and skips autoSetPartRate", () => {
    const factory = makeFactory();
    const rubberPart = partSlugLookup.rubber;
    const plasticPart = partSlugLookup.plastic;
    if (!rubberPart || !plasticPart) return; // skip if game data differs

    const recycledPlasticRecipe = recipes.find(
      (r) => r.slug === "recipe-alternate-plastic-1-c",
    );
    const recycledRubberRecipe = recipes.find(
      (r) => r.slug === "recipe-alternate-recycledrubber-c",
    );
    if (!recycledPlasticRecipe || !recycledRubberRecipe) return; // skip if not found

    addManualProductionLine(factory, plasticPart, recycledPlasticRecipe, 1);
    const rubberPl = addManualProductionLine(
      factory,
      rubberPart,
      recycledRubberRecipe,
      1,
    );
    // autoCalculateRate must be true for autoSetPartRate to proceed past its guard
    rubberPl.autoCalculateRate = true;

    expect(factory._hasRecycledRubberPlasticLoop()).toBe(true);

    // Loop is detected, so autoSetPartRate returns early without touching the
    // production line rate (and without recursing into a stack overflow).
    const rateBefore = rubberPl.rate;
    expect(() => factory.autoSetPartRate(rubberPart)).not.toThrow();
    expect(rubberPl.rate).toBe(rateBefore);
  });
});

describe("autoCalculateRates() — constraints (Item 7)", () => {
  it("user constraint caps raw-input consumption", () => {
    const factory = makeFactory();
    const pl = addManualProductionLine(
      factory,
      ironIngotPart,
      ironIngotRecipe,
      1,
      30,
    );
    pl.autoCalculateRate = true;
    // iron-ingot recipe: 1 ore → 1 ingot per completion
    // outputRate=30 needs 30 ore/min — cap at 30 → exactly feasible
    factory.constraints = [{ partSlug: "iron-ore", max: 30 }];
    factory.autoCalculateRates();

    expect(factory.solverError).toBeNull();
    expect(pl.rate).toBeCloseTo(30);
  });

  it("constraint tighter than target causes solverError", () => {
    const factory = makeFactory();
    const pl = addManualProductionLine(
      factory,
      ironIngotPart,
      ironIngotRecipe,
      1,
      40,
    );
    pl.autoCalculateRate = true;
    // outputRate=40 requires 40 ore/min, but cap is 30 → infeasible
    factory.constraints = [{ partSlug: "iron-ore", max: 30 }];
    factory.autoCalculateRates();

    expect(factory.solverError).not.toBeNull();
  });
});

describe("autoCalculateRates() — deferred constraint verification", () => {
  // Regression: the deferred verify loop used to negate the rateLookup entry for
  // each `_raw_` resource in place to measure net consumption. The negation was
  // never restored, so a raw input's net flipped sign and it was reclassified as
  // a byproduct output on the next render (e.g. after a manual save).
  it("does not mutate rateLookup, so raw inputs stay inputs", async () => {
    const factory = makeFactory();
    const pl = addManualProductionLine(
      factory,
      ironIngotPart,
      ironIngotRecipe,
      1,
      30, // 30 ingots/min → consumes 30 iron-ore/min
    );
    pl.autoCalculateRate = true;

    factory.autoCalculateRates();
    // Let the deferred (setTimeout) constraint-verification pass run.
    await new Promise((resolve) => setTimeout(resolve, 0));

    const oreRate = factory.rateLookup["iron-ore"];
    expect(oreRate.consumptionRate).toBeCloseTo(30);
    expect(oreRate.productionRate).toBeCloseTo(0);

    const inputSlugs = factory.allInputs().map((p) => p.slug);
    const outputSlugs = factory.allOutputs().map((p) => p.slug);
    expect(inputSlugs).toContain("iron-ore");
    expect(outputSlugs).not.toContain("iron-ore");
  });

  // Regression: the equal-constraint violation message interpolated `constraint.min`
  // instead of `constraint.equal`, so it always read "must be exactly undefined/min".
  // These tests force each branch to fire by mutating rateLookup after the solve —
  // the deferred verify closure reads `this.rateLookup` live when the setTimeout
  // fires (per the test above), so this reliably targets one specific branch
  // without depending on the LP solver producing an out-of-tolerance result.
  it("equal-constraint violation message names the equal target, not min", async () => {
    const factory = makeFactory();
    addManualProductionLine(
      factory,
      ironIngotPart,
      ironIngotRecipe,
      1,
      30, // fixed-rate target → { equal: 30 } constraint on iron-ingot
    );

    factory.autoCalculateRates();
    // Force the solved net rate away from the equal target before verification runs.
    factory.rateLookup["iron-ingot"].productionRate = 25;

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(factory.solverError).toContain("exactly 30/min");
    expect(factory.solverError).not.toContain("undefined");
  });

  it("min-constraint violation message is unaffected by the equal-message fix", async () => {
    const factory = makeFactory();
    addManualProductionLine(factory, ironIngotPart, ironIngotRecipe, 1);
    factory.constraints = [{ partSlug: "iron-ingot", min: 20 }];

    factory.autoCalculateRates();
    factory.rateLookup["iron-ingot"].productionRate = 10;

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(factory.solverError).toContain("20/min or greater");
  });

  it("max-constraint violation message is unaffected by the equal-message fix", async () => {
    const factory = makeFactory();
    addManualProductionLine(factory, ironIngotPart, ironIngotRecipe, 1);
    factory.constraints = [{ partSlug: "iron-ingot", max: 40 }];

    factory.autoCalculateRates();
    factory.rateLookup["iron-ingot"].productionRate = 50;

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(factory.solverError).toContain("40/min or less");
  });
});

describe("autoCalculateRates() — maximize output (Item 8)", () => {
  it("maximizeOutput finds rate bounded by user constraint", () => {
    const factory = makeFactory();
    const pl = addManualProductionLine(
      factory,
      ironIngotPart,
      ironIngotRecipe,
      1,
      0,
    );
    pl.maximizeOutput = true;
    factory.constraints = [{ partSlug: "iron-ore", max: 60 }];
    factory.autoCalculateRates();

    expect(factory.solverError).toBeNull();
    expect(pl.rate).toBeCloseTo(60);
  });

  it("maximizeOutput solves for constrained rate", () => {
    const factory = makeFactory();
    const pl = addManualProductionLine(
      factory,
      ironIngotPart,
      ironIngotRecipe,
      1,
      0,
    );
    pl.maximizeOutput = true;
    factory.constraints = [{ partSlug: "iron-ore", max: 20 }];
    factory.autoCalculateRates();

    expect(pl.rate).toBeCloseTo(20);
  });

  it("maximizeOutput bounded by DEFAULT_RESOURCE_LIMITS when no user constraint", () => {
    const factory = makeFactory();
    const pl = addManualProductionLine(
      factory,
      ironIngotPart,
      ironIngotRecipe,
      1,
      0,
    );
    pl.maximizeOutput = true;
    // No user constraint — default limit applies
    factory.autoCalculateRates();

    expect(factory.solverError).toBeNull();
    expect(pl.rate).toBeCloseTo(defaultResourceLimits["iron-ore"]);
  });

  it("two maximize lines sharing raw input respect combined limit", () => {
    const factory = makeFactory();
    const ironIngotPl = addManualProductionLine(
      factory,
      ironIngotPart,
      ironIngotRecipe,
      1,
      0,
    );
    const ironPlatePl = addManualProductionLine(
      factory,
      ironPlatePart,
      ironPlateRecipe,
      1,
      0,
    );
    const ironRodPl = addManualProductionLine(
      factory,
      ironRodPart,
      ironRodRecipe,
      1,
      0,
    );
    ironPlatePl.maximizeOutput = true;
    ironRodPl.maximizeOutput = true;

    // Iron ore capped at 30/min; iron-ingot is intermediate
    factory.constraints = [{ partSlug: "iron-ore", max: 30 }];
    factory.autoCalculateRates();

    expect(factory.solverError).toBeNull();
    // All ore should be consumed (LP maximizes until hitting constraint)
    expect(ironIngotPl.rate).toBeCloseTo(30);
    // Both maximize lines are solved
    expect(ironRodPl.rate).toBeGreaterThan(0);
  });
});

describe("serialization — constraints + maximizeOutput", () => {
  it("round-trips constraints and maximizeOutput through serialize/deserialize", () => {
    const factory = makeFactory();
    const pl = addManualProductionLine(
      factory,
      ironIngotPart,
      ironIngotRecipe,
      30,
      30,
    );
    pl.maximizeOutput = true;
    factory.constraints = [{ partSlug: "iron-ore", max: 60 }];

    const serialized = serializeFactory(factory, {
      id: "test-id",
      name: "Test",
      folderId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    expect(serialized.constraints).toEqual([{ partSlug: "iron-ore", max: 60 }]);
    expect(serialized.productionLines[0].maximizeOutput).toBe(true);

    const restored = deserializeFactory(serialized);
    expect(restored).not.toBeNull();
    expect(restored?.constraints).toEqual([{ partSlug: "iron-ore", max: 60 }]);
    expect(restored?.productionLines[0].maximizeOutput).toBe(true);
  });

  it("deserialize defaults constraints to [] and maximizeOutput to false", () => {
    const factory = makeFactory();
    addManualProductionLine(factory, ironIngotPart, ironIngotRecipe, 30, 30);

    const serialized = serializeFactory(factory, {
      id: "test-id2",
      name: "Test2",
      folderId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Strip optional fields to simulate old save data
    delete (serialized as { constraints?: unknown }).constraints;
    for (const pl of serialized.productionLines) {
      delete (pl as { maximizeOutput?: unknown }).maximizeOutput;
    }

    const restored = deserializeFactory(serialized);
    expect(restored).not.toBeNull();
    expect(restored?.constraints).toEqual([]);
    expect(restored?.productionLines[0].maximizeOutput).toBe(false);
  });
});

describe("targetConstraints()", () => {
  it("maps fixed-rate targets to the fixed map", () => {
    const factory = makeFactory();
    factory.optimizer.targets = [{ partSlug: "iron-plate", rate: 20 }];
    const { fixed, maximize } = factory.targetConstraints();
    expect(fixed.get("iron-plate")).toBe(20);
    expect(maximize.size).toBe(0);
  });

  it("maps maximize targets to the maximize set and ignores their rate", () => {
    const factory = makeFactory();
    factory.optimizer.targets = [
      { partSlug: "iron-plate", rate: 20, maximize: true },
    ];
    const { fixed, maximize } = factory.targetConstraints();
    expect(maximize.has("iron-plate")).toBe(true);
    expect(fixed.has("iron-plate")).toBe(false);
  });

  it("ignores fixed targets with missing or non-positive rate", () => {
    const factory = makeFactory();
    factory.optimizer.targets = [
      { partSlug: "iron-plate" },
      { partSlug: "iron-rod", rate: 0 },
    ];
    const { fixed } = factory.targetConstraints();
    expect(fixed.size).toBe(0);
  });
});

describe("serialization — optimizer targets", () => {
  const meta = {
    id: "test-id",
    name: "Test",
    folderId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("round-trips optimizer.targets", () => {
    const factory = makeFactory();
    factory.optimizer.targets = [
      { partSlug: "power", rate: 100000 },
      { partSlug: "iron-plate", maximize: true },
    ];

    const restored = deserializeFactory(serializeFactory(factory, meta));
    expect(restored?.optimizer.targets).toEqual([
      { partSlug: "power", rate: 100000 },
      { partSlug: "iron-plate", maximize: true },
    ]);
  });

  it("defaults targets to [] for legacy saves without the field", () => {
    const factory = makeFactory();
    const serialized = serializeFactory(factory, meta);
    // Simulate old save data predating optimizer.targets
    delete (serialized.optimizer as { targets?: unknown }).targets;

    const restored = deserializeFactory(serialized);
    expect(restored?.optimizer.targets).toEqual([]);
  });
});
