## 1. Test Stubs

<!-- New tests only. R4.S1/R4.S2 (behavior freeze) and R5.S1 (existing test path
     update) are inherently coupled to the deletion step and are handled in
     Group 6, not here — see note there. R1.S2 (1.8) is NOT deferred: it's a
     structural stub like R3.S1/R3.S2, written here alongside them. -->

- [x] 1.1 Write unit test stub in `tests/unit/models/optimizer-config.test.ts`: R1.S1 — `updatePhase`, `toggleCategory`, `toggleBuilding` are importable from `optimizer-config.ts`, each returns a new config object without mutating the input, module has no import of `react` or `./factory`
- [x] 1.2 Write unit test stub: R2.S1 — `updatePhase` to a lower phase excludes buildings above the new phase from `buildingsEnabled` and excludes now-filter-failing recipes from `enabledRecipes`
- [x] 1.3 Write unit test stub: R2.S2 — `toggleCategory("alternate", false)` removes every alternate recipe from `enabledRecipes` regardless of phase/building state
- [x] 1.4 Write unit test stub: R2.S3 — `toggleBuilding(slug, true)` adds only that building's recipes that pass every current filter when a category master toggle is off
- [x] 1.5 Write unit test stub: R2.S4 — `toggleBuilding(slug, true)` adds none of that building's recipes when the building's `unlockPhase` exceeds the config's `phase`
- [x] 1.6 Write unit test stub in new `tests/unit/components/optimizer-panel-structure.test.ts` (fs-based, modeled on `tests/unit/contexts/prop-contract.test.ts`): R3.S1 — `OptimizerPanel.tsx`, `OptimizerRecipeFilters.tsx`, `AvailablePartsEditor.tsx`, `SourceFactoriesEditor.tsx`, `PointValuesPanel.tsx`, `RecipeListPanel.tsx` all exist under `app/components/optimization/`, each exports exactly one component, and `app/components/RecipeOptimizerPanel.tsx`/`PointValuesPanel.tsx`/`RecipeListPanel.tsx` no longer exist at their old paths
- [x] 1.7 Write unit test stub in the same file: R3.S2 — `app/components/OptimizationSection.tsx` imports `OptimizerPanel` from `./optimization/OptimizerPanel` and no file in `app/` imports the old `RecipeOptimizerPanel` path
- [x] 1.8 Write unit test stub in the same file: R1.S2 — `app/components/optimization/OptimizerRecipeFilters.tsx` source text references `updatePhase(`, `toggleCategory(`, and `toggleBuilding(` as called (not locally re-declared as `function updatePhase`/const arrow equivalents), and no other file under `app/components/` declares a function of those names
- [x] 1.9 Confirm all of 1.1-1.8 fail (functions/files don't exist yet, old files still present) before starting implementation

## 2. Cascade functions in optimizer-config.ts

- [x] 2.1 Implement `updatePhase(config, phase)` in `app/models/optimizer-config.ts` per design Decision 1/spec R1-R2
- [x] 2.2 Implement `toggleCategory(config, category, enabled)` in `app/models/optimizer-config.ts`
- [x] 2.3 Implement `toggleBuilding(config, slug, enabled)` in `app/models/optimizer-config.ts`
- [x] 2.4 Run 1.1-1.5 — confirm green (1.6-1.8 stay red: they check `app/components/optimization/*` files and `OptimizerRecipeFilters.tsx`'s call sites, none of which exist until Groups 3-5)

## 3. Move PointValuesPanel and RecipeListPanel (git mv, no logic change)

- [x] 3.1 `git mv app/components/PointValuesPanel.tsx app/components/optimization/PointValuesPanel.tsx`; fix its internal relative imports only
- [x] 3.2 `git mv app/components/RecipeListPanel.tsx app/components/optimization/RecipeListPanel.tsx`; fix its internal relative imports only

## 4. Extract AvailablePartsEditor and SourceFactoriesEditor

- [x] 4.1 Create `app/components/optimization/AvailablePartsEditor.tsx`: lift the available-parts JSX, `addAvailablePart`/`updateAvailablePartRate`/`updateAvailablePartHardLimit`/`removeAvailablePart`, local `commit`/`update`, and the `partExclusions` derivation out of `RecipeOptimizerPanel.tsx`; reads `factory` via `useFactory()`
- [x] 4.2 Create `app/components/optimization/SourceFactoriesEditor.tsx`: lift the source-factories JSX, `addSourceFactory`/`removeSourceFactory`, local `commit`/`update`, and the `sourceFactories`/`factoryOptions` memos out of `RecipeOptimizerPanel.tsx`; reads `factory`/`library`/`currentFactoryId` via context
- [x] 4.3 `RecipeOptimizerPanel.tsx` now renders these two new components in place of the lifted JSX (old file still the sole export, still wired to `OptimizationSection.tsx` — app stays buildable)

## 5. Extract OptimizerRecipeFilters and OptimizerPanel

- [x] 5.1 Create `app/components/optimization/OptimizerRecipeFilters.tsx`: lift phase-select/category-switch/building-switch JSX, the "manage recipes" reveal + `showRecipeList` state, the building-grouping module-level consts (`recipeBuildings`, `GROUP_ORDER`, `GROUP_LABEL`, `recipeBuildingGroups`), and `toggleRecipe`; wire its handlers to call `updatePhase(config, phase)`/`toggleCategory(config, category, enabled)`/`toggleBuilding(config, slug, enabled)` imported from `optimizer-config.ts` by name — do not redeclare equivalent logic locally (R1.S2)
- [x] 5.2 Create `app/components/optimization/OptimizerPanel.tsx` as the new composition root: run-mode toggle, objective radio group, `showPointValues` state, overwrite toggle, and mounts `OptimizerRecipeFilters`, `AvailablePartsEditor`, `SourceFactoriesEditor`. `OptimizerPanel` calls `useLibraryContext()` itself to obtain `library`/`updatePartPointOverrides`, then mounts `PointValuesPanel` passing `factory`/`library`/`onUpdateLibrary={updatePartPointOverrides}` as props (design Decision 1's exception — `PointValuesPanel` is unmodified and keeps its existing prop signature)
- [x] 5.3 Run 1.6-1.8 — confirm still red (new files exist and correctly call the named exports, but `RecipeOptimizerPanel.tsx` still exists with its own same-named local closures until 6.3 deletes it, so all three of 1.6/1.7/1.8 stay red until Group 6)

## 6. Cut over and delete old file

<!-- R4.S1/R4.S2 and R5.S1 land here: R4 is proven by the existing e2e/integration
     suite passing unmodified against the new tree (no new test needed — it's
     the regression check). R5 requires editing prop-contract.test.ts in the same
     commit as the deletion, since the assertion only breaks once the old path
     is gone — sequencing it earlier would mean editing a test to point at a
     component that doesn't exist yet. -->

- [x] 6.1 Update `app/components/OptimizationSection.tsx` to import `OptimizerPanel` from `./optimization/OptimizerPanel`
- [x] 6.2 Re-run repo-wide `grep -rn "RecipeOptimizerPanel"` (app/, tests/, .github/, *.yml/*.yaml/*.json) to confirm only `OptimizationSection.tsx` and `prop-contract.test.ts` still reference it
- [x] 6.3 Delete `app/components/RecipeOptimizerPanel.tsx`
- [x] 6.4 Update `tests/unit/contexts/prop-contract.test.ts`'s `COMPONENTS` list: replace `app/components/RecipeOptimizerPanel.tsx` with `app/components/optimization/OptimizerPanel.tsx` (R5.S1)
- [x] 6.5 Run 1.6-1.8 — confirm green (old paths gone, new paths correct, single call site updated, no duplicate cascade-logic declarations remain)

## 7. Verification

- [x] 7.1 All unit/integration tests pass (`npm run test:run`) — includes new stubs from Group 1 and existing `OptimizationSection.test.tsx`/`ProductionTargetsBar.test.tsx` (R4.S1, R4.S2 regression check)
- [x] 7.2 All E2E tests pass (`npm run test:e2e`) — includes `no-substantive-modals.spec.ts`/`configure-auto-fill.spec.ts` (R4.S1 regression check, selectors unmodified)
- [x] 7.3 `npm run build` clean
- [x] 7.4 `npm run lint-fix` clean
- [x] 7.5 Lighthouse audit not required — no new UI, DOM structure per section unchanged (R4)
