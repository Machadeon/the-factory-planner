# game-data Specification

## Requirements

### Requirement: R1 — game-data/ module replaces library.tsx
Static game data SHALL live under `app/models/game-data/` with one module per concern: `constants.ts` (named constants: `rawResources`, `defaultResourceLimits`, `notAutomatable`, `syntheticSinkPoints`, and the tolerance constants of R4), `load.ts` (parts/buildings/recipes parsing from `data.json`), `generator-recipes.ts` (synthetic burn-recipe generation), and `index.ts` (public re-exports). `app/models/library.tsx` SHALL be deleted; no import of `models/library` (any alias form) may remain in `app/` or `tests/`.

#### Scenario: R1.S1 — library.tsx dissolved
- **WHEN** the change is complete
- **THEN** `app/models/library.tsx` does not exist and all former importers in `app/` and `tests/` compile against `app/models/game-data`

### Requirement: R2 — Exported data unchanged
`game-data/index.ts` SHALL export `parts`, `partLookup`, `partSlugLookup`, `buildings`, `buildingLookup`, `recipes`, `recipeLookup`, and (hoisted from `factory-storage.ts`) `recipeSlugLookup` keyed by `recipe.slug` covering every recipe including generated burn recipes. Recipe slugs are unique in the game data; registration is last-write-wins, matching the current `factory-storage.ts` behavior. Loaded content SHALL be identical to today: same parts (including the injected synthetic Power part, list sorted by name), same buildings, same recipes including generated burn recipes with identical rates, byproducts (uranium/plutonium waste), and water inputs.

#### Scenario: R2.S1 — Pinned counts
- **WHEN** the module is loaded
- **THEN** `parts.length === 176` (175 items + Power), `buildings.length === 16`, and `recipes.length === 293` (276 base + 17 burn)

#### Scenario: R2.S2 — recipeSlugLookup covers all recipes
- **WHEN** any `recipe` in `recipes` (base or burn) is looked up by `recipe.slug`
- **THEN** `recipeSlugLookup[recipe.slug]` returns that exact recipe instance

### Requirement: R3 — Single recipe-registration path
Registration of a recipe into `recipeLookup` (one entry per product part slug) SHALL exist as exactly one function, used by both base-recipe parsing and burn-recipe generation. The duplicated registration loop SHALL NOT survive.

#### Scenario: R3.S1 — Burn recipes registered identically
- **WHEN** a generated burn recipe produces power (and waste, where applicable)
- **THEN** it appears in `recipeLookup` under each product part slug, exactly as base recipes do

### Requirement: R4 — Unified rate tolerance constants
`game-data/constants.ts` SHALL export exactly two numeric tolerance constants: `RATE_EPSILON = 1e-4` (all rate/threshold comparisons) and `SOLVER_EQUALITY_FUDGE = 1e-8` (LP equal-constraint scaling only). No numeric rate-tolerance literal (`0.0001`, `1e-4`, `0.00001`, `1e-5`, `1e-6`, `1e-8`) may remain at any comparison or scaling site in `app/` outside `constants.ts`.

#### Scenario: R4.S1 — Sweep complete
- **WHEN** `app/` is searched for the listed tolerance literals after migration, keeping only matches used in a rate comparison, threshold check, or LP-constraint scaling expression
- **THEN** the only such site is `game-data/constants.ts`; all former sites reference `RATE_EPSILON` or `SOLVER_EQUALITY_FUDGE`

#### Scenario: R4.S2 — Deliberate threshold changes
- **WHEN** auto-created production-line cleanup (formerly `< 0.00001`) and the optimizer's selected-recipe rate floor (formerly `> 1e-6`) evaluate a rate
- **THEN** they compare against `RATE_EPSILON` (`1e-4`); this widening is intended behavior, not a regression

#### Scenario: R4.S3 — Solver fudge preserved
- **WHEN** the rate solver builds an `equal` constraint
- **THEN** it scales by `(1 - SOLVER_EQUALITY_FUDGE)` with value `1e-8`, numerically identical to today
