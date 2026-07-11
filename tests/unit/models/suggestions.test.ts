import { describe, expect, it } from "vitest";
import AssemblyLine from "@/app/models/assembly-line";
import Factory from "@/app/models/factory";
import FactoryRecipe from "@/app/models/factory-recipe";
import { partSlugLookup, recipeSlugLookup } from "@/app/models/game-data";
import {
  defaultRecipeOptimizerConfig,
  type RecipeOptimizerConfig,
} from "@/app/models/optimizer-config";
import ProductionLine from "@/app/models/production-line";
import type { AnyRecipe } from "@/app/models/recipe-like";
import {
  acceptAllSuggestions,
  applyRejectChoice,
  applyRejectSilent,
  lineRecipeSlugs,
  rejectAllSuggestions,
  shouldPromptReject,
} from "@/app/models/suggestions";

const SLUG_A = "recipe-ironplate-c";
const SLUG_B = "recipe-ironrod-c";

function makeConfig(): RecipeOptimizerConfig {
  const config = defaultRecipeOptimizerConfig();
  expect(config.enabledRecipes).toContain(SLUG_A);
  expect(config.enabledRecipes).toContain(SLUG_B);
  return config;
}

function recipe(slug: string): AnyRecipe {
  const r = recipeSlugLookup[slug];
  expect(r, `test recipe ${slug} should exist`).toBeTruthy();
  return r;
}

function assemblyLine(r: AnyRecipe, autoCreated: boolean): AssemblyLine {
  return new AssemblyLine({ recipe: r, rate: 1, autoCreated });
}

function line(
  autoCreated: boolean,
  assemblyLines: AssemblyLine[],
): ProductionLine {
  const pl = new ProductionLine(
    partSlugLookup["iron-plate"],
    0,
    0,
    false,
    autoCreated,
  );
  pl.assemblyLines = assemblyLines;
  return pl;
}

function factoryRecipe(): FactoryRecipe {
  return new FactoryRecipe("nested-1", "Nested", new Factory());
}

describe("suggestions module (R1.S1, R2)", () => {
  it("R1.S1 functions operate on a bare config, no Factory", () => {
    const config = makeConfig();
    expect(shouldPromptReject(config)).toBe(true); // default rejectPrompt: "ask"
    config.rejectPrompt = "always";
    expect(shouldPromptReject(config)).toBe(false);
    config.rejectPrompt = "never";
    expect(shouldPromptReject(config)).toBe(false);
  });

  it('R2.S1 choice "never" sets rejectPrompt without denying', () => {
    const config = makeConfig();
    applyRejectChoice(config, [SLUG_A], "never");
    expect(config.rejectPrompt).toBe("never");
    expect(config.enabledRecipes).toContain(SLUG_A);
  });

  it('R2.S1 choice "always" sets rejectPrompt and denies', () => {
    const config = makeConfig();
    applyRejectChoice(config, [SLUG_A], "always");
    expect(config.rejectPrompt).toBe("always");
    expect(config.enabledRecipes).not.toContain(SLUG_A);
  });

  it('R2.S1 choice "yes" denies without changing rejectPrompt', () => {
    const config = makeConfig();
    applyRejectChoice(config, [SLUG_A], "yes");
    expect(config.rejectPrompt).toBe("ask");
    expect(config.enabledRecipes).not.toContain(SLUG_A);
  });

  it('R2.S1 choice "no" changes nothing', () => {
    const config = makeConfig();
    const before = [...config.enabledRecipes];
    applyRejectChoice(config, [SLUG_A], "no");
    expect(config.rejectPrompt).toBe("ask");
    expect(config.enabledRecipes).toEqual(before);
  });

  it('R2.S2 applyRejectSilent denies only under "always"', () => {
    for (const [prompt, denied] of [
      ["always", true],
      ["never", false],
      ["ask", false],
    ] as const) {
      const config = makeConfig();
      config.rejectPrompt = prompt;
      applyRejectSilent(config, [SLUG_A]);
      expect(config.enabledRecipes.includes(SLUG_A)).toBe(!denied);
    }
  });

  it("R2.S3 falsy slugs are ignored", () => {
    const config = makeConfig();
    applyRejectChoice(config, ["", SLUG_B], "yes");
    expect(config.enabledRecipes).not.toContain(SLUG_B);
    expect(config.enabledRecipes).toContain(SLUG_A);
  });
});

