import { beforeAll, describe, expect, it } from "vitest";
import AssemblyLine from "@/app/models/assembly-line";
import { partSlugLookup, recipes } from "@/app/models/library";
import type Part from "@/app/models/part";
import type Recipe from "@/app/models/recipe";

// Iron Ingot standard recipe: 1 Iron Ore → 1 Iron Ingot, 2s, Smelter
// Base rate: 60/2 = 30 completions/min at 100% clock
// Smelter: 4 MW base power, 1 max Somersloop slot
let ironIngotRecipe: Recipe;
let ironIngotPart: Part;
let ironOrePart: Part;

beforeAll(() => {
  ironIngotRecipe = recipes.find((r) => r.slug === "recipe-ingotiron-c")!;
  ironIngotPart = partSlugLookup["iron-ingot"];
  ironOrePart = partSlugLookup["iron-ore"];
  if (!ironIngotRecipe) throw new Error("iron ingot recipe not found");
});

describe("getPartProductionRate()", () => {
  it("without sloops returns rate * quantity", () => {
    const al = new AssemblyLine(ironIngotRecipe, 30, 0, 100, 0, false);
    expect(al.getPartProductionRate(ironIngotPart)).toBeCloseTo(30);
  });

  it("with 1 sloop slot (of 1 max) doubles the production rate", () => {
    const al = new AssemblyLine(ironIngotRecipe, 30, 0, 100, 0, false);
    al.sloopedSlots = 1; // directly set to test multiplier, bypassing setSloopedSlots
    // getSloopMultiplier = 1 + 1/1 = 2
    expect(al.getPartProductionRate(ironIngotPart)).toBeCloseTo(60);
  });

  it("with max sloop slots doubles the production rate", () => {
    const al = new AssemblyLine(ironIngotRecipe, 30, 0, 100, 0, false);
    const maxSlots = al.maxSloopSlots(); // 1 for Smelter
    al.sloopedSlots = maxSlots;
    expect(al.getPartProductionRate(ironIngotPart)).toBeCloseTo(
      30 * (1 + maxSlots / maxSlots),
    );
  });

  it("returns 0 for a part not in recipe products", () => {
    const al = new AssemblyLine(ironIngotRecipe, 30, 0, 100, 0, false);
    expect(al.getPartProductionRate(ironOrePart)).toBe(0);
  });
});

describe("getPartConsumptionRate()", () => {
  it("returns rate * ingredient quantity", () => {
    const al = new AssemblyLine(ironIngotRecipe, 30, 0, 100, 0, false);
    // 1 iron ore per completion * 30 completions/min
    expect(al.getPartConsumptionRate(ironOrePart)).toBeCloseTo(30);
  });

  it("scales linearly with rate", () => {
    const al = new AssemblyLine(ironIngotRecipe, 15, 0, 100, 0, false);
    expect(al.getPartConsumptionRate(ironOrePart)).toBeCloseTo(15);
  });

  it("is unaffected by directly setting sloopedSlots", () => {
    const al = new AssemblyLine(ironIngotRecipe, 30, 0, 100, 0, false);
    al.sloopedSlots = 1; // sloops don't affect ingredient consumption
    expect(al.getPartConsumptionRate(ironOrePart)).toBeCloseTo(30);
  });

  it("returns 0 for a part not in recipe ingredients", () => {
    const al = new AssemblyLine(ironIngotRecipe, 30, 0, 100, 0, false);
    expect(al.getPartConsumptionRate(ironIngotPart)).toBe(0);
  });
});

describe("setPartProductionRate() round-trip", () => {
  it("sets rate so getPartProductionRate returns the target", () => {
    const al = new AssemblyLine(ironIngotRecipe, 30, 0, 100, 0, false);
    al.setPartProductionRate(ironIngotPart, 60);
    expect(al.getPartProductionRate(ironIngotPart)).toBeCloseTo(60);
  });

  it("accounts for sloop multiplier when computing rate", () => {
    const al = new AssemblyLine(ironIngotRecipe, 30, 1, 100, 0, false);
    // sloopMultiplier = 2; rate = 45 / quantity / 2 = 22.5
    al.setPartProductionRate(ironIngotPart, 45);
    expect(al.getPartProductionRate(ironIngotPart)).toBeCloseTo(45);
  });
});

describe("setPartConsumptionRate() round-trip", () => {
  it("sets rate so getPartConsumptionRate returns the target", () => {
    const al = new AssemblyLine(ironIngotRecipe, 30, 0, 100, 0, false);
    al.setPartConsumptionRate(ironOrePart, 45);
    expect(al.getPartConsumptionRate(ironOrePart)).toBeCloseTo(45);
    expect(al.rate).toBeCloseTo(45);
  });
});

