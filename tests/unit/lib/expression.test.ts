import { describe, expect, it } from "vitest";
import { calculate } from "@/app/lib/expression";

describe("calculate() — golden results", () => {
  it("evaluates precedence", () => {
    expect(calculate("1 + 2 * 3")).toBe(7);
  });

  it("evaluates unary minus with exponent via Math.pow semantics", () => {
    expect(calculate("-2 ^ 2")).toBe(4);
  });

  it("evaluates functions inside expressions", () => {
    expect(calculate("min(3, 2) * 4")).toBe(8);
  });

  it("normalizes -0 results", () => {
    expect(Object.is(calculate("0 - 0"), -0)).toBe(false);
    expect(calculate("0 - 0")).toBe(0);
  });

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
});

describe("calculate() — error behavior", () => {
  it("throws on double '.' in a number", () => {
    expect(() => calculate("1..2")).toThrow("Double '.' in number");
  });

  it("throws on space inside a number", () => {
    expect(() => calculate("1 2")).toThrow("Space in number");
  });

  it("throws on consecutive operators", () => {
    expect(() => calculate("1 +* 2")).toThrow("Consecutive operators");
    expect(() => calculate("1 ++ 2")).toThrow("Consecutive operators");
  });

  it("throws on invalid characters", () => {
    expect(() => calculate("abc")).toThrow("Invalid characters");
    expect(() => calculate("invalid!!")).toThrow("Invalid characters");
  });

  it("throws on unmatched opening parenthesis", () => {
    expect(() => calculate("(1 + 2")).toThrow("Parentheses mismatch");
  });

  it("throws on unmatched closing parenthesis", () => {
    expect(() => calculate("1 + 2)")).toThrow("Parentheses mismatch");
  });

  it("throws on misplaced comma", () => {
    expect(() => calculate("1 , 2")).toThrow("Misplaced ','");
  });

  it("returns NaN without throwing for empty or whitespace input", () => {
    expect(calculate("")).toBeNaN();
    expect(calculate("   ")).toBeNaN();
  });
});
