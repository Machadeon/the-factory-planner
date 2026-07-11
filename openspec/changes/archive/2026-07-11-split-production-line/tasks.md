## 1. Test Stubs

Write all stubs first (failing / `expect` on not-yet-existing API). Each maps to a spec scenario.

### Model unit stubs (`tests/unit/models/`)

- [x] 1.1 Unit stub `production-line.test.ts`: `recipeInstanceRate(recipe)` returns `(rate − Σ getPartProductionRate(part)) / recipe.productLookup[part.slug]` (production-line-structure R2.S1)
- [x] 1.2 Unit stub `production-line.test.ts`: `splitRecipeRates()` multiplies each assembly line rate by `n/(n+1)`, changes nothing else (production-line-structure R2.S2)
- [x] 1.3 Unit stub `suggestions.test.ts`: `lineRecipeSlugs(pl)` returns only non-factory recipe slugs in `assemblyLines` order (optimizer-suggestions R3.S1)
- [x] 1.4 Unit stub `suggestions.test.ts`: `acceptAllSuggestions(factory)` clears every `autoCreated` (line + assembly), removes nothing (optimizer-suggestions R3.S2)
- [x] 1.5 Unit stub `suggestions.test.ts`: `rejectAllSuggestions(factory)` with `rejectPrompt="always"` removes auto line + auto assembly, keeps non-auto, denies both game-recipe slugs (optimizer-suggestions R3.S3)
- [x] 1.6 Unit stub `suggestions.test.ts`: `rejectAllSuggestions(factory)` with `rejectPrompt="never"`/`"ask"` removes suggestions but leaves `enabledRecipes` unchanged (optimizer-suggestions R3.S4)
- [x] 1.7 Unit stub `suggestions.test.ts`: kept non-auto line with zero auto assembly lines is untouched, no slug collected, `applyRejectSilent` called with `[]` (optimizer-suggestions R3.S5)
- [x] 1.8 Unit stub `suggestions.test.ts`: empty factory — `acceptAllSuggestions`/`rejectAllSuggestions` do not throw, remove nothing, `applyRejectSilent` called with `[]` (optimizer-suggestions R3.S6)

### Component integration stubs (`tests/integration/`)

