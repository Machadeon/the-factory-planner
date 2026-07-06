import { describe, expect, it } from "vitest";
import { displayNum, formatRate, rateUnit } from "@/app/lib/format";
import { partSlugLookup } from "@/app/models/game-data";

const power = partSlugLookup.power;
const ironPlate = partSlugLookup["iron-plate"];

describe("displayNum()", () => {
  it("formats with at most one fraction digit", () => {
    expect(displayNum(1234.56)).toBe((1234.6).toLocaleString());
  });

  it("normalizes -0 to 0", () => {
    expect(displayNum(-0.04)).toBe("0");
  });

  it("renders integers without fraction digits", () => {
    expect(displayNum(7)).toBe("7");
  });
});

describe("rateUnit()", () => {
  it("returns MW for the power part", () => {
    expect(rateUnit(power)).toBe("MW");
  });

  it("returns /min for other parts", () => {
    expect(rateUnit(ironPlate)).toBe("/min");
  });
});

describe("formatRate()", () => {
  it("formats power with a space before MW", () => {
    expect(formatRate(power, 63)).toBe("63 MW");
  });

  it("formats other parts with /min and no space", () => {
    expect(formatRate(ironPlate, 63)).toBe("63/min");
  });

  it("uses displayNum for the numeric portion", () => {
    expect(formatRate(ironPlate, 1234.56)).toBe(`${displayNum(1234.56)}/min`);
  });
});
