## 1. Test Stubs

- [x] 1.1 Write unit test stub `tests/unit/component-structure.test.ts` — R1.S4: `app/components/` non-recursive listing contains only `{ui,factory,planning,optimization,overview,library,logistics}` dirs and `ThemeRegistry.tsx`, nothing else. Must fail now (22 flat files exist).
- [x] 1.2 Add to `tests/unit/component-structure.test.ts` — R4.S1: no filename under `app/components/**` matches `*Component.tsx`. Must fail now (3 files match: `AssemblyLineComponent.tsx`, `ProductionLineComponent.tsx`, `RecipeComponent.tsx`).
- [x] 1.3 Add to `tests/unit/component-structure.test.ts` — R4.S2: `app/models/factory.ts` does not contain the string `AssemblyLineComponent` (stale comment). Must fail now.
- [x] 1.4 Add to `tests/unit/component-structure.test.ts` — R5.S1: `app/hooks/useFactoryPageFlows.ts` exists; `app/components/factory/useFactoryPageFlows.ts` does not. Must fail now.
- [x] 1.5 Write unit test stub in `tests/unit/models/factory-storage.test.ts` (or new `tests/unit/models/factory-storage-optimizer-config.test.ts`) — optimizer-config R5.S1: `app/models/factory-storage.ts` source does not contain the string `as unknown as`. Must fail now (line 226).
- [x] 1.6 Add regression test — optimizer-config R5.S2: `deserializeFactory` on a fixture whose `optimizer.availableParts` is a legacy `string[]` (e.g. `["iron-ore", "copper-ore"]`) normalizes to `[{ partSlug: "iron-ore", rate: 0 }, { partSlug: "copper-ore", rate: 0 }]`. Should currently pass against the existing cast-based code (baseline behavior) — confirms the fixture is valid before the fix changes the implementation underneath it.
- [x] 1.7 Add regression test — optimizer-config R5.S3: `deserializeFactory` on a fixture whose `optimizer.availableParts` already holds `AvailablePart` objects (`[{ partSlug: "iron-ore", rate: 60 }]`) passes them through unchanged. Should currently pass (baseline).
- [x] 1.8 Run 1.1–1.5 now and confirm they fail (1.6/1.7 are expected to already pass as baseline-behavior locks, not stubs of new behavior — confirm that too).

## 2. Move UI-bound primitives (leaves, no cross-file dependencies)

- [x] 2.1 `git mv app/components/Dividers.tsx app/components/ui/Dividers.tsx`; update all import sites; delete the unused `VerticalDivider` export (knip-flagged, 0 consumers)
- [x] 2.2 `git mv app/components/PartSelector.tsx app/components/ui/PartSelector.tsx`; update all import sites
- [x] 2.3 `git mv app/components/TextCalculatorField.tsx app/components/ui/TextCalculatorField.tsx`; update all import sites
- [x] 2.4 `npx tsc --noEmit` clean; `npm run build` clean

## 3. Relocate hook out of components

- [x] 3.1 `git mv app/components/factory/useFactoryPageFlows.ts app/hooks/useFactoryPageFlows.ts`; update all import sites
- [x] 3.2 `npx tsc --noEmit` clean

## 4. Move small leaf components

- [x] 4.1 `git mv app/components/ClockDisplay.tsx app/components/planning/ClockDisplay.tsx`; update imports
- [x] 4.2 `git mv app/components/MachineCountDisplay.tsx app/components/planning/MachineCountDisplay.tsx`; update imports
- [x] 4.3 `git mv app/components/FactoryHeader.tsx app/components/factory/FactoryHeader.tsx`; update imports
- [x] 4.4 `git mv app/components/FactoryIconPicker.tsx app/components/factory/FactoryIconPicker.tsx`; update imports
- [x] 4.5 `git mv app/components/StorageConsentDialog.tsx app/components/factory/StorageConsentDialog.tsx`; update imports
- [x] 4.6 `git mv app/components/NestedFactoryRow.tsx app/components/planning/NestedFactoryRow.tsx`; update imports
- [x] 4.7 `git mv app/components/RecipeRejectDialog.tsx app/components/planning/RecipeRejectDialog.tsx`; update imports
- [x] 4.8 `git mv app/components/SuggestedActions.tsx app/components/planning/SuggestedActions.tsx`; update imports
- [x] 4.9 `git mv app/components/RecipeOverrideRow.tsx app/components/optimization/RecipeOverrideRow.tsx`; update imports
- [x] 4.10 `git mv app/components/ConstraintsPanel.tsx app/components/optimization/ConstraintsPanel.tsx`; update imports
- [x] 4.11 `git mv app/components/ProductionTargetsBar.tsx app/components/optimization/ProductionTargetsBar.tsx`; update imports
- [x] 4.12 `git mv app/components/FactoryPickerDialog.tsx app/components/planning/FactoryPickerDialog.tsx`; update imports
- [x] 4.13 `git mv app/components/LogisticsSection.tsx app/components/logistics/LogisticsSection.tsx`; update imports; in the same commit, fix `GraphProps` (design.md D5): make `library`/`currentFactoryId` required (drop `?`), matching the always-both-passed call site
- [x] 4.14 `npx tsc --noEmit` clean; `npm run build` clean

