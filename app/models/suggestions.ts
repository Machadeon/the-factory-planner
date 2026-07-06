import type { RecipeOptimizerConfig } from "./optimizer-config";

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
