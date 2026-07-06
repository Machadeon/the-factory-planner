import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildings, recipes } from "@/app/models/game-data";
import {
  defaultRecipeOptimizerConfig,
  isRecipeEnabled,
  MAX_GAME_PHASE,
  recipeMatchesFilters,
  setRecipesEnabled,
} from "@/app/models/optimizer-config";
import type Recipe from "@/app/models/recipe";

describe("optimizer-config module home (R1.S1)", () => {
  it("exports the moved symbols and does not import ./factory", () => {
    expect(MAX_GAME_PHASE).toBe(5);
    expect(typeof defaultRecipeOptimizerConfig).toBe("function");
    expect(typeof isRecipeEnabled).toBe("function");
    expect(typeof setRecipesEnabled).toBe("function");
    expect(typeof recipeMatchesFilters).toBe("function");

    const source = readFileSync(
      join(process.cwd(), "app/models/optimizer-config.ts"),
      "utf-8",
    );
    expect(source).not.toMatch(/from\s+["']\.\/factory["']/);
  });
});

describe("defaultRecipeOptimizerConfig (R2.S1)", () => {
  it("returns the pre-move defaults including both enabledRecipes exclusions", () => {
    const config = defaultRecipeOptimizerConfig();

    expect(config.eager).toBe(false);
    expect(config.objective).toBe("minResources");
    expect(config.availableParts).toEqual([]);
    expect(config.targets).toEqual([]);
    expect(config.availableFactoryIds).toEqual([]);
    expect(config.phase).toBe(MAX_GAME_PHASE);
    expect(config.defaultRecipesEnabled).toBe(true);
    expect(config.alternateRecipesEnabled).toBe(true);
    expect(config.oreConversionRecipesEnabled).toBe(false);
    expect(config.overwrite).toBe(false);
    expect(config.rejectPrompt).toBe("ask");

    const buildingsWithRecipes = buildings
      .filter((b) => recipes.some((r) => r.building.slug === b.slug))
      .map((b) => b.slug);
    expect([...config.buildingsEnabled].sort()).toEqual(
      [...buildingsWithRecipes].sort(),
    );

    const expectedEnabled = recipes
      .filter(
        (r) =>
          !r.isOreConversionRecipe() &&
          r.slug !== "recipe-alternate-dilutedpackagedfuel-c",
      )
      .map((r) => r.slug);
    expect([...config.enabledRecipes].sort()).toEqual(
      [...expectedEnabled].sort(),
    );
    expect(config.enabledRecipes).not.toContain(
      "recipe-alternate-dilutedpackagedfuel-c",
    );
  });
});

describe("setRecipesEnabled (R3.S1)", () => {
  it("adds, removes, and cascades the diluted-fuel exclusion", () => {
    expect(setRecipesEnabled(["a"], ["b"], true).sort()).toEqual(["a", "b"]);
    expect(setRecipesEnabled(["a", "b"], ["b"], false)).toEqual(["a"]);

    const withCascade = setRecipesEnabled(
      ["recipe-alternate-dilutedpackagedfuel-c"],
      ["recipe-alternate-dilutedfuel-c"],
      true,
    );
    expect(withCascade).toContain("recipe-alternate-dilutedfuel-c");
    expect(withCascade).not.toContain("recipe-alternate-dilutedpackagedfuel-c");

    expect(
      isRecipeEnabled(defaultRecipeOptimizerConfig(), "recipe-ironplate-c"),
    ).toBe(true);
  });
});

describe("recipeMatchesFilters (R4.S1)", () => {
  function fakeRecipe(overrides: {
    unlockPhase?: number;
    buildingSlug?: string;
    oreConversion?: boolean;
    alternate?: boolean;
  }): Recipe {
    return {
      unlockPhase: overrides.unlockPhase ?? 0,
      building: { slug: overrides.buildingSlug ?? "smelter" },
      isOreConversionRecipe: () => overrides.oreConversion ?? false,
      alternate: overrides.alternate ?? false,
    } as unknown as Recipe;
  }

  it("applies phase, building, and ore-conversion filters before the category toggle", () => {
    const config = defaultRecipeOptimizerConfig();
    config.phase = 2;
    config.buildingsEnabled = ["smelter"];

    expect(recipeMatchesFilters(config, fakeRecipe({ unlockPhase: 3 }))).toBe(
      false,
    );
    expect(
      recipeMatchesFilters(config, fakeRecipe({ buildingSlug: "constructor" })),
    ).toBe(false);
    expect(
      recipeMatchesFilters(config, fakeRecipe({ oreConversion: true })),
    ).toBe(false);

    expect(recipeMatchesFilters(config, fakeRecipe({}))).toBe(true);
    config.defaultRecipesEnabled = false;
    expect(recipeMatchesFilters(config, fakeRecipe({}))).toBe(false);

    config.alternateRecipesEnabled = false;
    expect(recipeMatchesFilters(config, fakeRecipe({ alternate: true }))).toBe(
      false,
    );
    config.alternateRecipesEnabled = true;
    expect(recipeMatchesFilters(config, fakeRecipe({ alternate: true }))).toBe(
      true,
    );
  });
});