## 5. Drop `Component` suffix (dependency order: Recipe, then AssemblyLine, then ProductionLine)

Real import chain (verified by grep, corrects an earlier false claim that `ProductionLineComponent.tsx` imports the other two — it imports neither): `RecipeComponent.tsx` is imported by `AssemblyLineComponent.tsx` **and by `planning/RecipePicker.tsx`**; `AssemblyLineComponent.tsx` is imported by `planning/ProductionLineDetails.tsx` (plus a string-only reference in `factory.ts`'s comment, fixed in 5.4). `ProductionLineComponent.tsx` imports neither of the other two — the Recipe→AssemblyLine→ProductionLine move order is still fine (D1: order doesn't affect correctness, all imports relative/`@/`), just don't rely on a false "ProductionLineComponent imports both" premise when updating import sites.

- [x] 5.1 `git mv app/components/RecipeComponent.tsx app/components/planning/Recipe.tsx`; rename exported component `RecipeComponent` → `Recipe`; update all import sites, including `app/components/planning/RecipePicker.tsx` (`import RecipeComponent from "../RecipeComponent"`)
- [x] 5.2 `git mv app/components/AssemblyLineComponent.tsx app/components/planning/AssemblyLine.tsx`; rename exported component `AssemblyLineComponent` → `AssemblyLine`; update its own import of the renamed `Recipe`; update all import sites
- [x] 5.3 `git mv app/components/ProductionLineComponent.tsx app/components/planning/ProductionLine.tsx`; rename exported component `ProductionLineComponent` → `ProductionLine`; update all import sites — verbatim move only, do not further decompose (design.md D2)
- [x] 5.4 Update the stale comment at `app/models/factory.ts` (was line 305, "per AssemblyLineComponent render") to reference `AssemblyLine`
- [x] 5.5 Update `tests/unit/production-line-structure.test.ts` — replace hardcoded `"app/components/ProductionLineComponent.tsx"` with the new path
- [x] 5.6 Update `tests/unit/contexts/prop-contract.test.ts` — replace hardcoded `"AssemblyLineComponent.tsx"` (and any `ProductionLineComponent.tsx` reference) with the new paths
- [x] 5.7 `git mv tests/integration/AssemblyLineComponent.test.tsx tests/integration/AssemblyLine.test.tsx`; update its imports and any internal references to the old name
- [x] 5.8 Run stub tests 1.2, 1.3, 1.4 (component-structure R4.S1/S2, and the parts of R1.S4 covered so far) — confirm passing for the files moved through Group 5
- [x] 5.9 `npx tsc --noEmit` clean; `npm run build` clean

## 6. Move section composers (widest importers, last)

- [x] 6.1 `git mv app/components/OptimizationSection.tsx app/components/optimization/OptimizationSection.tsx`; update imports
- [x] 6.2 `git mv app/components/PlanningSection.tsx app/components/planning/PlanningSection.tsx`; update imports
- [x] 6.3 Run stub test 1.1 (component-structure R1.S4) — confirm passing (only `ThemeRegistry.tsx` and feature dirs remain flat)
- [x] 6.4 `npx tsc --noEmit` clean; `npm run build` clean

## 7. Vestigial carryovers (§6.2)

- [x] 7.1 `app/components/optimization/SourceFactoriesEditor.tsx`: remove the two dead `if (!library) return []` guards (`library` from `useLibraryContext()` is always a real `StorageLibrary`, never falsy)
- [x] 7.2 `app/models/factory.ts`: merge the two `factory-recipe` imports into `import FactoryRecipe, { factoryRecipeSlug } from "./factory-recipe";`; run `npm run lint-fix` on this file afterward in case Biome's import-type rule flags the merge
- [x] 7.3 `app/models/factory.ts`: replace the 3 `var` declarations (previously lines 239, 240, 342) with `let`/`const`
- [x] 7.4 `app/components/planning/ProductionLineDetails.tsx`: merge the two duplicated `{!showPicker && ...}` reveal blocks into one, gating the "Add Recipe" `ActionRow` on `hasMoreRecipes` inside it (design.md D5 — verified byte-identical output for all four `showPicker`/`hasMoreRecipes` combinations)
- [x] 7.5 `npx tsc --noEmit` clean; `npm run build` clean

