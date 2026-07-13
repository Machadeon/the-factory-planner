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

describe("R5 — split recipe rates / reject mutators", () => {
  it("R5.S7 — splitRecipeRates rescales by n/(n+1) and leaves rateLookup consistent", () => {
    const factory = new Factory();
    const pl = addLine(factory, ironIngotPart, ironIngotRecipe, 45);
    pl.assemblyLines.push(
      new AssemblyLine({
        recipe: ironIngotRecipe,
        rate: 15,
        allowRemainder: false,
      }),
    );
    factory._updateRates();
    const before = pl.assemblyLines.map((al) => al.rate);
    const n = pl.assemblyLines.length;
    factory.splitRecipeRates(pl);
    pl.assemblyLines.forEach((al, i) => {
      expect(al.rate).toBeCloseTo((before[i] * n) / (n + 1));
    });
    const expectedProduction = pl.assemblyLines.reduce(
      (sum, al) => sum + al.getPartProductionRate(ironIngotPart),
      0,
    );
    expect(factory.rateLookup["iron-ingot"].productionRate).toBeCloseTo(
      expectedProduction,
    );
  });

  it("R5.S8 — splitRecipeRates on an empty production line is a no-op but still recomputes", () => {
    const factory = new Factory();
    const pl = new ProductionLine(ironIngotPart, 0, 0, false, false);
    factory.productionLines.push(pl);
    const s = spies(factory);
    factory.splitRecipeRates(pl);
    expect(pl.assemblyLines).toHaveLength(0);
    expect(s.update).toHaveBeenCalled();
  });

  it("R5.S9 — rejectLine/rejectAssembly leave enabledRecipes consistent (2x2 matrix)", () => {
    const alwaysFactory = new Factory();
    const alwaysPl = addLine(alwaysFactory, ironIngotPart, ironIngotRecipe, 30);
    alwaysFactory.optimizer.rejectPrompt = "always";
    const sAlways = spies(alwaysFactory);
    alwaysFactory.rejectLine(alwaysPl);
    expect(alwaysFactory.optimizer.enabledRecipes).not.toContain(
      ironIngotRecipe.slug,
    );
    expect(sAlways.update).toHaveBeenCalled();

    const askFactory = new Factory();
    const askPl = addLine(askFactory, ironIngotPart, ironIngotRecipe, 30);
    const enabledBefore = [...askFactory.optimizer.enabledRecipes];
    const sAsk = spies(askFactory);
    askFactory.rejectLine(askPl);
    expect(askFactory.optimizer.enabledRecipes).toEqual(enabledBefore);
    expect(sAsk.update).toHaveBeenCalled();

    const alwaysAssemblyFactory = new Factory();
    alwaysAssemblyFactory.optimizer.rejectPrompt = "always";
    const sAlwaysAssembly = spies(alwaysAssemblyFactory);
    alwaysAssemblyFactory.rejectAssembly(ironIngotRecipe);
    expect(alwaysAssemblyFactory.optimizer.enabledRecipes).not.toContain(
      ironIngotRecipe.slug,
    );
    expect(sAlwaysAssembly.update).toHaveBeenCalled();

    const askAssemblyFactory = new Factory();
    const enabledBeforeAssembly = [
      ...askAssemblyFactory.optimizer.enabledRecipes,
    ];
    const sAskAssembly = spies(askAssemblyFactory);
    askAssemblyFactory.rejectAssembly(ironIngotRecipe);
    expect(askAssemblyFactory.optimizer.enabledRecipes).toEqual(
      enabledBeforeAssembly,
    );
    expect(sAskAssembly.update).toHaveBeenCalled();
  });

  it("R5.S10 — rejectLineChoice covers all four choice values", () => {
    const cases: Array<{
      choice: "never" | "no" | "yes" | "always";
      expectDenied: boolean;
      expectRejectPrompt?: "never" | "always";
    }> = [
      { choice: "never", expectDenied: false, expectRejectPrompt: "never" },
      { choice: "no", expectDenied: false },
      { choice: "yes", expectDenied: true },
      { choice: "always", expectDenied: true, expectRejectPrompt: "always" },
    ];
    for (const { choice, expectDenied, expectRejectPrompt } of cases) {
      const factory = new Factory();
      const pl = addLine(factory, ironIngotPart, ironIngotRecipe, 30);
      const s = spies(factory);
      factory.rejectLineChoice(pl, choice);
      if (expectDenied) {
        expect(factory.optimizer.enabledRecipes).not.toContain(
          ironIngotRecipe.slug,
        );
      } else {
        expect(factory.optimizer.enabledRecipes).toContain(
          ironIngotRecipe.slug,
        );
      }
      if (expectRejectPrompt) {
        expect(factory.optimizer.rejectPrompt).toBe(expectRejectPrompt);
      }
      expect(s.update).toHaveBeenCalled();
    }
  });

  it("R5.S10 — rejectAssemblyChoice cross-check ('always' and 'never')", () => {
    const alwaysFactory = new Factory();
    const sAlways = spies(alwaysFactory);
    alwaysFactory.rejectAssemblyChoice(ironIngotRecipe, "always");
    expect(alwaysFactory.optimizer.enabledRecipes).not.toContain(
      ironIngotRecipe.slug,
    );
    expect(alwaysFactory.optimizer.rejectPrompt).toBe("always");
    expect(sAlways.update).toHaveBeenCalled();

    const neverFactory = new Factory();
    const enabledBefore = [...neverFactory.optimizer.enabledRecipes];
    const sNever = spies(neverFactory);
    neverFactory.rejectAssemblyChoice(ironIngotRecipe, "never");
    expect(neverFactory.optimizer.enabledRecipes).toEqual(enabledBefore);
    expect(neverFactory.optimizer.rejectPrompt).toBe("never");
    expect(sNever.update).toHaveBeenCalled();
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
