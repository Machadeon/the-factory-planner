import { describe, expect, it } from "vitest";
import AssemblyLine from "@/app/models/assembly-line";
import Factory from "@/app/models/factory";
import {
  buildings,
  partSlugLookup,
  parts,
  RATE_EPSILON,
  recipeLookup,
  recipeSlugLookup,
  recipes,
  SOLVER_EQUALITY_FUDGE,
} from "@/app/models/game-data";

describe("game-data pinned counts (R2.S1)", () => {
  it("loads 176 parts (175 items + Power)", () => {
    expect(parts.length).toBe(176);
  });

  it("loads 16 buildings", () => {
    expect(buildings.length).toBe(16);
  });

  it("loads 293 recipes (276 base + 17 burn)", () => {
    expect(recipes.length).toBe(293);
  });
});

describe("recipeSlugLookup (R2.S2)", () => {
  it("resolves every recipe, including burn recipes, to its exact instance", () => {
    for (const recipe of recipes) {
      expect(recipeSlugLookup[recipe.slug]).toBe(recipe);
    }
  });
});

describe("single registration path (R3.S1)", () => {
  it("registers burn recipes in recipeLookup under each product slug like base recipes", () => {
    const burnRecipes = recipes.filter((r) => r.slug.startsWith("burn-"));
    expect(burnRecipes.length).toBe(17);
    for (const recipe of burnRecipes) {
      for (const product of recipe.products) {
        expect(recipeLookup[product.part.slug]).toContain(recipe);
      }
    }
  });
});

describe("tolerance constants (R4)", () => {
  it("exports RATE_EPSILON = 1e-4 and SOLVER_EQUALITY_FUDGE = 1e-8", () => {
    expect(RATE_EPSILON).toBe(1e-4);
    expect(SOLVER_EQUALITY_FUDGE).toBe(1e-8);
  });
});

describe("auto-created line cleanup threshold widening (R4.S2)", () => {
  it("removes an auto-created line whose demand is 5e-5 (below RATE_EPSILON, above the old 1e-5)", () => {
    const factory = new Factory();
    const ironPlate = partSlugLookup["iron-plate"];
    const ironIngot = partSlugLookup["iron-ingot"];

    factory.addProductionLine(ironPlate);
    const plateLine = factory._productionLineLookup["iron-plate"];
    const plateRecipe = recipeLookup["iron-plate"].find((r) => !r.alternate);
    if (!plateRecipe) throw new Error("no base iron-plate recipe");
    const ingotPerCraft = plateRecipe.ingredientLookup["iron-ingot"];
    plateLine.assemblyLines = [
      new AssemblyLine(plateRecipe, 5e-5 / ingotPerCraft, 0, 100, 0, false),
    ];
    factory._updateRates();

    factory.addProductionLine(ironIngot, true);
    const demand = factory.getPartDemand(ironIngot);
    expect(demand).toBeGreaterThan(1e-5);
    expect(demand).toBeLessThan(RATE_EPSILON);

    factory.autoSetPartRate(ironIngot);
    expect(
      factory.productionLines.some((pl) => pl.part.slug === "iron-ingot"),
    ).toBe(false);
  });
});
