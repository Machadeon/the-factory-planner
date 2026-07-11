import { describe, expect, it } from "vitest";
import AssemblyLine from "@/app/models/assembly-line";
import Factory from "@/app/models/factory";
import { partSlugLookup, recipes } from "@/app/models/game-data";
import { defaultRecipeOptimizerConfig } from "@/app/models/optimizer-config";
import ProductionLine from "@/app/models/production-line";
import type Recipe from "@/app/models/recipe";
import {
  materializeSelection,
  solveRecipeSelection,
} from "@/app/models/solver/recipe-optimizer";

// biome-ignore lint/style/noNonNullAssertion: recipe exists in test data
const ironPlateRecipe = recipes.find((r) => r.slug === "recipe-ironplate-c")!;
// biome-ignore lint/style/noNonNullAssertion: recipe exists in test data
const copperIngotRecipe = recipes.find(
  (r) => r.slug === "recipe-ingotcopper-c",
)!;

function baseInput() {
  const config = defaultRecipeOptimizerConfig();
  config.overwrite = true;
  config.targets = [{ partSlug: "iron-plate", rate: 30 }];
  return {
    productionLines: [] as ProductionLine[],
    supplierFactories: [],
    factoryConstraints: [],
    config,
    partPointOverrides: {},
    globalPointOverrides: {},
  };
}

function lineFingerprint(lines: ProductionLine[]) {
  return lines.map((pl) => ({
    part: pl.part.slug,
    outputRate: pl.outputRate,
    maximizeOutput: pl.maximizeOutput,
    als: pl.assemblyLines.map((al) => ({
      slug: al.recipe.slug,
      rate: al.rate,
    })),
  }));
}

function makePlateLine(rate: number, outputRate: number): ProductionLine {
  const pl = new ProductionLine(
    partSlugLookup["iron-plate"],
    0,
    outputRate,
    true,
    false,
  );
  pl.assemblyLines = [
    new AssemblyLine({
      recipe: ironPlateRecipe as Recipe,
      rate: rate,
      allowRemainder: false,
    }),
  ];
  return pl;
}

describe("solveRecipeSelection (recipe-optimizer R1/R2)", () => {
  it("R1.S2 solves from a hand-built input without Factory wiring", () => {
    const result = solveRecipeSelection(baseInput());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.selection.selected.length).toBeGreaterThan(0);
    expect(result.selection.targetFixed.get("iron-plate")).toBe(30);
  });

  it("R1.S1 does not mutate its input", () => {
    const input = baseInput();
    input.productionLines = [makePlateLine(5, 0)];
    input.config.overwrite = false;

    const before = JSON.stringify({
      lines: lineFingerprint(input.productionLines),
      config: input.config,
    });

    solveRecipeSelection(input);

    const after = JSON.stringify({
      lines: lineFingerprint(input.productionLines),
      config: input.config,
    });
    expect(after).toBe(before);
  });

  it("R2.S2 conflicting goals yield a structured error with both rates", () => {
    const input = baseInput();
    input.config.overwrite = false;
    input.productionLines = [makePlateLine(5, 20)]; // line wants 20, target wants 30

    const result = solveRecipeSelection(input);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({
      kind: "conflicting-goals",
      partSlug: "iron-plate",
      targetRate: 30,
      lineRate: 20,
    });
  });

  it("no targets yields nothing-to-optimize", () => {
    const input = baseInput();
    input.config.targets = [];

    const result = solveRecipeSelection(input);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("nothing-to-optimize");
  });

  it("infeasible selection yields infeasible-recipes with the target list", () => {
    const input = baseInput();
    input.config.availableParts = [
      { partSlug: "iron-ingot", rate: 1, hardLimit: true },
    ];

    const result = solveRecipeSelection(input);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("infeasible-recipes");
    if (result.error.kind !== "infeasible-recipes") return;
    expect(result.error.targets).toContainEqual(
      expect.objectContaining({ partSlug: "iron-plate" }),
    );
  });
});

describe("materializeSelection (recipe-optimizer R3.S1)", () => {
  function copperLine(): ProductionLine {
    const pl = new ProductionLine(
      partSlugLookup["copper-ingot"],
      0,
      10,
      true,
      false,
    );
    pl.assemblyLines = [
      new AssemblyLine({
        recipe: copperIngotRecipe as Recipe,
        rate: 10,
        allowRemainder: false,
      }),
    ];
    return pl;
  }

  it("overwrite mode replaces existing lines", () => {
    const input = baseInput();
    const result = solveRecipeSelection(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const factory = new Factory();
    factory.productionLines.push(copperLine());
    factory._updateRates();

    materializeSelection(factory, result.selection);

    const slugs = factory.productionLines.map((pl) => pl.part.slug);
    expect(slugs).not.toContain("copper-ingot");
    expect(slugs).toContain("iron-plate");
  });

  it("gap-fill mode keeps existing lines and updates matching recipes instead of appending", () => {
    const input = baseInput();
    input.config.overwrite = false;
    const existing = makePlateLine(5, 0);
    input.productionLines = [existing, copperLine()];

    const result = solveRecipeSelection(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const factory = new Factory();
    factory.productionLines.push(...input.productionLines);
    factory._updateRates();

    materializeSelection(factory, result.selection);

    const slugs = factory.productionLines.map((pl) => pl.part.slug);
    expect(slugs).toContain("copper-ingot");
    const plateLine = factory.productionLines.find(
      (pl) => pl.part.slug === "iron-plate",
    );
    // biome-ignore lint/style/noNonNullAssertion: asserted present above
    const plateAls = plateLine!.assemblyLines.filter(
      (al) => al.recipe.slug === "recipe-ironplate-c",
    );
    expect(plateAls).toHaveLength(1); // updated in place, not appended
  });
});

describe("target translation (recipe-optimizer R2 targets bullet)", () => {
  it("maps fixed-rate targets into targetFixed", () => {
    const input = baseInput();
    input.config.targets = [{ partSlug: "iron-plate", rate: 20 }];
    const result = solveRecipeSelection(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.selection.targetFixed.get("iron-plate")).toBe(20);
    expect(result.selection.targetMax.size).toBe(0);
  });

  it("maps maximize targets into targetMax and ignores their rate", () => {
    const input = baseInput();
    input.config.targets = [
      { partSlug: "iron-plate", rate: 20, maximize: true },
    ];
    const result = solveRecipeSelection(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.selection.targetMax.has("iron-plate")).toBe(true);
    expect(result.selection.targetFixed.has("iron-plate")).toBe(false);
  });

  it("silently drops fixed targets with missing or non-positive rate", () => {
    const input = baseInput();
    input.config.targets = [
      { partSlug: "iron-plate" },
      { partSlug: "iron-rod", rate: 0 },
    ];
    const result = solveRecipeSelection(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("nothing-to-optimize");
  });
});
