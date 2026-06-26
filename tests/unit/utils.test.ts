import { describe, expect, it } from "vitest";
import {
  calculate,
  displayNum,
  getColorClassForProductionRate1,
  getColorClassForProductionRate2,
} from "@/app/utils";

describe("calculate()", () => {
  it("evaluates arithmetic expressions", () => {
    expect(calculate("60*3+30")).toBe(210);
    expect(calculate("100/4")).toBe(25);
    expect(calculate("2^8")).toBe(256);
  });

  it("evaluates sqrt", () => {
    expect(calculate("sqrt(144)")).toBe(12);
  });

  it("evaluates min/max functions", () => {
    expect(calculate("min(30,60)")).toBe(30);
    expect(calculate("max(30,60)")).toBe(60);
  });

  it("throws on invalid input", () => {
    expect(() => calculate("invalid!!")).toThrow();
    expect(() => calculate("1 ++ 2")).toThrow();
  });
});

describe("displayNum()", () => {
  it("rounds to 1 decimal place", () => {
    expect(displayNum(1.05)).toBe("1.1");
    expect(displayNum(1.04)).toBe("1");
    expect(displayNum(123.456)).toBe("123.5");
  });

  it("displays integers without decimals", () => {
    expect(displayNum(42)).toBe("42");
    expect(displayNum(0)).toBe("0");
  });

  it("converts -0 to '0'", () => {
    expect(displayNum(-0)).toBe("0");
  });
});

describe("getColorClassForProductionRate1()", () => {
  it("returns amber for positive surplus", () => {
    expect(getColorClassForProductionRate1(5)).toBe("text-amber-500");
  });

  it("returns red for deficit", () => {
    expect(getColorClassForProductionRate1(-5)).toBe("text-red-500");
  });

  it("returns green for zero", () => {
    expect(getColorClassForProductionRate1(0)).toBe("text-green-500");
  });

  it("treats values that round to 0 as zero", () => {
    expect(getColorClassForProductionRate1(0.04)).toBe("text-green-500");
    expect(getColorClassForProductionRate1(-0.04)).toBe("text-green-500");
  });
});

describe("getColorClassForProductionRate2()", () => {
  it("returns green for positive surplus", () => {
    expect(getColorClassForProductionRate2(5)).toBe("text-green-500");
  });

  it("returns red for deficit", () => {
    expect(getColorClassForProductionRate2(-5)).toBe("text-red-500");
  });

  it("returns empty string for zero", () => {
    expect(getColorClassForProductionRate2(0)).toBe("");
  });
});
