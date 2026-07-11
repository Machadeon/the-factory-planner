import type FactoryRecipe from "./factory-recipe";
import type Recipe from "./recipe";

/**
 * A recipe usable by an assembly line: either a game {@link Recipe} or a nested
 * {@link FactoryRecipe} (a supplier factory presented as a recipe). Both carry a
 * literal-typed `isFactoryRecipe` discriminant, so guarding on it narrows this
 * union to the concrete type — no casts.
 */
export type AnyRecipe = Recipe | FactoryRecipe;
