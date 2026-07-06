# Proposal: model-hygiene

Phase M1 of `plans/model-refactor.md`.

## Why

The model layer carries mechanical debt that makes every subsequent refactor phase (M2 god-class split, M3 type safety, M4 reactivity) harder to review: model files claim `.tsx` with zero JSX, `library.tsx` does four jobs at module init, the same shard/machine-count/slug-prefix expressions are copy-pasted across models and components, and rate tolerances are inconsistent magic numbers (`0.0001`, `1e-6`, `1e-8`, `0.00001`) chosen arbitrarily per site. Cleaning this now — while the app is early alpha and no interface is frozen — is cheap; later it compounds.

## What Changes

- Rename all zero-JSX model files `.tsx` → `.ts` via `git mv` (`factory`, `assembly-line`, `production-line`, `recipe`, `part`, `building`, `library`→split).
- Split `library.tsx` into `app/models/game-data/` (`constants.ts`, `load.ts`, `generator-recipes.ts`, `index.ts`); hoist `recipeSlugLookup` from `factory-storage.ts`; dedupe the recipeLookup registration loop. **All importers updated (34 files across `app/` and `tests/`); no re-export shim** — `models/library` import path dies.
- Export `shardsForClock(clock)` and `totalMachines(count)` from `assembly-line.ts`; replace every inline copy — factory-storage (×3), factory, factory-recipe, **and component copies** (AssemblyLineControls, MachineCountDisplay).
- **Unify rate tolerances** to a single `RATE_EPSILON = 1e-4` in `game-data/constants.ts`, sweeping all comparison sites in models and components. Sole exception: the LP equal-constraint scaling factor `1e-8` is not a comparison tolerance and becomes `SOLVER_EQUALITY_FUDGE = 1e-8`. **BREAKING (deliberate, minor):** sites previously using `1e-5`/`1e-6` thresholds (auto-created-line cleanup, optimizer recipe-rate floor) now trigger at `1e-4` — values were arbitrary; consistency chosen over preservation.
- Add `factoryRecipeId(slug)` / `factoryRecipeSlug(id)` helpers; sweep all `factory:` prefix construction/parsing (factory, factory-recipe, factory-storage, FactoryOverviewComponent, ProductionLineComponent, NestedFactoryRow, logistics/AssemblyLineNode, logistics/graph-model).
- Move `downloadJson` from `models/storage-service.ts` to `app/lib/download.ts` (DOM concern out of storage layer).

No structural refactoring: no god-class split, no API redesign, no solver changes. Component files are touched only for import paths and expression replacement, never structure.

## Capabilities

### New Capabilities

- `game-data`: static game data module — `game-data/` file layout, exported lookups (`parts`, `partLookup`, `partSlugLookup`, `buildings`, `buildingLookup`, `recipes`, `recipeLookup`, `recipeSlugLookup`), single recipe-registration path, and named numeric constants (`RATE_EPSILON`, `SOLVER_EQUALITY_FUDGE`) as the only rate-tolerance sources in the codebase.
- `machine-math`: single-home machine arithmetic — `shardsForClock` and `totalMachines` exported from `assembly-line.ts`; no inline duplicate of either expression anywhere in `app/`.
- `factory-recipe-identifiers`: `factoryRecipeId`/`factoryRecipeSlug` as the only construction/parsing of the `factory:` slug prefix.

### Modified Capabilities

- `lib-utilities`: new requirement — `lib/download.ts` owns `downloadJson`; `storage-service.ts` no longer exports it.

## Impact

- **Models:** `factory`, `assembly-line`, `production-line`, `recipe`, `part`, `building`, `factory-recipe`, `factory-storage`, `storage-service`; `library.tsx` deleted (replaced by `game-data/`).
- **Components (imports + expression swaps only):** all `models/library` importers; AssemblyLineControls, MachineCountDisplay, FactoryOverviewComponent, PartRateSummary, ProductionLineComponent, NestedFactoryRow, FactoryLibraryDrawer, FactoryComponent, logistics/graph-model, logistics/AssemblyLineNode, logistics/node-size.
- **Tests:** import-path updates across unit/integration suites; existing suites must pass otherwise unmodified except tests pinning the swept `1e-5`/`1e-6` thresholds, which update to the unified value.
- **Behavior:** identical except the declared epsilon unification edge cases.
- **Specs:** `rate-solver-verification`'s pinned `0.0001` tolerance is unaffected (equals `RATE_EPSILON`).
