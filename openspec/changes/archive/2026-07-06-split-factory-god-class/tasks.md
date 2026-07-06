# Tasks: split-factory-god-class

Move-heavy refactor: stubs cover new-module contracts and declared behavior changes. Existing suites are the regression net for preserved behavior. Implementation order follows design.md's Migration Plan.

## 1. Test Stubs (write first; run and confirm each fails before implementing)

Every new-module contract and declared behavior change gets a stub below (no existing tests cover the optimizer-config/suggestions/metrics functions directly — verified by grep). Preserved solver behavior is additionally netted by the existing `factory.test.ts` / `recipe-optimizer.test.ts` suites, which stay in place.

- [x] 1.1 Unit stub `tests/unit/models/solver/base-model.test.ts`: rate-solver R3.S1 (model shape identity — constraints/variables/ints vs hand-built expectation incl. zero-limit lockout, notAutomatable, `_raw_` overlay routing), R3.S2 (mergeConstraint rules matrix), R3.S3 (intermediate-part guard: `{equal:0}` → gains `min:0`; `{min:5}` → overwritten to `min:0`; `{equal:10}` untouched)
- [x] 1.2 Unit stub `tests/unit/models/solver/rate-solver.test.ts`: rate-solver R2.S1 (pure solve with hand-built input, deterministic, no Factory/update stub) + R1.S1–S6 objective-accumulation scenarios re-anchored to pure `solveRates`
- [x] 1.3 Unit stub `tests/unit/models/solver/verify.test.ts`: verification R1.S1/R1.S3 (violation carries bound kind + limit), R2.S2 (`_raw_` nets consumption-first, `rateLookup` entry unmutated), R3.S1–S3 (zero-valued equal/max violated, zero min satisfied), plus skip-on-missing-part case
- [x] 1.4 Unit stub `tests/unit/models/solver/recipe-optimizer.test.ts`: recipe-optimizer R1.S1 (input deep-equal before/after solve, zero notifications), R1.S2 (solve without Factory), R2.S2 (conflicting-goals error carries partSlug + both rates), R3.S1 (materialize overwrite vs gap-fill onto prepared factory)
- [x] 1.5 Unit stub in `tests/unit/models/factory.test.ts` (new describe): rate-solver R2.S3 (infeasible → `solverError = {kind:"infeasible-rates"}`, rates unchanged), verification R2.S1 (violations set synchronously on return, counting update-stub sees exactly 1 call), recipe-optimizer R1.S3 (optimizeRecipes notifies exactly once, success + error paths)
- [x] 1.6 Unit stub `tests/unit/lib/format-solver-error.test.ts`: verification R4.S1 (wording skeleton per SolverError variant — "No feasible" prefix for infeasible kinds, "must be exactly …/min" for equal violations, no "undefined" substring, displayNum numerics)
- [x] 1.7 Unit stub `tests/unit/models/suggestions.test.ts`: suggestions R1.S1 (callable with bare config), R2.S1 (choice matrix), R2.S2 (silent reject per rejectPrompt), R2.S3 (falsy slugs ignored)
- [x] 1.8 Unit stub `tests/unit/models/factory-metrics.test.ts`: metrics R1.S1 (functions exported), R2.S2 (mixed machine + factory-recipe lines per metric incl. floor area and availableOutputsFrom net-rate filter)
- [x] 1.9 Unit stub `tests/unit/models/optimizer-config.test.ts`: optimizer-config R1.S1 (symbols importable, no `./factory` import), R2.S1 (defaults incl. both `enabledRecipes` exclusions), R3.S1 (setRecipesEnabled add/remove/diluted-fuel cascade), R4.S1 (recipeMatchesFilters precedence)
- [x] 1.10 Run stubs (`npx vitest run` on the new files) — confirm all fail (modules missing / behavior not implemented)

## 2. Solver foundation

- [x] 2.1 Create `app/models/solver/errors.ts`: `ConstraintViolation` + `SolverError` union per design D2
- [x] 2.2 Create `app/models/solver/base-model.ts`: move `createBaseModel` + `mergeConstraint` out of `factory.ts` as pure functions (`createBaseModel(recipes, factoryConstraints)`); preserve intermediate-part truthy guard and direct `min = 0` assignment verbatim
- [x] 2.3 Create `app/models/solver/rate-solver.ts`: `solveRates(RateSolveInput): RateSolveResult` per design D4 — move solve-model construction + objective accumulation from `autoCalculateRates`; return `ratesBySlug` + built `model`
- [x] 2.4 Create `app/models/solver/verify.ts`: `verifyConstraints(constraints, rateLookup)` per design D7 — `!== undefined` bound checks, `_raw_` consumption-first netting into locals, missing-part skip with console.warn

