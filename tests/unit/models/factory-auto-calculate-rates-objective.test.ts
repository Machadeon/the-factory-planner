// Phase M2 (plans/model-refactor.md) relocates the objective-building logic
// tested here to solver/rate-solver.ts — move this test alongside it then.
import type { ModelDefinition, SolveResult } from "javascript-lp-solver";
import solver from "javascript-lp-solver";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Factory from "@/app/models/factory";
import { partSlugLookup } from "@/app/models/game-data";
import ProductionLine from "@/app/models/production-line";

vi.mock("javascript-lp-solver", () => ({
  default: { Solve: vi.fn() },
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

describe("autoCalculateRates() minimize-inputs objective accumulation", () => {
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
    const factory = new Factory();
    vi.spyOn(Factory.prototype, "createBaseModel").mockReturnValue(
      riggedModel({ "_raw_iron-ore": 3, "_raw_copper-ore": 5 }),
    );

    factory.autoCalculateRates();

    expect(lastModelArg().variables.rigged._obj).toBe(8);
  });

  it("R1.S1 sums two raw-resource-linked coefficients, order 2 (values swapped across positions)", () => {
    const factory = new Factory();
    vi.spyOn(Factory.prototype, "createBaseModel").mockReturnValue(
      riggedModel({ "_raw_iron-ore": 5, "_raw_copper-ore": 3 }),
    );

    factory.autoCalculateRates();

    expect(lastModelArg().variables.rigged._obj).toBe(8);
  });

  it("R1.S2 sums three raw-resource-linked coefficients, ordering A", () => {
    const factory = new Factory();
    vi.spyOn(Factory.prototype, "createBaseModel").mockReturnValue(
      riggedModel({ "_raw_iron-ore": 2, _raw_coal: 4, "_raw_copper-ore": 6 }),
    );

    factory.autoCalculateRates();

    expect(lastModelArg().variables.rigged._obj).toBe(12);
  });

  it("R1.S2 sums three raw-resource-linked coefficients, ordering B (values rotated across positions)", () => {
    const factory = new Factory();
    vi.spyOn(Factory.prototype, "createBaseModel").mockReturnValue(
      riggedModel({ "_raw_iron-ore": 6, _raw_coal: 2, "_raw_copper-ore": 4 }),
    );

    factory.autoCalculateRates();

    expect(lastModelArg().variables.rigged._obj).toBe(12);
  });

  it("R1.S2a sums mixed-sign coefficients algebraically, order 1", () => {
    const factory = new Factory();
    vi.spyOn(Factory.prototype, "createBaseModel").mockReturnValue(
      riggedModel({ "_raw_iron-ore": 10, "_raw_copper-ore": -4 }),
    );

    factory.autoCalculateRates();

    expect(lastModelArg().variables.rigged._obj).toBe(6);
  });

  it("R1.S2a sums mixed-sign coefficients algebraically, order 2 (values swapped across positions)", () => {
    const factory = new Factory();
    vi.spyOn(Factory.prototype, "createBaseModel").mockReturnValue(
      riggedModel({ "_raw_iron-ore": -4, "_raw_copper-ore": 10 }),
    );

    factory.autoCalculateRates();

    expect(lastModelArg().variables.rigged._obj).toBe(6);
  });

  it("R1.S3 ignores a zero-valued raw-resource key", () => {
    const factory = new Factory();
    vi.spyOn(Factory.prototype, "createBaseModel").mockReturnValue(
      riggedModel({ "_raw_iron-ore": 7, "_raw_copper-ore": 0 }),
    );

    factory.autoCalculateRates();

    expect(lastModelArg().variables.rigged._obj).toBe(7);
  });

  it("R1.S4 single raw-resource key is unaffected", () => {
    const factory = new Factory();
    vi.spyOn(Factory.prototype, "createBaseModel").mockReturnValue(
      riggedModel({ "_raw_iron-ore": 9 }),
    );

    factory.autoCalculateRates();

    expect(lastModelArg().variables.rigged._obj).toBe(9);
  });

  it("R1.S5 no raw-resource key leaves _obj unset", () => {
    const factory = new Factory();
    vi.spyOn(Factory.prototype, "createBaseModel").mockReturnValue(
      riggedModel({}),
    );

    factory.autoCalculateRates();

    expect(lastModelArg().variables.rigged._obj).toBeUndefined();
  });

  it("R1.S6 maximizeOutput branch is unaffected by this fix", () => {
    const factory = new Factory();
    const part = partSlugLookup["iron-ingot"];
    const pl = new ProductionLine(part, 0, 0, false, false, true);
    pl.maximizeOutput = true;
    factory.productionLines.push(pl);

    vi.spyOn(Factory.prototype, "createBaseModel").mockReturnValue(
      riggedModel({ [part.slug]: 4 }),
    );

    factory.autoCalculateRates();

    // maximizeOutput assigns _obj directly (no accumulation) — unaffected by the fix.
    expect(lastModelArg().variables.rigged._obj).toBe(4);
  });
});
