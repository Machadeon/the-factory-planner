// R1 objective-accumulation scenarios, re-anchored from
// factory-auto-calculate-rates-objective.test.ts to the pure solveRates path
// (rate-solver spec R1.S1–S6).
import type { ModelDefinition, SolveResult } from "javascript-lp-solver";
import solver from "javascript-lp-solver";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as baseModel from "@/app/models/solver/base-model";
import { solveRates } from "@/app/models/solver/rate-solver";

vi.mock("javascript-lp-solver", () => ({
  default: { Solve: vi.fn() },
}));

vi.mock("@/app/models/solver/base-model", () => ({
  createBaseModel: vi.fn(),
  mergeConstraint: vi.fn(),
}));

function riggedModel(coefficients: Record<string, number>): ModelDefinition {
  return {
    optimize: "_obj",
    constraints: {},
    variables: { rigged: { ...coefficients } },
  };
}

function lastModelArg(): ModelDefinition {
  return vi.mocked(solver.Solve).mock.calls[0][0] as ModelDefinition;
}

function solveWithRig(
  coefficients: Record<string, number>,
  maxTargets: Set<string> = new Set(),
) {
  vi.mocked(baseModel.createBaseModel).mockReturnValue(
    riggedModel(coefficients),
  );
  solveRates({
    recipes: [],
    rateTargets: new Map(),
    maxTargets,
    factoryConstraints: [],
  });
}

describe("solveRates minimize-inputs objective accumulation (R1)", () => {
  beforeEach(() => {
    vi.mocked(solver.Solve).mockClear();
    vi.mocked(solver.Solve).mockReturnValue({
      feasible: false,
      result: 0,
    } as SolveResult);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("R1.S1 sums two raw-resource-linked coefficients, order 1", () => {
    solveWithRig({ "_raw_iron-ore": 3, "_raw_copper-ore": 5 });
    expect(lastModelArg().variables.rigged._obj).toBe(8);
  });

  it("R1.S1 sums two raw-resource-linked coefficients, order 2 (values swapped)", () => {
    solveWithRig({ "_raw_iron-ore": 5, "_raw_copper-ore": 3 });
    expect(lastModelArg().variables.rigged._obj).toBe(8);
  });

  it("R1.S2 sums three raw-resource-linked coefficients, ordering A", () => {
    solveWithRig({ "_raw_iron-ore": 2, _raw_coal: 4, "_raw_copper-ore": 6 });
    expect(lastModelArg().variables.rigged._obj).toBe(12);
  });

  it("R1.S2 sums three raw-resource-linked coefficients, ordering B (rotated)", () => {
    solveWithRig({ "_raw_iron-ore": 6, _raw_coal: 2, "_raw_copper-ore": 4 });
    expect(lastModelArg().variables.rigged._obj).toBe(12);
  });

  it("R1.S2a sums mixed-sign coefficients algebraically, order 1", () => {
    solveWithRig({ "_raw_iron-ore": 10, "_raw_copper-ore": -4 });
    expect(lastModelArg().variables.rigged._obj).toBe(6);
  });

  it("R1.S2a sums mixed-sign coefficients algebraically, order 2 (swapped)", () => {
    solveWithRig({ "_raw_iron-ore": -4, "_raw_copper-ore": 10 });
    expect(lastModelArg().variables.rigged._obj).toBe(6);
  });

  it("R1.S3 ignores a zero-valued raw-resource key", () => {
    solveWithRig({ "_raw_iron-ore": 7, "_raw_copper-ore": 0 });
    expect(lastModelArg().variables.rigged._obj).toBe(7);
  });

  it("R1.S4 single raw-resource key is unaffected", () => {
    solveWithRig({ "_raw_iron-ore": 9 });
    expect(lastModelArg().variables.rigged._obj).toBe(9);
  });

  it("R1.S5 no raw-resource key leaves _obj unset", () => {
    solveWithRig({});
    expect(lastModelArg().variables.rigged._obj).toBeUndefined();
  });

  it("R1.S6 maximizeOutput branch assigns _obj directly (no accumulation)", () => {
    solveWithRig({ "iron-ingot": 4 }, new Set(["iron-ingot"]));
    expect(lastModelArg().variables.rigged._obj).toBe(4);
    expect(lastModelArg().opType).toBe("max");
  });
});
