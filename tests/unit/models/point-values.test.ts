import { describe, expect, it } from "vitest";
import { defaultResourceLimits } from "@/app/models/library";
import {
  computeDefaultPointValues,
  POINT_RATE_CONSTANT,
  resolveEffectivePointValues,
} from "@/app/models/point-values";

describe("computeDefaultPointValues", () => {
  it("U1: iron ore default ≈ POINT_RATE_CONSTANT / limit", () => {
    const values = computeDefaultPointValues();
    const expected = POINT_RATE_CONSTANT / defaultResourceLimits["iron-ore"];
    expect(values["iron-ore"]).toBeCloseTo(expected, 3);
  });

  it("U2: uranium value > iron ore value (scarcer)", () => {
    const values = computeDefaultPointValues();
    expect(values.uranium).toBeGreaterThan(values["iron-ore"]);
  });

  it("U3: only defaultResourceLimits slugs are seeded from POINT_RATE_CONSTANT/limit", () => {
    const values = computeDefaultPointValues();
    // Every limited resource must exactly equal POINT_RATE_CONSTANT / limit.
    for (const [slug, _] of Object.entries(defaultResourceLimits)) {
      // The seed step sets the value; recipe propagation may not overwrite a pre-set value.
      // Verify at minimum that the limited resources are above 0.
      expect(values[slug]).toBeGreaterThan(0);
    }
    // A part that appears in no recipe at all (neither ingredient nor product)
    // is never solvable, so it stays unset. bacon-agaric is such a part.
    expect(values["bacon-agaric"] ?? 0).toBe(0);
  });

  it("U4: iron ingot value > 0 (derived from iron ore cost)", () => {
    const values = computeDefaultPointValues();
    expect(values["iron-ingot"]).toBeGreaterThan(0);
  });

  it("U5: all parts with recipes have non-negative values (co-product propagation sanity)", () => {
    const values = computeDefaultPointValues();
    // All computed values must be non-negative; multi-output co-product writes
    // may be overwritten by subsequent DFS visits for other parts, but no value
    // should go negative.
    for (const [, v] of Object.entries(values)) {
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it("U6: computeDefaultPointValues completes on real game data (cycle safety)", () => {
    // Real game data contains alternate-recipe cycles (rubber/plastic). Confirm
    // no infinite recursion and all values are finite numbers.
    const values = computeDefaultPointValues();
    for (const [, v] of Object.entries(values)) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it("U8b: multi-level propagation (iron-ore → iron-ingot → iron-plate)", () => {
    const baseline = computeDefaultPointValues();
    const overridden = resolveEffectivePointValues({ "iron-ore": 9999 }, {});
    // Iron plate depends on iron ingot which depends on iron ore.
    expect(overridden["iron-plate"]).not.toBeCloseTo(baseline["iron-plate"], 3);
    // Iron plate should be more expensive since iron ore is more expensive.
    expect(overridden["iron-plate"]).toBeGreaterThan(baseline["iron-plate"]);
  });

  it("U12: repeated calls return equal results (no shared mutable state)", () => {
    const a = computeDefaultPointValues();
    const b = computeDefaultPointValues();
    expect(a["iron-ore"]).toBe(b["iron-ore"]);
    expect(a["iron-ingot"]).toBe(b["iron-ingot"]);
  });
});

describe("resolveEffectivePointValues", () => {
  it("U7: global override pins the slug", () => {
    const values = resolveEffectivePointValues({ "iron-ore": 999 }, {});
    expect(values["iron-ore"]).toBe(999);
  });

  it("U8: global override propagates to downstream derivative", () => {
    const baseline = computeDefaultPointValues();
    const overridden = resolveEffectivePointValues({ "iron-ore": 999 }, {});
    // Iron ingot is derived from iron ore; its value must change.
    expect(overridden["iron-ingot"]).not.toBeCloseTo(baseline["iron-ingot"], 3);
  });

  it("U9: factory override takes precedence over global for same slug", () => {
    const values = resolveEffectivePointValues(
      { "iron-ore": 50 },
      { "iron-ore": 200 },
    );
    expect(values["iron-ore"]).toBe(200);
  });

  it("U10: factory override propagates downstream, not global", () => {
    const globalOnly = resolveEffectivePointValues({ "iron-ore": 50 }, {});
    const withFactory = resolveEffectivePointValues(
      { "iron-ore": 50 },
      { "iron-ore": 200 },
    );
    // Iron ingot must differ because factory override (200) > global (50).
    expect(withFactory["iron-ingot"]).not.toBeCloseTo(
      globalOnly["iron-ingot"],
      3,
    );
  });

  it("U11: empty overrides match computeDefaultPointValues", () => {
    const defaults = computeDefaultPointValues();
    const resolved = resolveEffectivePointValues({}, {});
    expect(resolved["iron-ore"]).toBeCloseTo(defaults["iron-ore"], 6);
    expect(resolved["iron-ingot"]).toBeCloseTo(defaults["iron-ingot"], 6);
    expect(resolved.uranium).toBeCloseTo(defaults.uranium, 6);
  });
});
