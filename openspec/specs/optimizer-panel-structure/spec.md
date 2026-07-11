## Purpose

Structural requirements for the Recipe Optimizer panel's component decomposition: where the phase/category/building cascade logic lives, how the panel is split into single-purpose components under `app/components/optimization/`, and the behavior-freeze/test guarantees that split preserves.

## Requirements

### Requirement: R1 Cascade functions live in optimizer-config.ts
`app/models/optimizer-config.ts` SHALL export `updatePhase(config, phase)`, `toggleCategory(config, category, enabled)`, and `toggleBuilding(config, slug, enabled)` as pure functions taking a `RecipeOptimizerConfig` (plus the phase number, or the relevant category/slug identifier and target enabled state) and returning the next `RecipeOptimizerConfig`. This replaces the current closure form (`updatePhase(phase)` etc. in `RecipeOptimizerPanel.tsx`, which reads `factory.optimizer` implicitly and calls `commit()`) with explicit config-in/config-out functions. They SHALL NOT import React, `Factory`, or any component module, and SHALL be callable and testable with a bare config object. `OptimizerRecipeFilters.tsx` (the only component that needs this behavior after the split) SHALL call these three exports by name rather than defining equivalent logic locally.

#### Scenario: R1.S1 Functions importable and side-effect free
- **WHEN** a test imports `updatePhase`, `toggleCategory`, and `toggleBuilding` from `app/models/optimizer-config.ts` and calls each with a plain `RecipeOptimizerConfig` object
- **THEN** each returns a new config object without mutating the input, and `optimizer-config.ts` contains no import of `react` or `./factory`

#### Scenario: R1.S2 No inline duplication
- **WHEN** `app/components/optimization/OptimizerRecipeFilters.tsx` is inspected
- **THEN** its phase-select, category-switch, and building-switch handlers call `updatePhase`/`toggleCategory`/`toggleBuilding` imported from `app/models/optimizer-config.ts` rather than defining their own recompute logic, and no other component file defines a function named or behaviorally equivalent to these three

### Requirement: R2 Cascade semantics preserved exactly
The moved functions SHALL preserve current behavior. `updatePhase(config, phase)` SHALL recompute `buildingsEnabled` as every building with `unlockPhase <= phase`, then recompute `enabledRecipes` as every recipe passing `recipeMatchesFilters` against the updated config. `toggleCategory(config, category, enabled)` SHALL set the corresponding master-toggle field (`defaultRecipesEnabled` | `alternateRecipesEnabled` | `oreConversionRecipesEnabled`) and then, when enabling, add only recipes in that category that also pass `recipeMatchesFilters`; when disabling, remove every recipe in that category regardless of other filters. `toggleBuilding(config, slug, enabled)` SHALL add/remove `slug` from `buildingsEnabled` and then, when enabling, add only that building's recipes that pass `recipeMatchesFilters`; when disabling, remove all of that building's recipes regardless of other filters.

#### Scenario: R2.S1 Phase change recomputes buildings and recipes
- **WHEN** `updatePhase` is called with a lower phase than the config's current phase
- **THEN** `buildingsEnabled` excludes buildings unlocked above the new phase, and `enabledRecipes` excludes recipes that no longer pass `recipeMatchesFilters`

#### Scenario: R2.S2 Category disable removes regardless of other filters
- **WHEN** `toggleCategory` disables `"alternate"` while some alternate recipes fail the phase or building filter and others pass
- **THEN** every alternate recipe is removed from `enabledRecipes`, independent of phase/building state

#### Scenario: R2.S3 Building enable adds only filter-passing recipes
- **WHEN** `toggleBuilding` enables a building slug while the category master toggle for one of its recipes is off
- **THEN** only recipes from that building that pass every current filter (phase, category, ore-conversion) are added to `enabledRecipes`

#### Scenario: R2.S4 Building enable respects the phase filter too
- **WHEN** `toggleBuilding` enables a building slug whose `unlockPhase` exceeds the config's current `phase`
- **THEN** none of that building's recipes are added to `enabledRecipes` (they fail `recipeMatchesFilters` on the phase check), matching the same filter-composition rule R2.S3 exercises for the category case