- [x] 1.9 Integration stub `ProductionLineRow.test.tsx`: Row renders header (part name/icon, both rate fields, auto-calc/maximize/delete controls, actual-rate readout + diff) with its aria-labels/testids present (production-line-structure R1 — Row's own coverage; DOM-freeze parity is R1.S2, owned by e2e task 10.3)
- [x] 1.10 Integration stub `ProductionLineDetails.test.tsx`: picker auto-shows when `needMoreProduction` (no lines / actual≠target) with no user action (production-line-structure R3.S1)
- [x] 1.11 Integration stub `ProductionLineDetails.test.tsx`: satisfied line → manual "Add Recipe"/split opens picker → adding a satisfying recipe hides it (production-line-structure R3.S2)
- [x] 1.12 Integration stub `ProductionLineDetails.test.tsx`: partial add (still short) keeps picker visible via `needMoreProduction`, intent reset (production-line-structure R3.S3)
- [x] 1.13 Integration stub `ProductionLineDetails.test.tsx`: manual-open then a rate edit that leaves production satisfied hides the picker (intent reset by rate handler) (production-line-structure R3.S4)
- [x] 1.14 Integration stub `FactoryPickerDialog.test.tsx`: `mode="recipe"` title = "Use Factory as Recipe", `mode="supplier"` title = "Supply from Factory", onPick contract unchanged (production-line-structure R4.S1)

### Structural / static stubs

- [x] 1.15 Structural stub (`tests/unit/` grep-based): `app/components/planning/` contains `ProductionLineRow.tsx`, `ProductionLineDetails.tsx`, `RecipePicker.tsx`, `FactoryRecipeCard.tsx`, each one default export; those four **and** the retained composition parent `ProductionLineComponent.tsx` are each ≤300 lines (production-line-structure R1.S1)
- [x] 1.16 Structural stub: decomposed production-line source has no `useEffect` depending on `needMoreProduction` for picker visibility (production-line-structure R3.S5)
- [x] 1.17 Structural stub: new `planning/` production-line files contain no `var ` (production-line-structure R5.S2)

## 2. Model layer — production-line math (migration step 1)

- [x] 2.1 Add `ProductionLine.recipeInstanceRate(recipe: Recipe): number` (sum assembly `getPartProductionRate(this.part)`; return `(rate − actual)/recipe.productLookup[this.part.slug]`)
- [x] 2.2 Add `ProductionLine.splitRecipeRates(): void` (`ratio = n/(n+1)`, scale each assembly `rate`)
- [x] 2.3 Make stubs 1.1–1.2 pass; `npm run test:run` green (gate)

## 3. Model layer — suggestion mutation helpers (migration step 2)

- [x] 3.1 Add `lineRecipeSlugs(productionLine): string[]` to `app/models/suggestions.ts` (non-factory recipe slugs, array order; `type Factory` import only)
- [x] 3.2 Add `acceptAllSuggestions(factory): void` (clear all `autoCreated`, remove nothing)
- [x] 3.3 Add `rejectAllSuggestions(factory): void` (verbatim of current `OptimizationSection` walk: reassign filtered `productionLines`/`assemblyLines`, collect non-factory slugs, `applyRejectSilent`)
- [x] 3.4 Make stubs 1.3–1.8 pass; `npm run test:run` green (gate)

## 4. Rewire OptimizationSection (migration step 3)

- [x] 4.1 Replace `OptimizationSection.acceptAllSuggestions`/`rejectAllSuggestions` bodies with calls to the shared helpers (keep local `factory.update()` + dialog-close)
- [x] 4.2 Existing `OptimizationSection.test.tsx` + suites green (gate)

## 5. FactoryPickerDialog mode (migration step 4 — before dialogs are re-wired in extraction)

- [x] 5.1 Add required `mode: "recipe" | "supplier"` prop to `FactoryPickerDialog`; `<DialogTitle>` = "Use Factory as Recipe" | "Supply from Factory"
- [x] 5.2 Pass `mode` at both existing call sites in `ProductionLineComponent` (`"recipe"` for the "Use Factory as Recipe" picker, `"supplier"` for the "Supply from Factory" picker) — done here so every later extraction carries `mode` and no gate runs with the required prop missing
- [x] 5.3 Make stub 1.14 pass; suites green (gate)

## 6. Component extraction — FactoryRecipeCard (migration step 5)

- [x] 6.1 Create `app/components/planning/FactoryRecipeCard.tsx` from the inline `factoryCandidates.map` `ActionRow` (icon/placeholder, name, instance count, resulting rate); props for `sf`, `factory`, `instanceRate`, `qty`, `onClick`
- [x] 6.2 Wire `ProductionLineComponent` to render `FactoryRecipeCard`; suites green (gate)

## 7. Component extraction — RecipePicker (migration step 6)

- [x] 7.1 Create `app/components/planning/RecipePicker.tsx` rendering the `recipeList.map(<RecipeComponent/>)` list + the `FactoryRecipeCard` list; props include `productionLine`, `factoryCandidates`, `productionRateDiff`, `onAddRecipe`, `onAddFactory`
- [x] 7.2 Use `productionLine.recipeInstanceRate` where the per-recipe rate was computed inline; suites green (gate)

## 8. Component extraction — ProductionLineDetails (migration step 7)

- [x] 8.1 Create `app/components/planning/ProductionLineDetails.tsx`: assembly-line list (per-line remove + assembly `SuggestedActions`), the add reveals, `RecipePicker`, and the three dialogs (`RecipeRejectDialog` + two `FactoryPickerDialog`s, already carrying `mode` from step 5)
- [x] 8.2 Replace `showRecipes` state + its `useEffect` with `pickerManuallyOpened`; reset it to `false` in every sufficiency-changing handler per spec R3 / design D5 (`addAssemblyLine`, `addFactoryAssemblyLine`, `removeAssemblyLine`, `updateProductionRate`, `updateOutputRate`, `toggleAutoCalculateRate`, `toggleMaximizeOutput`); visibility = `needMoreProduction || pickerManuallyOpened`
- [x] 8.3 Swap `getProductionRateForRecipe`→`recipeInstanceRate` and the `splitRecipes` rescale→`splitRecipeRates()` (keep `setPickerManuallyOpened(true)` reveal)
- [x] 8.4 Make stubs 1.10–1.13, 1.16 pass; suites green + picker-visibility integration green (gate)

## 9. Component extraction — ProductionLineRow + parent composition (migration step 8)

- [x] 9.1 Create `app/components/planning/ProductionLineRow.tsx`: expand toggle, part icon/name, both rate fields (disabled/`TextCalculatorField`), unit label, auto-calc/maximize/delete controls, actual-rate readout + diff, line-level `SuggestedActions`
- [x] 9.2 Parent `ProductionLineComponent` computes `actualProductionRate` once, passes header-derived props to Row and picker-derived props to Details; composes `<ProductionLineRow>` + `<ProductionLineDetails>`
- [x] 9.3 Make stubs 1.9, 1.15 pass; suites green (gate)

## 10. Cleanup + verification (migration step 9)

- [x] 10.1 Remove `var` from affected files; make stub 1.17 pass; `npm run lint-fix`
- [x] 10.2 All unit/integration tests pass (`npm run test:run`) — optimizer-suggestions R3.*, production-line-structure R2/R3/R4
- [x] 10.3 All E2E tests pass with **no e2e selector edits** (`npm run test:e2e`) — owns production-line-structure R1.S2 (PlanningSection-composed DOM-freeze parity) and R5.S1 (suites green without selector changes)
- [x] 10.4 `npm run build` clean
- [x] 10.5 Visual-parity spot check: render a production line before/after and confirm no visible layout change (pure refactor; no Lighthouse metric target since behavior/visuals are frozen, not tuned)
