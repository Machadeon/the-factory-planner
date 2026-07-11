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
  toggleBuilding,
  toggleCategory,
  updatePhase,
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

describe("cascade functions importable and pure (optimizer-panel-structure R1.S1)", () => {
  it("updatePhase/toggleCategory/toggleBuilding are functions, don't mutate input, module has no react/factory import", () => {
    expect(typeof updatePhase).toBe("function");
    expect(typeof toggleCategory).toBe("function");
    expect(typeof toggleBuilding).toBe("function");

    const config = defaultRecipeOptimizerConfig();
    const before = JSON.stringify(config);
    const next = updatePhase(config, config.phase - 1);
    expect(JSON.stringify(config)).toBe(before);
    expect(next).not.toBe(config);

    const source = readFileSync(
      join(process.cwd(), "app/models/optimizer-config.ts"),
      "utf-8",
    );
    expect(source).not.toMatch(/from\s+["']react["']/);
    expect(source).not.toMatch(/from\s+["']\.\/factory["']/);
  });
});

describe("updatePhase recomputes buildings and recipes (optimizer-panel-structure R2.S1)", () => {
  it("lowering the phase excludes higher-phase buildings and their now-failing recipes", () => {
    const config = defaultRecipeOptimizerConfig();
    const relevantBuildings = buildings.filter((b) =>
      recipes.some((r) => r.building.slug === b.slug),
    );
    const maxUnlock = Math.max(...buildings.map((b) => b.unlockPhase));
    const newPhase = Math.max(maxUnlock - 1, 0);

    const next = updatePhase(config, newPhase);

    expect(next.phase).toBe(newPhase);
    const expectedBuildingSlugs = buildings
      .filter((b) => b.unlockPhase <= newPhase)
      .map((b) => b.slug);
    expect([...next.buildingsEnabled].sort()).toEqual(
      [...expectedBuildingSlugs].sort(),
    );

    for (const slug of next.enabledRecipes) {
      const recipe = recipes.find((r) => r.slug === slug);
      expect(recipe && recipeMatchesFilters(next, recipe)).toBe(true);
    }

    const excludedBuilding = relevantBuildings.find(
      (b) => b.unlockPhase > newPhase,
    );
    if (excludedBuilding) {
      const excludedSlugs = recipes
        .filter((r) => r.building.slug === excludedBuilding.slug)
        .map((r) => r.slug);
      for (const slug of excludedSlugs) {
        expect(next.enabledRecipes).not.toContain(slug);
      }
    }
  });
});

describe("toggleCategory disable removes regardless of other filters (optimizer-panel-structure R2.S2)", () => {
  it("disabling alternate recipes removes every alternate recipe from enabledRecipes", () => {
    const config = defaultRecipeOptimizerConfig();
    const next = toggleCategory(config, "alternate", false);

    expect(next.alternateRecipesEnabled).toBe(false);
    for (const slug of next.enabledRecipes) {
      const recipe = recipes.find((r) => r.slug === slug);
      expect(recipe?.alternate).toBe(false);
    }
    // non-alternate membership is untouched
    const expectedRemaining = config.enabledRecipes.filter((slug) => {
      const recipe = recipes.find((r) => r.slug === slug);
      return !recipe?.alternate;
    });
    expect([...next.enabledRecipes].sort()).toEqual(
      [...expectedRemaining].sort(),
    );
  });
});

describe("toggleBuilding enable adds only filter-passing recipes (optimizer-panel-structure R2.S3)", () => {
  it("adds none of a building's recipes when the category master toggle for them is off", () => {
    const allNonAlternateBuilding = buildings.find((b) => {
      const rs = recipes.filter((r) => r.building.slug === b.slug);
      return rs.length > 0 && rs.every((r) => !r.alternate);
    });
    expect(allNonAlternateBuilding).toBeDefined();
    if (!allNonAlternateBuilding) return;

    let config = defaultRecipeOptimizerConfig();
    config = toggleBuilding(config, allNonAlternateBuilding.slug, false);
    config = { ...config, defaultRecipesEnabled: false };

    const next = toggleBuilding(config, allNonAlternateBuilding.slug, true);

    expect(next.buildingsEnabled).toContain(allNonAlternateBuilding.slug);
    const buildingRecipeSlugs = recipes
      .filter((r) => r.building.slug === allNonAlternateBuilding.slug)
      .map((r) => r.slug);
    for (const slug of buildingRecipeSlugs) {
      expect(next.enabledRecipes).not.toContain(slug);
    }
  });
});

describe("toggleBuilding enable respects the phase filter too (optimizer-panel-structure R2.S4)", () => {
  it("adds none of a building's recipes when their unlockPhase exceeds the config's phase", () => {
    const highPhaseBuilding = buildings.find((b) => {
      const rs = recipes.filter((r) => r.building.slug === b.slug);
      return rs.length > 0 && rs.every((r) => r.unlockPhase > 0);
    });
    expect(highPhaseBuilding).toBeDefined();
    if (!highPhaseBuilding) return;

    let config = defaultRecipeOptimizerConfig();
    config = toggleBuilding(config, highPhaseBuilding.slug, false);
    config = { ...config, phase: 0 };

    const next = toggleBuilding(config, highPhaseBuilding.slug, true);

    expect(next.buildingsEnabled).toContain(highPhaseBuilding.slug);
    const buildingRecipeSlugs = recipes
      .filter((r) => r.building.slug === highPhaseBuilding.slug)
      .map((r) => r.slug);
    for (const slug of buildingRecipeSlugs) {
      expect(next.enabledRecipes).not.toContain(slug);
    }
  });
});