## 8. Close the factory-storage.ts `as unknown as` cast

- [x] 8.1 In `app/models/factory-storage.ts`, change `normalizeRecipeOptimizer`'s parameter type to accept the raw legacy shape honestly (`Omit<RecipeOptimizerConfig, "availableParts"> & { availableParts?: (string | AvailablePart)[] }`, or equivalent) instead of casting `RecipeOptimizerConfig` through `unknown`; keep the `typeof p === "string"` normalization logic unchanged; do not change `SerializedFactory.optimizer`'s type (design.md D3 — that stays the strict `RecipeOptimizerConfig`, it's also the serialize-output type)
- [x] 8.2 Run stub tests 1.5, 1.6, 1.7 (optimizer-config R5.S1/S2/S3) — confirm all pass
- [x] 8.3 Run the existing factory-storage round-trip tests — confirm unchanged and green

## 9. Trim game-data barrel

- [x] 9.1 Remove the unused `powerPart` re-export from `app/models/game-data/index.ts` (its one internal consumer, `generator-recipes.ts`, already imports it from `./load` directly). Leave `partLookup`/`buildingLookup` untouched (spec-pinned, `game-data` R2) — including `load.ts`'s own `partLookup` export, which the barrel's kept `partLookup` re-export depends on.

## 10. Dead-code sweep (knip)

- [x] 10.1 Run `npm run knip` fresh; diff against design.md's D4 snapshot (25 unused exports + 8 unused types) and note any drift since design time
- [x] 10.2 Delete each flagged export/type per D4's list (21 exports + 8 types via blanket delete; `powerPart` already handled in Group 9; `buildingLookup`/`partLookup` ×2 kept per spec pin — do not delete). If a newly-flagged item wasn't in D4's snapshot, apply the same default (delete unless it's genuinely needed, in which case add a one-line comment explaining why, per spec R6)
- [x] 10.3 Flip `knip.json`'s `exports` and `types` rules from `"warn"` to `"error"`; leave `files`/`dependencies` at `"error"` unchanged
- [x] 10.4 Run `npm run knip` — confirm exit code 0

## 11. Rename stale test filename

- [x] 11.1 `git mv tests/unit/models/library-ops.test.ts tests/unit/models/migrations-merge.test.ts` — **not** `migrations.test.ts`, that file already exists (schemaVersion pinning + `migrateLibrary`/module-boundary, storage-migrations R4-R6) and tests a different surface than this file's `mergeLibrary`/`mergeSingleFactory`/`remapImportedLibrary` (library-ops R1-R4); a plain rename to `migrations.test.ts` would collide and either refuse or destroy the existing suite

## 12. Fix AGENTS.md

- [x] 12.1 Remove the dead "`Factory.update()` injected by `FactoryComponent` at mount" claim (previously line 79); replace with a short accurate note that `FactoryPage.tsx` mounts the valtio proxy via `useFactorySession`, no `update()` field exists
- [x] 12.2 Correct "`schemaVersion` 2" (previously line 114) to "`schemaVersion` 1 (`CURRENT_SCHEMA_VERSION` defined in `app/models/factory-storage.ts`)"; note migration logic (`migrateLibrary`, `mergeLibrary`, `remapImportedLibrary`) lives in `app/models/migrations.ts` — a separate module from where the constant itself is defined; word the sentence to keep both facts straight, not implying the constant lives in `migrations.ts`
- [x] 12.3 Replace the component directory description with the final feature-directory tree (derived from the R1.S4 mapping table — every file's new location)
- [x] 12.4 Remove `syntheticSinkPoints` from the `constants.ts` export list in the game-data module description (deleted in Group 10)

## 13. Lint

- [x] 13.1 `npm run lint-fix`; commit any resulting formatting changes

## 14. Verification

- [x] 14.1 All unit/integration tests pass (`npm run test:run`)
- [x] 14.2 All E2E tests pass (`npm run test:e2e`)
- [x] 14.3 `npm run knip` exits 0 (exports/types at error severity)
- [x] 14.4 `npm run build` clean
- [x] 14.5 `make verify` green
- [x] 14.6 No lighthouse audit — no UI/visual change (confirmed in design-review: `frontend-design` not applicable, aria-labels/`data-testid`s frozen throughout)
