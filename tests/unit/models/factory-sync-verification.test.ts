// Wrapper-level synchronous verification (rate-solver-verification R2.S1):
// the solver is mocked to return a feasible solution whose rates violate a
// constraint, so verification must flag it with no timer flush.
import type { SolveResult } from "javascript-lp-solver";
import solver from "javascript-lp-solver";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AssemblyLine from "@/app/models/assembly-line";
import Factory from "@/app/models/factory";
import { partSlugLookup, recipes } from "@/app/models/game-data";
import ProductionLine from "@/app/models/production-line";
import type Recipe from "@/app/models/recipe";

vi.mock("javascript-lp-solver", () => ({
  default: { Solve: vi.fn() },
}));

// biome-ignore lint/style/noNonNullAssertion: recipe exists in test data
const ironIngotRecipe = recipes.find((r) => r.slug === "recipe-ingotiron-c")!;

function makeFactoryWithTarget(outputRate: number): Factory {
  const factory = new Factory();
  const pl = new ProductionLine(
    partSlugLookup["iron-ingot"],
    0,
    outputRate,
    true,
    false,
    true,
  );
  pl.assemblyLines = [
    new AssemblyLine(ironIngotRecipe as Recipe, 0, 0, 100, 0, false),
  ];
  factory.productionLines.push(pl);
  factory._updateRates();
  return factory;
}

describe("autoCalculateRates synchronous verification (R2.S1)", () => {
  beforeEach(() => {
    vi.mocked(solver.Solve).mockReset();
  });

  it("sets constraint-violations on return with exactly one update()", () => {
    const factory = makeFactoryWithTarget(30);
    const update = vi.fn(() => factory._updateRates());
    factory.update = update;

    // Feasible per the solver, but the returned rate underproduces the
    // { equal: 30 } target (25/min instead of 30).
    const productQty =
      // biome-ignore lint/style/noNonNullAssertion: recipe produces iron ingot
      (ironIngotRecipe as Recipe).getProduct("iron-ingot")!.quantity;
    vi.mocked(solver.Solve).mockReturnValue({
      feasible: true,
      result: 0,
      "recipe-ingotiron-c": 25 / productQty,
    } as SolveResult);

    factory.autoCalculateRates();

    // Synchronous: violation present immediately, no await.
    expect(factory.solverError).not.toBeNull();
    expect(factory.solverError?.kind).toBe("constraint-violations");
    if (factory.solverError?.kind !== "constraint-violations") return;
    expect(factory.solverError.violations).toContainEqual(
      expect.objectContaining({
        partSlug: "iron-ingot",
        bound: "equal",
        limit: 30,
      }),
    );
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("leaves solverError null and still notifies once when constraints hold", () => {
    const factory = makeFactoryWithTarget(30);
    const update = vi.fn(() => factory._updateRates());
    factory.update = update;

    const productQty =
      // biome-ignore lint/style/noNonNullAssertion: recipe produces iron ingot
      (ironIngotRecipe as Recipe).getProduct("iron-ingot")!.quantity;
    vi.mocked(solver.Solve).mockReturnValue({
      feasible: true,
      result: 0,
      "recipe-ingotiron-c": 30 / productQty,
    } as SolveResult);

    factory.autoCalculateRates();

    expect(factory.solverError).toBeNull();
    expect(update).toHaveBeenCalledTimes(1);
  });
});
