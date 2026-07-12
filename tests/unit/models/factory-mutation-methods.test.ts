import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import AssemblyLine from "@/app/models/assembly-line";
import Factory from "@/app/models/factory";
import { partSlugLookup, recipes } from "@/app/models/game-data";
import type Part from "@/app/models/part";
import ProductionLine from "@/app/models/production-line";
import type Recipe from "@/app/models/recipe";

let ironIngotRecipe: Recipe;
let ironPlateRecipe: Recipe;
let ironIngotPart: Part;
let ironPlatePart: Part;

beforeAll(() => {
  // biome-ignore lint/style/noNonNullAssertion: fixtures exist in game data
  ironIngotRecipe = recipes.find((r) => r.slug === "recipe-ingotiron-c")!;
  // biome-ignore lint/style/noNonNullAssertion: fixtures exist in game data
  ironPlateRecipe = recipes.find((r) => r.slug === "recipe-ironplate-c")!;
  ironIngotPart = partSlugLookup["iron-ingot"];
  ironPlatePart = partSlugLookup["iron-plate"];
});

function addLine(
  factory: Factory,
  part: Part,
  recipe: Recipe,
  rate: number,
  outputRate = 0,
): ProductionLine {
  const pl = new ProductionLine(part, rate, outputRate, outputRate > 0, false);
  pl.assemblyLines = [
    new AssemblyLine({ recipe, rate, allowRemainder: false }),
  ];
  factory.productionLines.push(pl);
  factory._productionLineLookup[part.slug] = pl;
  factory._updateRates();
  return pl;
}

/** Spy on the recompute/solve seams so a mutator's choice is observable. */
function spies(factory: Factory) {
  return {
    update: vi.spyOn(factory, "_updateRates"),
    solve: vi.spyOn(factory, "autoCalculateRates"),
    optimize: vi.spyOn(factory, "optimizeRecipes"),
    propagate: vi.spyOn(factory, "autoSetPartRate"),
  };
}

