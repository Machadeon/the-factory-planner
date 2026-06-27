import { beforeAll, describe, expect, it } from "vitest";
import Factory, { type ScoringObjective } from "@/app/models/factory";
import { partSlugLookup } from "@/app/models/library";

function makeFactory(): Factory {
  const f = new Factory();
  f.update = () => {
    f._updateRates();
  };
  // Overwrite so each solve starts from a clean, deterministic slate.
  f.optimizer.overwrite = true;
  return f;
}

function netRate(f: Factory, slug: string): number {
  const r = f.rateLookup[slug];
  if (!r) return 0;
  return r.productionRate - r.consumptionRate;
}

/** Every assembly line's recipe product slugs across the whole factory. */
function producedSlugs(f: Factory): Set<string> {
  const set = new Set<string>();
  for (const pl of f.productionLines)
    for (const al of pl.assemblyLines)
      for (const prod of al.recipe.products) set.add(prod.part.slug);
  return set;
}

beforeAll(() => {
  // sanity: the parts/recipes the tests rely on exist in the bundled data.
  expect(partSlugLookup["iron-plate"]).toBeTruthy();
  expect(partSlugLookup["iron-ingot"]).toBeTruthy();
});

describe("optimizeRecipes() — target satisfaction", () => {
  const objectives: ScoringObjective[] = [
    "minResources",
    "sinkPoints",
    "power",
    "buildings",
    "logistics",
    "inputValue",
  ];

  for (const objective of objectives) {
    it(`meets a fixed target under the "${objective}" objective`, () => {
      const f = makeFactory();
      f.optimizer.objective = objective;
      f.optimizer.targets = [{ partSlug: "iron-plate", rate: 30 }];

      f.optimizeRecipes();

      expect(f.solverError).toBeNull();
      expect(f._productionLineLookup["iron-plate"]).toBeTruthy();
      expect(netRate(f, "iron-plate")).toBeCloseTo(30, 1);
      // The chain bottoms out at raw ore, not free-floating ingots.
      expect(producedSlugs(f).has("iron-plate")).toBe(true);
    });
  }

  it("produces no side-effect outputs in sinkPoints mode", () => {
    const f = makeFactory();
    f.optimizer.objective = "sinkPoints";
    f.optimizer.targets = [{ partSlug: "iron-plate", rate: 30 }];

    f.optimizeRecipes();

    expect(f.solverError).toBeNull();
    // The only net-positive output is the target; every other part nets to ~0
    // (no recipes spun up just to dump sinkable surplus).
    for (const [slug, rate] of Object.entries(f.rateLookup)) {
      const net = rate.productionRate - rate.consumptionRate;
      if (slug === "iron-plate") expect(net).toBeCloseTo(30, 1);
      else expect(net).toBeLessThan(0.0001);
    }
  });

  it("does nothing when there are no targets", () => {
    const f = makeFactory();
    f.optimizeRecipes();
    expect(f.productionLines).toHaveLength(0);
    expect(f.solverError).toBe("Nothing to optimize");
  });
});

describe("optimizeRecipes() — available part priority", () => {
  it("consumes an available intermediate instead of producing it", () => {
    const f = makeFactory();
    f.optimizer.objective = "buildings";
    f.optimizer.targets = [{ partSlug: "iron-plate", rate: 30 }];
    // Plenty of free iron ingot on hand: the optimizer should never build a
    // recipe that produces iron ingot.
    f.optimizer.availableParts = [{ partSlug: "iron-ingot", rate: 1000 }];

    f.optimizeRecipes();

    expect(f.solverError).toBeNull();
    expect(netRate(f, "iron-plate")).toBeCloseTo(30, 1);
    expect(producedSlugs(f).has("iron-ingot")).toBe(false);
  });

  it("treats a hard-limited input as the only source (infeasible below demand)", () => {
    const f = makeFactory();
    f.optimizer.objective = "buildings";
    f.optimizer.targets = [{ partSlug: "iron-plate", rate: 30 }];
    // Only 1/min of ingot available and the optimizer may not make more, so a
    // 30/min plate target cannot be satisfied.
    f.optimizer.availableParts = [
      { partSlug: "iron-ingot", rate: 1, hardLimit: true },
    ];

    f.optimizeRecipes();

    expect(f.solverError).toBeTruthy();
    expect(producedSlugs(f).has("iron-ingot")).toBe(false);
  });
});

describe("optimizeRecipes() — maximize target", () => {
  it("maximizes output within resource caps", () => {
    const f = makeFactory();
    f.optimizer.objective = "buildings";
    f.optimizer.targets = [{ partSlug: "iron-plate", maximize: true }];

    f.optimizeRecipes();

    expect(f.solverError).toBeNull();
    expect(netRate(f, "iron-plate")).toBeGreaterThan(0);
  });
});
