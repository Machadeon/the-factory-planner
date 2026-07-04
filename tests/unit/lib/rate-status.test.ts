import { describe, expect, it } from "vitest";
import { rateStatusColor } from "@/app/lib/rate-status";

describe("rateStatusColor() — surplusIsGood: false (attention variant)", () => {
  const opts = { surplusIsGood: false };

  it("rounds 0.04 to balanced green", () => {
    expect(rateStatusColor(0.04, opts)).toBe("text-green-500");
  });

  it("colors surplus amber", () => {
    expect(rateStatusColor(0.06, opts)).toBe("text-amber-500");
  });

  it("colors deficit red", () => {
    expect(rateStatusColor(-0.06, opts)).toBe("text-red-500");
  });

  it("colors balanced green", () => {
    expect(rateStatusColor(0, opts)).toBe("text-green-500");
  });
});

describe("rateStatusColor() — surplusIsGood: true", () => {
  const opts = { surplusIsGood: true };

  it("rounds 0.04 to balanced empty string", () => {
    expect(rateStatusColor(0.04, opts)).toBe("");
  });

  it("colors surplus green", () => {
    expect(rateStatusColor(0.06, opts)).toBe("text-green-500");
  });

  it("colors deficit red", () => {
    expect(rateStatusColor(-0.06, opts)).toBe("text-red-500");
  });

  it("returns empty string for balanced", () => {
    expect(rateStatusColor(0, opts)).toBe("");
  });
});

describe("rateStatusColor() — non-finite inputs", () => {
  it("NaN falls to the balanced branch", () => {
    expect(rateStatusColor(Number.NaN, { surplusIsGood: false })).toBe(
      "text-green-500",
    );
    expect(rateStatusColor(Number.NaN, { surplusIsGood: true })).toBe("");
  });

  it("Infinity takes the surplus branch", () => {
    expect(
      rateStatusColor(Number.POSITIVE_INFINITY, { surplusIsGood: false }),
    ).toBe("text-amber-500");
    expect(
      rateStatusColor(Number.POSITIVE_INFINITY, { surplusIsGood: true }),
    ).toBe("text-green-500");
  });

  it("-Infinity takes the deficit branch", () => {
    expect(
      rateStatusColor(Number.NEGATIVE_INFINITY, { surplusIsGood: false }),
    ).toBe("text-red-500");
    expect(
      rateStatusColor(Number.NEGATIVE_INFINITY, { surplusIsGood: true }),
    ).toBe("text-red-500");
  });
});
