import { buildings, recipes } from "./game-data";
import type Recipe from "./recipe";

export type ScoringObjective =
  | "minResources"
  | "sinkPoints"
  | "power"
  | "buildings"
  | "logistics"
  | "inputValue";

export type RejectPrompt = "ask" | "always" | "never";

/** A part the user marks as already available, with an optional supply rate. */
export interface AvailablePart {
  partSlug: string;
  rate: number;
  /**
   * When true, this supply is the ONLY source of the part: the optimizer may not
   * build recipes that produce it, so output is hard-bounded by `rate`. When
   * false/undefined the part is merely preferred — the optimizer may produce more
   * of it on top of the supplied amount.
   */
  hardLimit?: boolean;
}

/** A declared production goal: a part the factory should output. */
export interface Target {
  partSlug: string;
  /** Fixed output rate (/min, or MW for power). Ignored when maximize=true. */
  rate?: number;
  /** Maximize this part's output instead of pinning a fixed rate. */
  maximize?: boolean;
}

/**
 * User-configurable settings for the optimize recipes feature. The
 * recipe-selection algorithm that consumes these lives in
 * solver/recipe-optimizer.ts; this config is the UI-facing state.
 */
export interface RecipeOptimizerConfig {
  /** Re-run optimizer on every edit (vs only when the user clicks Run). */
  eager: boolean;
  /** Optimization goal driving the LP objective. */
  objective: ScoringObjective;
  /** Parts preferred as already-available inputs, with optional supply rate. */
  availableParts: AvailablePart[];
  /** Declared production goals that drive the solver, independent of lines. */
  targets: Target[];
  /** Source factory ids whose outputs are treated as available. */
  availableFactoryIds: string[];
  /** Game phase ceiling for recipe unlocks. */
  phase: number;
  /** Master toggle: standard (non-alternate) recipes selectable. */
  defaultRecipesEnabled: boolean;
  /** Master toggle: alternate recipes selectable. */
  alternateRecipesEnabled: boolean;
  /** Master toggle: ore conversion recipes selectable. */
  oreConversionRecipesEnabled: boolean;
  /** Explicit list of building slugs enabled as optimizer helpers (UI state). */
  buildingsEnabled: string[];
  /**
   * The exact set of recipe slugs the solver may use — the single source of
   * truth for the solver. The phase / master / building controls above are
   * helpers that mutate this set; they retain their own UI state independently.
   */
  enabledRecipes: string[];
  /** Overwrite all production lines vs only fill gaps. */
  overwrite: boolean;
  /** Whether rejecting a suggestion also removes the recipe from optimizer. */
  rejectPrompt: RejectPrompt;
}

export const MAX_GAME_PHASE = 5;

export function defaultRecipeOptimizerConfig(): RecipeOptimizerConfig {
  return {
    eager: false,
    objective: "minResources",
    availableParts: [],
    targets: [],
    availableFactoryIds: [],
    phase: MAX_GAME_PHASE,
    defaultRecipesEnabled: true,
    alternateRecipesEnabled: true,
    oreConversionRecipesEnabled: false,
    buildingsEnabled: buildings
      .filter((b) => recipes.some((r) => r.building.slug === b.slug))
      .map((b) => b.slug),
    enabledRecipes: recipes
      .filter(
        (r) =>
          !r.isOreConversionRecipe() &&
          r.slug !== "recipe-alternate-dilutedpackagedfuel-c",
      )
      .map((r) => r.slug),
    overwrite: false,
    rejectPrompt: "ask",
  };
}

/** Whether `slug` is in the solver's enabled-recipe set. */
export function isRecipeEnabled(
  config: RecipeOptimizerConfig,
  slug: string,
): boolean {
  return config.enabledRecipes.includes(slug);
}

/**
 * Return the next `enabledRecipes` array with `slugs` added (enabled=true) or
 * removed (enabled=false). Order-insensitive; preserves existing membership for
 * untouched slugs.
 */
export function setRecipesEnabled(
  current: string[],
  slugs: string[],
  enabled: boolean,
): string[] {
  const set = new Set(current);
  if (enabled)
    for (const s of slugs) {
      set.add(s);

      // diluted packaged fuel is worse in every way than diluted fuel
      if (s === "recipe-alternate-dilutedfuel-c")
        set.delete("recipe-alternate-dilutedpackagedfuel-c");
    }
  else for (const s of slugs) set.delete(s);
  return [...set];
}

/**
 * Whether a recipe passes the bulk filters: within the phase ceiling, its
 * building enabled, and its category (default/alternate) master toggle on. The
 * bulk controls compose this so enabling a category never re-enables a recipe a
 * stricter filter (phase or building) excludes. Per-recipe modal toggles may
 * still diverge from this until the next bulk action.
 */
export function recipeMatchesFilters(
  config: RecipeOptimizerConfig,
  recipe: Recipe,
): boolean {
  if (recipe.unlockPhase > config.phase) return false;
  if (!config.buildingsEnabled.includes(recipe.building.slug)) return false;
  if (!config.oreConversionRecipesEnabled && recipe.isOreConversionRecipe())
    return false;
  return recipe.alternate
    ? config.alternateRecipesEnabled
    : config.defaultRecipesEnabled;
}
