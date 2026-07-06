# optimizer-config Specification

## Purpose
TBD - created by archiving change split-factory-god-class. Update Purpose after archive.
## Requirements
### Requirement: R1 Config module home
`app/models/optimizer-config.ts` SHALL export the recipe-optimizer configuration surface currently defined in `factory.ts`: the types `RecipeOptimizerConfig`, `ScoringObjective`, `AvailablePart`, `Target`, `RejectPrompt`; the constant `MAX_GAME_PHASE`; and the functions `defaultRecipeOptimizerConfig`, `isRecipeEnabled`, `setRecipesEnabled`, `recipeMatchesFilters`. The module SHALL NOT import the `Factory` class (type or value) — it depends only on `game-data` and `Recipe`. No definition of these symbols SHALL remain in `factory.ts`; all import sites (components, `factory-storage.ts`, `factory.ts`) SHALL import from `optimizer-config.ts` directly, with no re-export shim.

#### Scenario: R1.S1 Symbols importable without Factory
- **WHEN** a test imports `defaultRecipeOptimizerConfig`, `isRecipeEnabled`, `setRecipesEnabled`, `recipeMatchesFilters`, and `MAX_GAME_PHASE` from `app/models/optimizer-config.ts`
- **THEN** all are defined and callable, and `optimizer-config.ts` contains no import from `./factory`

#### Scenario: R1.S2 No leftover definitions or shims
- **WHEN** `app/` is searched for definitions of the moved symbols outside `optimizer-config.ts` and for re-exports of them from `factory.ts`
- **THEN** none exist; every consumer imports from `optimizer-config.ts`

### Requirement: R2 Default config preserved
`defaultRecipeOptimizerConfig()` SHALL return the same defaults as before the move: `eager: false`, `objective: "minResources"`, empty `availableParts`/`targets`/`availableFactoryIds`, `phase: MAX_GAME_PHASE` (5), `defaultRecipesEnabled: true`, `alternateRecipesEnabled: true`, `oreConversionRecipesEnabled: false`, `buildingsEnabled` = every building that at least one recipe uses, `enabledRecipes` = every recipe except ore-conversion recipes and `recipe-alternate-dilutedpackagedfuel-c`, `overwrite: false`, `rejectPrompt: "ask"`.

#### Scenario: R2.S1 Defaults identical
- **WHEN** `defaultRecipeOptimizerConfig()` is called
- **THEN** the returned object matches the field values listed above, including the two `enabledRecipes` exclusions

### Requirement: R3 setRecipesEnabled semantics preserved
`setRecipesEnabled(current, slugs, enabled)` SHALL return a new array with `slugs` added (when `enabled` is true) or removed (when false), preserving untouched membership, order-insensitive. Enabling `recipe-alternate-dilutedfuel-c` SHALL also remove `recipe-alternate-dilutedpackagedfuel-c` from the result.

#### Scenario: R3.S1 Add, remove, and diluted-fuel cascade
- **WHEN** `setRecipesEnabled` is called to add slugs, remove slugs, and add `recipe-alternate-dilutedfuel-c` to a set containing `recipe-alternate-dilutedpackagedfuel-c`
- **THEN** membership updates accordingly and the cascade removes the packaged-fuel slug

### Requirement: R4 recipeMatchesFilters composition preserved
`recipeMatchesFilters(config, recipe)` SHALL return false when `recipe.unlockPhase > config.phase`, when the recipe's building is not in `config.buildingsEnabled`, or when the recipe is an ore-conversion recipe and `oreConversionRecipesEnabled` is false; otherwise it SHALL return `alternateRecipesEnabled` for alternate recipes and `defaultRecipesEnabled` for standard ones.

#### Scenario: R4.S1 Filter precedence
- **WHEN** a recipe fails the phase, building, or ore-conversion filter while its category master toggle is on
- **THEN** `recipeMatchesFilters` returns false; with all filters passing, it returns the category master toggle's value
