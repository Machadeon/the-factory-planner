import { describe, expect, it } from "vitest";
import { recipes } from "@/app/models/game-data";
import type Recipe from "@/app/models/recipe";
import { solveRates } from "@/app/models/solver/rate-solver";

// biome-ignore lint/style/noNonNullAssertion: recipe exists in test data
const ironIngotRecipe = recipes.find((r) => r.slug === "recipe-ingotiron-c")!;

describe("solveRates (rate-solver R2.S1) — pure, deterministic, no Factory", () => {
  it("solves a fixed-rate target from hand-built input", () => {
    const input = {
      recipes: [ironIngotRecipe as Recipe],
      rateTargets: new Map([["iron-ingot", 30]]),
      maxTargets: new Set<string>(),
      factoryConstraints: [],
    };

    const result = solveRates(input);

    expect(result.feasible).toBe(true);
    if (!result.feasible) return;
    const productQty =
      // biome-ignore lint/style/noNonNullAssertion: recipe produces iron ingot
      ironIngotRecipe.getProduct("iron-ingot")!.quantity;
    expect(result.ratesBySlug.get("recipe-ingotiron-c")).toBeCloseTo(
      30 / productQty,
      3,
    );
    // the built model rides along for the verify step
    expect(result.model.constraints["iron-ingot"]).toEqual({ equal: 30 });
  });

  it("returns the same result on repeated calls with the same input", () => {
    const input = {
      recipes: [ironIngotRecipe as Recipe],
      rateTargets: new Map([["iron-ingot", 30]]),
      maxTargets: new Set<string>(),
      factoryConstraints: [],
    };

    const a = solveRates(input);
    const b = solveRates(input);

    expect(a.feasible).toBe(true);
    expect(b.feasible).toBe(true);
    if (!a.feasible || !b.feasible) return;
    expect([...a.ratesBySlug.entries()]).toEqual([...b.ratesBySlug.entries()]);
  });

  it("reports infeasible without throwing", () => {
    const input = {
      recipes: [],
      rateTargets: new Map([["iron-ingot", 30]]),
      maxTargets: new Set<string>(),
      factoryConstraints: [],
    };

    const result = solveRates(input);

    expect(result.feasible).toBe(false);
  });
});