### Requirement: R3 Optimizer panel split into single-purpose components
The optimizer UI SHALL be composed of `app/components/optimization/OptimizerPanel.tsx` (run-mode toggle, objective selection, overwrite toggle, and composition of the sections below), `OptimizerRecipeFilters.tsx` (game-phase select, category master switches, building switches, "manage recipes" reveal), `AvailablePartsEditor.tsx` (available-parts list and add/remove/rate/hard-limit controls), and `SourceFactoriesEditor.tsx` (source-factory list and add/remove/resolved-outputs). `app/components/PointValuesPanel.tsx` and `app/components/RecipeListPanel.tsx` SHALL move (file relocation only, no logic change) to `app/components/optimization/PointValuesPanel.tsx` and `app/components/optimization/RecipeListPanel.tsx` respectively, becoming children of `OptimizerPanel`/`OptimizerRecipeFilters`. Each file SHALL export exactly one component. `app/components/RecipeOptimizerPanel.tsx` SHALL NOT exist after this change, and no re-export shim SHALL exist in its place. The current `RecipeOptimizerConfig.targets` field has no corresponding UI in `RecipeOptimizerPanel.tsx` today (goal-rate editing lives elsewhere in the app) and remains out of scope: none of the four new components SHALL be required to add a `targets` editor.

#### Scenario: R3.S1 One component per file, old file gone
- **WHEN** `app/components/optimization/` is searched
- **THEN** `OptimizerPanel.tsx`, `OptimizerRecipeFilters.tsx`, `AvailablePartsEditor.tsx`, `SourceFactoriesEditor.tsx`, `PointValuesPanel.tsx`, and `RecipeListPanel.tsx` all exist there, each exports exactly one component, and `app/components/RecipeOptimizerPanel.tsx`, `app/components/PointValuesPanel.tsx`, and `app/components/RecipeListPanel.tsx` do not exist at their old paths

#### Scenario: R3.S2 Single call site updated
- **WHEN** `app/components/OptimizationSection.tsx` (the sole current consumer) is inspected
- **THEN** it imports `OptimizerPanel` from `./optimization/OptimizerPanel` and no file imports the deleted `RecipeOptimizerPanel` path

### Requirement: R4 Observable behavior frozen
The split SHALL NOT change any aria-label, `data-testid`, rendered DOM structure per section, or config-mutation semantics observable today. Every write to the optimizer config SHALL continue to go through `factory.optimizer = <next config>` followed by `factory.update()`, matching the current `commit`/`update` pattern. Existing e2e and integration coverage of the optimizer panel SHALL pass unmodified.

#### Scenario: R4.S1 Selectors unchanged
- **WHEN** the existing e2e/integration tests that locate optimizer-panel elements by `aria-label` or `data-testid` run against the split components
- **THEN** all pass without modification to their selectors

#### Scenario: R4.S2 Config writes still go through factory.update
- **WHEN** any control in the split components changes the optimizer config
- **THEN** the new config is assigned to `factory.optimizer` and `factory.update()` is called, exactly as in the current implementation

### Requirement: R5 Structural unit test updated for the moved file
`tests/unit/contexts/prop-contract.test.ts` hardcodes `app/components/RecipeOptimizerPanel.tsx` in its `COMPONENTS` list (checked for absence of the drilled `library`/`currentFactoryId`/`onNavigateToFactory` props). Since R3 deletes that file, this entry SHALL be updated to `app/components/optimization/OptimizerPanel.tsx` as part of this change — this is a path update to an existing structural assertion, not new test-writing scope, and the assertion itself (no drilled props) SHALL continue to hold and pass.

#### Scenario: R5.S1 Prop-contract test points at the new path
- **WHEN** `tests/unit/contexts/prop-contract.test.ts` runs after the split
- **THEN** its `COMPONENTS` list contains `app/components/optimization/OptimizerPanel.tsx` instead of the deleted path, and the test passes because `OptimizerPanel` declares none of the drilled props
