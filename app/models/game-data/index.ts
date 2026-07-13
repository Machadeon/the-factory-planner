import "./generator-recipes";

export * from "./constants";
export {
  /** @public game-data barrel export, spec-pinned (game-data R2) — kept despite no current consumer. */
  buildingLookup,
  buildings,
  /** @public game-data barrel export, spec-pinned (game-data R2) — kept despite no current consumer. */
  partLookup,
  partSlugLookup,
  parts,
  recipeLookup,
  recipeSlugLookup,
  recipes,
} from "./load";