describe("getMachineCount()", () => {
  // Smelter baseRate = 60/2 = 30/min at 100% clock

  it("allowRemainder=false: computes uniform clock for ceil(machines)", () => {
    // 45/min → 1.5 machines → 2 machines at 75% clock
    const al = new AssemblyLine(ironIngotRecipe, 45, 0, 100, 0, false);
    const result = al.getMachineCount();
    expect("machineCount" in result).toBe(true);
    if ("machineCount" in result) {
      expect(result.machineCount).toBe(2);
      expect(result.uniformClock).toBeCloseTo(75);
    }
  });

  it("allowRemainder=false: 1 machine at exactly 100%", () => {
    const al = new AssemblyLine(ironIngotRecipe, 30, 0, 100, 0, false);
    const result = al.getMachineCount();
    if ("machineCount" in result) {
      expect(result.machineCount).toBe(1);
      expect(result.uniformClock).toBeCloseTo(100);
    }
  });

  it("allowRemainder=true: full machines + remainder clock", () => {
    // 45/min at 100% clock → 1 full machine + remainder
    const al = new AssemblyLine(ironIngotRecipe, 45, 0, 100, 0, true);
    const result = al.getMachineCount();
    expect("fullMachines" in result).toBe(true);
    if ("fullMachines" in result) {
      expect(result.fullMachines).toBe(1);
      expect(result.remainderClock).toBeCloseTo(50); // 15/30 * 100
    }
  });

  it("allowRemainder=true: no remainder when rate is an exact multiple", () => {
    const al = new AssemblyLine(ironIngotRecipe, 60, 0, 100, 0, true);
    const result = al.getMachineCount();
    if ("fullMachines" in result) {
      expect(result.fullMachines).toBe(2);
      expect(result.remainderClock).toBe(0);
    }
  });
});

describe("getPowerConsumption()", () => {
  it("1 machine at 100% clock returns base power", () => {
    const al = new AssemblyLine(ironIngotRecipe, 30, 0, 100, 0, false);
    const { avg } = al.getPowerConsumption();
    // Smelter base power = 4 MW; (100/100)^1.321928 = 1
    expect(avg).toBeCloseTo(4);
  });

  it("applies (clock/100)^1.321928 exponent", () => {
    // 2 machines at uniformClock=75% each
    // rate=45: machineCount=2, uniformClock=(45/(2*30))*100=75
    const al = new AssemblyLine(ironIngotRecipe, 45, 0, 100, 0, false);
    const { avg } = al.getPowerConsumption();
    const expected = 2 * 4 * Math.pow(0.75, 1.321928);
    expect(avg).toBeCloseTo(expected, 3);
  });

  it("applies sloop multiplier (1 + slots/max)^2", () => {
    // 1 machine at 100%, 1 sloop/1 max → sloopFactor = (1+1/1)^2 = 4
    const al = new AssemblyLine(ironIngotRecipe, 30, 1, 100, 0, false);
    const { avg } = al.getPowerConsumption();
    expect(avg).toBeCloseTo(4 * 4); // 16 MW
  });
});

describe("setSloopedSlots()", () => {
  it("halves rate so production rate is preserved", () => {
    const al = new AssemblyLine(ironIngotRecipe, 30, 0, 100, 0, false);
    const before = al.getPartProductionRate(ironIngotPart);
    al.setSloopedSlots(1);
    expect(al.rate).toBeCloseTo(15); // halved
    expect(al.getPartProductionRate(ironIngotPart)).toBeCloseTo(before);
  });

  it("sets powerShards to 3 on first sloop (machineSpeed stays at pre-shard max)", () => {
    const al = new AssemblyLine(ironIngotRecipe, 30, 0, 100, 0, false);
    al.setSloopedSlots(1);
    // powerShards is set to 3 after machineSpeed = maxMachineSpeed(powerShards=0) = 100
    expect(al.powerShards).toBe(3);
    // machineSpeed reflects maxMachineSpeed at the time of the call (powerShards was still 0)
    expect(al.machineSpeed).toBe(100);
  });

  it("removing sloops restores original rate", () => {
    const al = new AssemblyLine(ironIngotRecipe, 30, 0, 100, 0, false);
    al.setSloopedSlots(1);
    al.setSloopedSlots(0);
    expect(al.rate).toBeCloseTo(30);
    expect(al.sloopedSlots).toBe(0);
  });

  it("clamps to [0, maxSloopSlots]", () => {
    const al = new AssemblyLine(ironIngotRecipe, 30, 0, 100, 0, false);
    al.setSloopedSlots(999);
    expect(al.sloopedSlots).toBe(al.maxSloopSlots());
    al.setSloopedSlots(-1);
    expect(al.sloopedSlots).toBe(0);
  });

  it("no-ops on FactoryRecipe", () => {
    const mockFactoryRecipe = {
      isFactoryRecipe: true as const,
      slug: "factory:test",
      name: "Test",
      ingredients: [],
      products: [],
      getIngredient: () => undefined,
      getProduct: () => undefined,
    };
    const al = new AssemblyLine(mockFactoryRecipe, 1, 0, 100, 0, false);
    al.setSloopedSlots(1);
    expect(al.sloopedSlots).toBe(0);
    expect(al.rate).toBe(1);
  });
});