describe("R1 — model holds no render callback", () => {
  it("R1.S1 — no update field or this.update() call in factory.ts", () => {
    const src = readFileSync(
      join(process.cwd(), "app/models/factory.ts"),
      "utf8",
    );
    expect(src).not.toMatch(/^\s*update\s*:/m);
    expect(src).not.toMatch(/this\.update\(/);
  });

  it("R1.S2 — Factory constructor takes no arguments", () => {
    expect(Factory.length).toBe(0);
  });
});

describe("R2 — rate-affecting mutators recompute", () => {
  it("R2.S1 — add assembly line leaves rateLookup consistent", () => {
    const factory = new Factory();
    const pl = addLine(factory, ironIngotPart, ironIngotRecipe, 30);
    factory.addAssemblyLine(pl, ironIngotRecipe);
    expect(factory.rateLookup["iron-ingot"].productionRate).toBeGreaterThan(0);
  });

  it("R2.S3/S4 — solver error is set then cleared", () => {
    const factory = new Factory();
    addLine(factory, ironPlatePart, ironPlateRecipe, 20, 20);
    // Producing plate needs iron-ingot; forcing ingot to exactly 0 is infeasible.
    factory.setConstraints([{ partSlug: "iron-ingot", equal: 0 }]);
    expect(factory.solverError).not.toBeNull();
    factory.setConstraints([]);
    expect(factory.solverError).toBeNull();
  });
});

describe("R3 — presentation mutators do not recompute", () => {
  it("R3.S1 — setNodePosition / pruneGraphLayout skip recompute", () => {
    const factory = new Factory();
    const s = spies(factory);
    factory.setNodePosition("node-1", { x: 5, y: 6 });
    factory.pruneGraphLayout(new Set(["node-1"]));
    expect(factory.graphLayout["node-1"]).toEqual({ x: 5, y: 6 });
    expect(s.update).not.toHaveBeenCalled();
    expect(s.solve).not.toHaveBeenCalled();
  });

  it("R3.S2 — setIcon skips recompute", () => {
    const factory = new Factory();
    const s = spies(factory);
    factory.setIcon("icon.png");
    expect(factory.icon).toBe("icon.png");
    expect(s.update).not.toHaveBeenCalled();
    expect(s.solve).not.toHaveBeenCalled();
  });
});

describe("R5 — per-mutator recompute semantics (preserved verbatim)", () => {
  it("R5.S1 — clock/remainder/machine-count edits recompute only, never re-solve", () => {
    const factory = new Factory();
    const pl = addLine(factory, ironPlatePart, ironPlateRecipe, 20, 20);
    const al = pl.assemblyLines[0];
    const s = spies(factory);
    factory.setClockSpeed(al, 150);
    factory.setAllowRemainder(al, true);
    factory.setMachineCount(al, 2);
    expect(s.solve).not.toHaveBeenCalled();
    expect(s.update).toHaveBeenCalled();
  });

  it("R5.S2 — sloop re-solves when any outputRate>0, else recompute only", () => {
    const withOutput = new Factory();
    const plO = addLine(withOutput, ironPlatePart, ironPlateRecipe, 20, 20);
    const so = spies(withOutput);
    withOutput.setSloopedSlots(plO.assemblyLines[0], 1);
    expect(so.solve).toHaveBeenCalled();

    const noOutput = new Factory();
    const plN = addLine(noOutput, ironPlatePart, ironPlateRecipe, 20, 0);
    const sn = spies(noOutput);
    noOutput.setSloopedSlots(plN.assemblyLines[0], 1);
    expect(sn.solve).not.toHaveBeenCalled();
    expect(sn.update).toHaveBeenCalled();
  });

  it("R5.S3 — output-rate, maximize, constraint edits re-solve", () => {
    const factory = new Factory();
    const pl = addLine(factory, ironPlatePart, ironPlateRecipe, 20, 20);
    const s = spies(factory);
    factory.setOutputRate(pl, 40);
    factory.setMaximizeOutput(pl, true);
    factory.setConstraints([]);
    expect(s.solve).toHaveBeenCalledTimes(3);
  });

  it("R5.S4 — optimizer-config and point-override edits recompute only", () => {
    const factory = new Factory();
    addLine(factory, ironPlatePart, ironPlateRecipe, 20, 20);
    const s = spies(factory);
    factory.setOptimizerConfig({ ...factory.optimizer, phase: 2 });
    factory.setPartPointOverride("iron-ore", 5);
    expect(s.solve).not.toHaveBeenCalled();
    expect(s.optimize).not.toHaveBeenCalled();
    expect(s.update).toHaveBeenCalled();
  });

  it("R5.S5 — auto-calc toggle: enable propagates, disable recomputes only", () => {
    const factory = new Factory();
    const pl = addLine(factory, ironPlatePart, ironPlateRecipe, 20, 0);
    const s = spies(factory);
    factory.setAutoCalculateRate(pl, true);
    expect(s.propagate).toHaveBeenCalled();
    s.propagate.mockClear();
    factory.setAutoCalculateRate(pl, false);
    expect(s.propagate).not.toHaveBeenCalled();
    expect(s.update).toHaveBeenCalled();
  });

  it("R5.S6 — supplier/line structural edits recompute only", () => {
    const factory = new Factory();
    const pl = addLine(factory, ironIngotPart, ironIngotRecipe, 30);
    const s = spies(factory);
    factory.addAssemblyLine(pl, ironIngotRecipe);
    factory.removeAssemblyLine(pl, ironIngotRecipe);
    expect(s.solve).not.toHaveBeenCalled();
    expect(s.update).toHaveBeenCalled();
  });
});

describe("R6 — only solver scratch is ref()-exempt", () => {
  it("R6.S3 — the only ref() in factory.ts wraps the scratch set", () => {
    const src = readFileSync(
      join(process.cwd(), "app/models/factory.ts"),
      "utf8",
    );
    const refLines = src
      .split("\n")
      .filter((l) => /\bref\(/.test(l) && !l.trim().startsWith("//"));
    expect(refLines).toHaveLength(1);
    expect(refLines[0]).toContain("_autoSetPartRateInProgress");
  });

  it("R6.S1 — scratch cycle guard still works after ref()", () => {
    const factory = new Factory();
    factory._autoSetPartRateInProgress.add("iron-ore");
    expect(factory._autoSetPartRateInProgress.has("iron-ore")).toBe(true);
    factory._autoSetPartRateInProgress.delete("iron-ore");
    expect(factory._autoSetPartRateInProgress.has("iron-ore")).toBe(false);
  });
});
