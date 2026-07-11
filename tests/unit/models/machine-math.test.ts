import { describe, expect, it } from "vitest";
import { shardsForClock, totalMachines } from "@/app/models/assembly-line";

describe("shardsForClock (R1.S1)", () => {
  it("returns shards at clock boundaries", () => {
    expect(shardsForClock(100)).toBe(0);
    expect(shardsForClock(101)).toBe(1);
    expect(shardsForClock(150)).toBe(1);
    expect(shardsForClock(151)).toBe(2);
    expect(shardsForClock(250)).toBe(3);
    expect(shardsForClock(50)).toBe(0);
  });
});

describe("totalMachines (R2.S1)", () => {
  it("handles all discriminated machine-count shapes", () => {
    expect(
      totalMachines({ kind: "remainder", fullMachines: 3, remainderClock: 50 }),
    ).toBe(4);
    expect(
      totalMachines({ kind: "remainder", fullMachines: 3, remainderClock: 0 }),
    ).toBe(3);
    expect(
      totalMachines({ kind: "uniform", machineCount: 4, uniformClock: 75 }),
    ).toBe(4);
    expect(
      totalMachines({ kind: "remainder", fullMachines: 0, remainderClock: 0 }),
    ).toBe(0);
  });
});