## 3. Rate-solver wrapper

- [x] 3.1 Rewrite `Factory.autoCalculateRates()` as thin wrapper per design D4 sequence (reset error → build input → solve → apply → `_updateRates()` → verify → single `update()`); delete `setTimeout` block
- [x] 3.2 Remove `this.update()` from `_applyRates` (design D6)
- [x] 3.3 `Factory.solverError` type → `SolverError | null`; update `createBaseModel`/`mergeConstraint` call sites in factory.ts to the new module. Note: typecheck and the Alert render stay red until Groups 4–6 land — expected within this single change; do NOT bridge with a temporary string field or re-export shim

## 4. Recipe optimizer extraction

- [x] 4.1 Create `app/models/solver/recipe-optimizer.ts`: `solveRecipeSelection` (pipeline + `targetConstraints` + `_buildScoringObjective` + `recipeFlow` as module privates) returning `RecipeSelectionResult` with structured errors per design D5
- [x] 4.2 Add `materializeSelection(factory, selection)` — local slug→line map, no `_productionLineLookup` access
- [x] 4.3 Rewrite `Factory.optimizeRecipes()` as thin wrapper per design D5 sequence (leading `solverError = null`, single trailing `update()`)

## 5. Config, suggestions, metrics moves

- [x] 5.1 Create `app/models/optimizer-config.ts`: move types (`RecipeOptimizerConfig`, `ScoringObjective`, `AvailablePart`, `Target`, `RejectPrompt`), `MAX_GAME_PHASE`, `defaultRecipeOptimizerConfig`, `isRecipeEnabled`, `setRecipesEnabled`, `recipeMatchesFilters`; update all import sites (components, factory-storage, factory) — no re-exports
- [x] 5.2 Create `app/models/suggestions.ts`: `shouldPromptReject(config)`, `applyRejectChoice(config, slugs, choice)`, `applyRejectSilent(config, slugs)`, internal deny helper; delete the four Factory methods; update component call sites to pass `factory.optimizer`
- [x] 5.3 Create `app/models/factory-metrics.ts`: move `getTotalPower`, `getTotalShards`, `getTotalSloops`, `availableOutputsFrom` off Factory (delete methods) + `factoryFloorArea` from factory-recipe.ts (drop dead `depth` param); update call sites (`FactoryOverviewComponent`, `FactoryRecipe` constructor, any others found by grep)

## 6. View formatter

- [x] 6.1 Create `app/lib/format-solver-error.ts`: `formatSolverError(SolverError): string` reproducing current wording skeletons, displayNum numerics
- [x] 6.2 `FactoryComponent` renders `formatSolverError(factory.solverError)`; remove `displayNum` import from `app/models/factory.ts` (verify none left in `app/models/`)

## 7. Factory slim-down check

- [x] 7.1 Sweep `factory.ts`: confirm removed members gone, imperative rate engine (`setPartRate`, `autoSetPartRate`, `getPartDemand`, `_hasRecycledRubberPlasticLoop`) untouched, file ≤400 lines
- [x] 7.2 Grep gates from specs: no `setTimeout` in `app/models/`; no `displayNum` in `app/models/`; no definitions of moved symbols outside new homes; no re-export shims; import direction — no `./factory` import in `optimizer-config.ts`/`suggestions.ts`, no `factory-metrics` import in `factory.ts`, solver/* imports from factory.ts type-only

## 8. Test migration

- [x] 8.1 Update error-shape assertions: `recipe-optimizer.test.ts` ("Nothing to optimize" → `{kind:"nothing-to-optimize"}` etc.), `factory.test.ts` verification-message cases (substring asserts → structured `violations` asserts), `factory-integer-instances.test.ts` (`solverError` non-null asserts still hold), remove any timer flushes made obsolete
- [x] 8.2 Confirm no orphaned coverage: grep `tests/` for the moved symbol names; any assertion still importing them from `./factory`/`factory.ts` paths updates to the new module imports (no test logic ports needed — Group 1 stubs are the direct coverage)
- [x] 8.3 Move R1 objective scenarios from `factory-auto-calculate-rates-objective.test.ts` to the pure `solveRates` tests (1.2); keep a wrapper smoke test

## 9. Verification

- [x] 9.1 All Group 1 stubs pass
- [x] 9.2 All unit/integration tests pass (`npm run test:run`)
- [x] 9.3 All E2E tests pass (`npm run test:e2e`) — includes `/No feasible/` assertion in `objective-selection.spec.ts`
- [x] 9.4 `npm run build` clean
- [x] 9.5 `npm run lint-fix` clean
- [x] 9.6 Lighthouse audit skipped — no UI layout/style change (error Alert wording preserved); note in review.md