describe("suggestion mutation helpers (R3)", () => {
  it("R3.S1 lineRecipeSlugs returns non-factory slugs in array order", () => {
    const pl = line(false, [
      assemblyLine(recipe(SLUG_A), false),
      assemblyLine(factoryRecipe(), false),
      assemblyLine(recipe(SLUG_B), false),
    ]);
    expect(lineRecipeSlugs(pl)).toEqual([SLUG_A, SLUG_B]);
  });

  it("R3.S2 acceptAllSuggestions clears every flag, removes nothing", () => {
    const factory = new Factory();
    const pl1 = line(true, [assemblyLine(recipe(SLUG_A), true)]);
    const pl2 = line(false, [
      assemblyLine(recipe(SLUG_B), true),
      assemblyLine(recipe(SLUG_A), false),
    ]);
    factory.productionLines = [pl1, pl2];

    acceptAllSuggestions(factory);

    expect(factory.productionLines).toHaveLength(2);
    expect(factory.productionLines.every((pl) => !pl.autoCreated)).toBe(true);
    expect(
      factory.productionLines.every((pl) =>
        pl.assemblyLines.every((al) => !al.autoCreated),
      ),
    ).toBe(true);
    expect(pl1.assemblyLines).toHaveLength(1);
    expect(pl2.assemblyLines).toHaveLength(2);
  });

  it('R3.S3 rejectAllSuggestions with "always" prunes and denies', () => {
    const factory = new Factory();
    factory.optimizer.rejectPrompt = "always";
    expect(factory.optimizer.enabledRecipes).toContain(SLUG_A);
    expect(factory.optimizer.enabledRecipes).toContain(SLUG_B);
    const autoLine = line(true, [assemblyLine(recipe(SLUG_A), true)]);
    const keptLine = line(false, [
      assemblyLine(recipe(SLUG_B), true),
      assemblyLine(recipe(SLUG_A), false),
    ]);
    factory.productionLines = [autoLine, keptLine];

    rejectAllSuggestions(factory);

    expect(factory.productionLines).toEqual([keptLine]);
    expect(keptLine.assemblyLines).toHaveLength(1);
    expect(keptLine.assemblyLines[0].autoCreated).toBe(false);
    expect(factory.optimizer.enabledRecipes).not.toContain(SLUG_A);
    expect(factory.optimizer.enabledRecipes).not.toContain(SLUG_B);
  });

  it('R3.S4 rejectAllSuggestions honors non-"always" preference', () => {
    for (const prompt of ["never", "ask"] as const) {
      const factory = new Factory();
      factory.optimizer.rejectPrompt = prompt;
      const before = [...factory.optimizer.enabledRecipes];
      factory.productionLines = [
        line(true, [assemblyLine(recipe(SLUG_A), true)]),
      ];

      rejectAllSuggestions(factory);

      expect(factory.productionLines).toHaveLength(0);
      expect(factory.optimizer.enabledRecipes).toEqual(before);
    }
  });

  it("R3.S5 kept line with no auto assembly lines is untouched", () => {
    const factory = new Factory();
    factory.optimizer.rejectPrompt = "always";
    const before = [...factory.optimizer.enabledRecipes];
    const keptLine = line(false, [assemblyLine(recipe(SLUG_A), false)]);
    factory.productionLines = [keptLine];

    rejectAllSuggestions(factory);

    expect(factory.productionLines).toEqual([keptLine]);
    expect(keptLine.assemblyLines).toHaveLength(1);
    expect(factory.optimizer.enabledRecipes).toEqual(before);
  });

  it("R3.S6 empty factory is a safe no-op", () => {
    const factory = new Factory();
    factory.optimizer.rejectPrompt = "always";
    const before = [...factory.optimizer.enabledRecipes];
    factory.productionLines = [];

    expect(() => acceptAllSuggestions(factory)).not.toThrow();
    expect(() => rejectAllSuggestions(factory)).not.toThrow();
    expect(factory.productionLines).toHaveLength(0);
    expect(factory.optimizer.enabledRecipes).toEqual(before);
  });
});
