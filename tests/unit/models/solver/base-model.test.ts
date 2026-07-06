import type { ConstraintBound } from "javascript-lp-solver";
import { describe, expect, it, vi } from "vitest";
import { defaultResourceLimits, recipes } from "@/app/models/game-data";
import type { RecipeLike } from "@/app/models/recipe-like";
import {
  createBaseModel,
  mergeConstraint,
} from "@/app/models/solver/base-model";

function findRecipe(slug: string): RecipeLike {
  // biome-ignore lint/style/noNonNullAssertion: recipes exist in test data
  return recipes.find((r) => r.slug === slug)!;
}

describe("createBaseModel (rate-solver R3)", () => {
  it("R3.S1 raw-resource limits, lockouts, and recipe variables match the pre-move shape", () => {
    const ironIngot = findRecipe("recipe-ingotiron-c");
    const model = createBaseModel([ironIngot], []);

    // _raw_ variable + max limit per nonzero-limit raw resource
    expect(model.constraints["_raw_iron-ore"]).toEqual({
      max: defaultResourceLimits["iron-ore"],
    });
    expect(model.variables["_raw_iron-ore"]).toEqual({
      "_raw_iron-ore": 1,
      "iron-ore": 1,
    });
    expect(model.constraints["iron-ore"]).toEqual({ min: 0 });

    // zero-limit raw resources are locked out: min 0, no _raw_ variable
    const zeroLimited = Object.entries(defaultResourceLimits).find(
      ([, limit]) => limit === 0,
    );
    if (zeroLimited) {
      expect(model.constraints[zeroLimited[0]]).toEqual({ min: 0 });
      expect(model.variables[`_raw_${zeroLimited[0]}`]).toBeUndefined();
    }

    // recipe variable carries -ingredient/+product coefficients
    const coeff = model.variables["recipe-ingotiron-c"];
    expect(coeff["iron-ore"]).toBeLessThan(0);
    expect(coeff["iron-ingot"]).toBeGreaterThan(0);

    // no factory recipes → no ints block
    expect((model as { ints?: Record<string, 1> }).ints).toBeUndefined();
    expect(model.optimize).toBe("_obj");
  });

  it("R3.S1 factory constraints overlay onto _raw_ when a raw variable exists, else the part", () => {
    const ironIngot = findRecipe("recipe-ingotiron-c");
    const model = createBaseModel(
      [ironIngot],
      [
        { partSlug: "iron-ore", max: 120 }, // raw → lands on _raw_iron-ore
        { partSlug: "iron-ingot", min: 10 }, // non-raw → lands on the part
      ],
    );

    expect(model.constraints["_raw_iron-ore"]).toEqual({ max: 120 });
    expect(model.constraints["iron-ingot"]).toEqual({ min: 10 });
  });

  it("R3.S3 intermediate-part guard: equal:0 gains min 0, min:5 overwritten to 0, equal:10 untouched", () => {
    const ironIngot = findRecipe("recipe-ingotiron-c");
    const ironPlate = findRecipe("recipe-ironplate-c");

    // iron-ingot is intermediate (produced by ingot recipe, consumed by plate recipe)
    const equalZero = createBaseModel(
      [ironIngot, ironPlate],
      [{ partSlug: "iron-ingot", equal: 0 }],
    );
    expect(equalZero.constraints["iron-ingot"]).toEqual({ equal: 0, min: 0 });

    const minFive = createBaseModel(
      [ironIngot, ironPlate],
      [{ partSlug: "iron-ingot", min: 5 }],
    );
    expect(minFive.constraints["iron-ingot"]).toEqual({ min: 0 });

    const equalTen = createBaseModel(
      [ironIngot, ironPlate],
      [{ partSlug: "iron-ingot", equal: 10 }],
    );
    expect(equalTen.constraints["iron-ingot"]).toEqual({ equal: 10 });
  });
});

describe("mergeConstraint (rate-solver R3.S2)", () => {
  it("sets a missing constraint outright", () => {
    const c: Record<string, ConstraintBound> = {};
    mergeConstraint(c, "x", { min: 3 });
    expect(c.x).toEqual({ min: 3 });
  });

  it("conflicting equals warn and keep the existing bound", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const c: Record<string, ConstraintBound> = { x: { equal: 5 } };
    mergeConstraint(c, "x", { equal: 7 });
    expect(c.x).toEqual({ equal: 5 });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("existing equal wins over incoming min/max", () => {
    const c: Record<string, ConstraintBound> = { x: { equal: 5 } };
    mergeConstraint(c, "x", { min: 1, max: 9 });
    expect(c.x).toEqual({ equal: 5 });
  });

  it("incoming equal replaces existing min/max", () => {
    const c: Record<string, ConstraintBound> = { x: { min: 1, max: 9 } };
    mergeConstraint(c, "x", { equal: 4 });
    expect(c.x).toEqual({ equal: 4 });
  });

  it("min only rises, max only falls", () => {
    const c: Record<string, ConstraintBound> = { x: { min: 2, max: 10 } };
    mergeConstraint(c, "x", { min: 5, max: 8 });
    expect(c.x).toEqual({ min: 5, max: 8 });
    mergeConstraint(c, "x", { min: 1, max: 20 });
    expect(c.x).toEqual({ min: 5, max: 8 });
  });
});
