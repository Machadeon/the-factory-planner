import { describe, expect, it } from "vitest";
import { formatSolverError } from "@/app/lib/format-solver-error";

describe("formatSolverError (rate-solver-verification R4.S1)", () => {
  it("conflicting-goals reproduces the current wording with displayNum numerics", () => {
    const text = formatSolverError({
      kind: "conflicting-goals",
      partSlug: "iron-plate",
      targetRate: 30,
      lineRate: 1234.5678,
    });
    expect(text).toBe(
      "Conflicting goals for Iron Plate: production target requires 30 but production line requires 1,234.6",
    );
  });

  it("nothing-to-optimize", () => {
    expect(formatSolverError({ kind: "nothing-to-optimize" })).toBe(
      "Nothing to optimize",
    );
  });

  it("infeasible-recipes keeps the 'No feasible' prefix and names targets", () => {
    const text = formatSolverError({
      kind: "infeasible-recipes",
      targets: [
        { partSlug: "iron-plate", rate: 30 },
        { partSlug: "iron-rod", maximize: true },
      ],
    });
    expect(text).toBe(
      "No feasible recipe selection for Iron Plate (30/min), Iron Rod (maximize) with the enabled recipes and available inputs.",
    );
  });

  it("infeasible-rates keeps the 'No feasible' prefix", () => {
    expect(formatSolverError({ kind: "infeasible-rates" })).toBe(
      "No feasible solution",
    );
  });

  it("constraint-violations joins per-bound messages in the current skeleton", () => {
    const text = formatSolverError({
      kind: "constraint-violations",
      violations: [
        { partSlug: "iron-ingot", bound: "equal", limit: 30, actual: 25 },
        { partSlug: "iron-plate", bound: "min", limit: 20, actual: 10.25 },
        { partSlug: "iron-rod", bound: "max", limit: 40, actual: 50 },
      ],
    });
    expect(text).toBe(
      "No feasible solution! One or more constraints could not be satisified: " +
        "Iron Ingot must be exactly 30/min, but is 25/min; " +
        "Iron Plate must be 20/min or greater, but is 10.3/min; " +
        "Iron Rod must be 40/min or less, but is 50/min.",
    );
    expect(text).not.toContain("undefined");
  });
});
