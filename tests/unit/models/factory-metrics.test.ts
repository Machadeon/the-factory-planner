import { beforeAll, describe, expect, it } from "vitest";
import AssemblyLine, { totalMachines } from "@/app/models/assembly-line";
import Factory from "@/app/models/factory";
import {
  availableOutputsFrom,
  factoryFloorArea,
  getTotalPower,
  getTotalShards,
  getTotalSloops,
} from "@/app/models/factory-metrics";
import FactoryRecipe from "@/app/models/factory-recipe";
import { partSlugLookup, recipes } from "@/app/models/game-data";
import ProductionLine from "@/app/models/production-line";
import type Recipe from "@/app/models/recipe";

let ironIngotRecipe: Recipe;

beforeAll(() => {
  // biome-ignore lint/style/noNonNullAssertion: recipe exists in test data
  ironIngotRecipe = recipes.find((r) => r.slug === "recipe-ingotiron-c")!;
});

function ingotFactory(rate: number, shards = 0, speed = 100): Factory {
  const f = new Factory();
  const pl = new ProductionLine(
    partSlugLookup["iron-ingot"],
    0,
    rate,
    true,
    false,
  );
  pl.assemblyLines = [
    new AssemblyLine({
      recipe: ironIngotRecipe,
      rate,
      machineSpeed: speed,
      powerShards: shards,
      allowRemainder: false,
    }),
  ];
  f.productionLines.push(pl);
  f._updateRates();
  return f;
}

describe("factory-metrics (R1.S1, R2.S2)", () => {
  it("R1.S1 all five functions are exported and callable", () => {
    const f = ingotFactory(30);
    expect(getTotalPower(f)).toEqual(
      expect.objectContaining({ avg: expect.any(Number) }),
    );
    expect(typeof getTotalShards(f)).toBe("number");
    expect(typeof getTotalSloops(f)).toBe("number");
    expect(typeof factoryFloorArea(f)).toBe("number");
    expect(Array.isArray(availableOutputsFrom(f))).toBe(true);
  });

  it("R2.S2 machine-line metrics match the per-line formulas", () => {
    const f = ingotFactory(30, 1, 150);
    const al = f.productionLines[0].assemblyLines[0];
    const machines = totalMachines(al.getMachineCount());
    const building = ironIngotRecipe.building;

    expect(getTotalPower(f).avg).toBeCloseTo(al.getPowerConsumption().avg, 6);
    expect(getTotalShards(f)).toBe(al.getTotalShards());
    expect(getTotalSloops(f)).toBe(al.sloopedSlots * machines);
    expect(factoryFloorArea(f)).toBeCloseTo(
      machines * building.size.width * building.size.length,
      6,
    );
  });

  it("R2.S2 factory-recipe lines contribute rate × per-instance values", () => {
    const nested = ingotFactory(30, 1, 150);
    const fr = new FactoryRecipe("nested-id", "Nested", nested);

    const outer = new Factory();
    const pl = new ProductionLine(
      partSlugLookup["iron-ingot"],
      0,
      0,
      true,
      false,
    );
    pl.assemblyLines = [
      new AssemblyLine({ recipe: fr, rate: 2, allowRemainder: true }),
    ];
    outer.productionLines.push(pl);
    outer._updateRates();

    expect(getTotalPower(outer).avg).toBeCloseTo(2 * fr.avgPowerPerInstance, 6);
    expect(getTotalShards(outer)).toBeCloseTo(2 * fr.shardsPerInstance, 6);
    expect(getTotalSloops(outer)).toBeCloseTo(2 * fr.sloopsPerInstance, 6);
    expect(factoryFloorArea(outer)).toBeCloseTo(
      2 * fr.footprintAreaPerInstance,
      6,
    );
  });

  it("R2.S2 availableOutputsFrom returns net-positive outputs only", () => {
    const f = ingotFactory(30);
    const outputs = availableOutputsFrom(f);
    expect(outputs).toContainEqual({
      part: partSlugLookup["iron-ingot"],
      rate: expect.closeTo(30, 1),
    });
    expect(outputs.some((o) => o.part.slug === "iron-ore")).toBe(false);
  });
});
