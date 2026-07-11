import type Factory from "./factory";
import type { RecipeOptimizerConfig } from "./optimizer-config";
import type ProductionLine from "./production-line";

/** True when rejecting a suggestion should prompt the user. */
export function shouldPromptReject(config: RecipeOptimizerConfig): boolean {
  return config.rejectPrompt === "ask";
}

/**
 * Apply the user's choice from the reject-suggestion prompt. Updates
 * rejectPrompt and/or adds a deny override; does not remove any lines (the
 * caller performs the removal).
 */
export function applyRejectChoice(
  config: RecipeOptimizerConfig,
  recipeSlugs: string[],
  choice: "never" | "no" | "yes" | "always",
) {
  if (choice === "never") {
    config.rejectPrompt = "never";
  } else if (choice === "always") {
    config.rejectPrompt = "always";
    denyRecipes(config, recipeSlugs);
  } else if (choice === "yes") {
    denyRecipes(config, recipeSlugs);
  }
}

/**
 * Apply the remembered reject behavior when no prompt is shown ("always" adds
 * a deny override, "never" does nothing).
 */
export function applyRejectSilent(
  config: RecipeOptimizerConfig,
  recipeSlugs: string[],
) {
  if (config.rejectPrompt === "always") {
    denyRecipes(config, recipeSlugs);
  }
}

function denyRecipes(config: RecipeOptimizerConfig, recipeSlugs: string[]) {
  const deny = new Set(recipeSlugs.filter(Boolean));
  config.enabledRecipes = config.enabledRecipes.filter((s) => !deny.has(s));
}

/** Slugs of a line's non-factory recipe assembly lines, in array order. */
export function lineRecipeSlugs(productionLine: ProductionLine): string[] {
  return productionLine.assemblyLines
    .filter((al) => !al.recipe.isFactoryRecipe)
    .map((al) => al.recipe.slug);
}

/**
 * Clear the `autoCreated` flag on every production line and assembly line,
 * marking all suggestions as accepted. Removes nothing. Callers own the
 * post-mutation `factory.update()`.
 */
export function acceptAllSuggestions(factory: Factory): void {
  for (const pl of factory.productionLines) {
    pl.autoCreated = false;
    for (const al of pl.assemblyLines) al.autoCreated = false;
  }
}

/**
 * Remove every auto-created suggestion: drop `autoCreated` production lines
 * wholesale and drop `autoCreated` assembly lines from surviving lines,
 * collecting the non-factory recipe slugs and applying the remembered reject
 * preference. Callers own the post-mutation `factory.update()`.
 */
export function rejectAllSuggestions(factory: Factory): void {
  const slugs: string[] = [];
  factory.productionLines = factory.productionLines.filter((pl) => {
    if (pl.autoCreated) {
      for (const al of pl.assemblyLines) {
        if (!al.recipe.isFactoryRecipe) slugs.push(al.recipe.slug);
      }
      return false;
    }
    pl.assemblyLines = pl.assemblyLines.filter((al) => {
      if (al.autoCreated) {
        if (!al.recipe.isFactoryRecipe) slugs.push(al.recipe.slug);
        return false;
      }
      return true;
    });
    return true;
  });
  applyRejectSilent(factory.optimizer, slugs);
}
