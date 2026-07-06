import type { ConstraintBound } from "javascript-lp-solver";
import { describe, expect, it, vi } from "vitest";
import type { Rate } from "@/app/models/factory";
import { verifyConstraints } from "@/app/models/solver/verify";

function rates(entries: {
  [slug: string]: { consumptionRate: number; productionRate: number };
}): { [partSlug: string]: Rate } {
  return entries;
}

describe("verifyConstraints (rate-solver-verification)", () => {
  it("R1.S1/R1.S3 violations carry their own bound kind and limit", () => {
    const constraints: Record<string, ConstraintBound> = {
      "iron-ingot": { equal: 30 },
      "iron-plate": { min: 20 },
      "iron-rod": { max: 40 },
    };
    const lookup = rates({
      "iron-ingot": { consumptionRate: 0, productionRate: 25 },
      "iron-plate": { consumptionRate: 0, productionRate: 10 },
      "iron-rod": { consumptionRate: 0, productionRate: 50 },
    });

    const violations = verifyConstraints(constraints, lookup);

    expect(violations).toContainEqual({
      partSlug: "iron-ingot",
      bound: "equal",
      limit: 30,
      actual: 25,
    });
    expect(violations).toContainEqual({
      partSlug: "iron-plate",
      bound: "min",
      limit: 20,
      actual: 10,
    });
    expect(violations).toContainEqual({
      partSlug: "iron-rod",
      bound: "max",
      limit: 40,
      actual: 50,
    });
    expect(violations).toHaveLength(3);
  });

  it("returns no violations when all bounds are satisfied", () => {
    const constraints: Record<string, ConstraintBound> = {
      "iron-ingot": { equal: 30 },
    };
    const lookup = rates({
      "iron-ingot": { consumptionRate: 0, productionRate: 30 },
    });

    expect(verifyConstraints(constraints, lookup)).toEqual([]);
  });

  it("R2.S2 _raw_ constraints net consumption-first without mutating rateLookup", () => {
    const constraints: Record<string, ConstraintBound> = {
      "_raw_iron-ore": { max: 60 },
    };
    const entry = { consumptionRate: 90, productionRate: 0 };
    const lookup = rates({ "iron-ore": entry });

    const violations = verifyConstraints(constraints, lookup);

    expect(violations).toEqual([
      { partSlug: "iron-ore", bound: "max", limit: 60, actual: 90 },
    ]);
    expect(entry).toEqual({ consumptionRate: 90, productionRate: 0 });
  });

  it("R3.S1 zero equal bound violated", () => {
    const violations = verifyConstraints(
      { "iron-ingot": { equal: 0 } },
      rates({ "iron-ingot": { consumptionRate: 0, productionRate: 5 } }),
    );
    expect(violations).toEqual([
      { partSlug: "iron-ingot", bound: "equal", limit: 0, actual: 5 },
    ]);
  });

  it("R3.S2 zero max bound violated", () => {
    const violations = verifyConstraints(
      { "iron-ingot": { max: 0 } },
      rates({ "iron-ingot": { consumptionRate: 0, productionRate: 5 } }),
    );
    expect(violations).toEqual([
      { partSlug: "iron-ingot", bound: "max", limit: 0, actual: 5 },
    ]);
  });

  it("R3.S3 zero min bound satisfied", () => {
    const violations = verifyConstraints(
      { "iron-ingot": { min: 0 } },
      rates({ "iron-ingot": { consumptionRate: 0, productionRate: 5 } }),
    );
    expect(violations).toEqual([]);
  });

  it("skips constraints for parts missing from rateLookup or part data", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const violations = verifyConstraints(
      {
        "not-in-lookup": { min: 5 },
        "no-such-part-slug-xyz": { min: 5 },
      },
      rates({
        "no-such-part-slug-xyz": { consumptionRate: 0, productionRate: 0 },
      }),
    );
    expect(violations).toEqual([]);
    warn.mockRestore();
  });
});

describe("supply-augmented parts (raw resources)", () => {
  it("skips the min bound for a part with a _raw_ sibling constraint", () => {
    const violations = verifyConstraints(
      {
        "_raw_iron-ore": { max: 780 },
        "iron-ore": { min: 0 },
      },
      {
        // consumed from raw supply: net production is legitimately negative
        "iron-ore": { consumptionRate: 30, productionRate: 0 },
      },
    );
    expect(violations).toEqual([]);
  });

  it("still checks min for parts without a _raw_ sibling", () => {
    const violations = verifyConstraints(
      { "iron-ingot": { min: 0 } },
      { "iron-ingot": { consumptionRate: 30, productionRate: 0 } },
    );
    expect(violations).toEqual([
      { partSlug: "iron-ingot", bound: "min", limit: 0, actual: -30 },
    ]);
  });
});
