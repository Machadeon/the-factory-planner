## Why

`RecipeOptimizerPanel.tsx` (611 lines) mixes a config form with non-trivial domain logic (`updatePhase`, `toggleCategory`, `toggleBuilding` cascade rules), building-grouping derivation, and several distinct sub-panels (part availability, source factories) in one file. This is Phase 4c of the component-refactor plan (`plans/component-refactor.md`), one of four parallelizable "split the remaining big four" changes now unblocked by Phase 1 (ui primitives), Phase 2 (contexts-ready composition root), Phase 3 (`FactoryContext`/`LibraryContext`), and model change M2 (`optimizer-config.ts` already exists). Splitting now keeps the cascade rules testable in isolation and each rendered section under one responsibility, matching the rest of the completed refactor.

## What Changes

- Extract `updatePhase`, `toggleCategory`, `toggleBuilding` cascade logic (currently inline closures in `RecipeOptimizerPanel.tsx`) into pure functions on `app/models/optimizer-config.ts`, alongside the existing `recipeMatchesFilters`/`setRecipesEnabled`. Add unit tests — these are pure config→config transforms and are currently untested.
- Split `RecipeOptimizerPanel.tsx` into:
  - `OptimizerPanel.tsx` — slimmed composition root: run-mode toggle, objective radio group, overwrite toggle, mounts the sections below. Replaces `RecipeOptimizerPanel` as the exported entry point.
  - `OptimizerRecipeFilters.tsx` — game-phase select, category master switches, building switches + grouping, "manage recipes" reveal wrapping the existing `RecipeListPanel`.
  - `AvailablePartsEditor.tsx` — available-parts list + add/remove/rate/hard-limit controls.
  - `SourceFactoriesEditor.tsx` — source-factory list + add/remove + resolved outputs.
- Move the module-level building-grouping derivation (`recipeBuildings`, `GROUP_ORDER`, `GROUP_LABEL`, `recipeBuildingGroups`) into `OptimizerRecipeFilters.tsx`, the only consumer.
- `PointValuesPanel.tsx` and `RecipeListPanel.tsx` are unchanged (already single-purpose files) and become children of the new sections instead of the monolith.
- All new files live in `app/components/optimization/` per the target tree in `plans/component-refactor.md` §3. Existing call site (wherever `RecipeOptimizerPanel` is imported/rendered) updates its import path.
- No behavior change: same aria-labels, `data-testid`s, DOM structure per section, and config-mutation semantics (`factory.optimizer` write + `factory.update()`). E2E suite is the safety net.

## Capabilities

### New Capabilities
(none — this is a pure internal refactor; no new user-facing capability)

### Modified Capabilities
(none — no spec-level behavior changes; component/file structure only)

## Impact

- **Files removed:** `app/components/RecipeOptimizerPanel.tsx`
- **Files added:** `app/components/optimization/OptimizerPanel.tsx`, `OptimizerRecipeFilters.tsx`, `AvailablePartsEditor.tsx`, `SourceFactoriesEditor.tsx`
- **Files moved (no logic change):** `PointValuesPanel.tsx`, `RecipeListPanel.tsx` → `app/components/optimization/`
- **Files modified:** `app/models/optimizer-config.ts` (new exported cascade functions + tests), whatever component currently imports `RecipeOptimizerPanel` (import path update)
- **Tests:** new unit tests for the three cascade functions in `tests/unit/`; existing integration/e2e coverage of the optimizer panel must stay green unmodified (selectors frozen).
- **Dependencies:** none added.
