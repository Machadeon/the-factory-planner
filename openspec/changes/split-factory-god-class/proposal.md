# Proposal: split-factory-god-class

Phase M2 of `plans/model-refactor.md`.

## Why

`app/models/factory.ts` is a 1,429-line god class mixing six concerns: domain state/indexes, the rate-balancing solver, the recipe-selection optimizer, optimizer config (pure, class-independent), suggestion reject policy, and aggregation queries. The solver logic is untestable in isolation (the constraint-verification step runs in a `setTimeout` that mutates `solverError` and races subsequent edits), and the model imports the view util `displayNum` to format error strings. The component-refactor plan (Phase 4) consumes `optimizer-config.ts` and `suggestions.ts` as standalone modules — they must land in their final homes before that phase.

## What Changes

- Extract from `factory.ts` into new modules (clean moves — call sites updated, no re-export shims):
  - `app/models/optimizer-config.ts` — `RecipeOptimizerConfig` + related types (`ScoringObjective`, `AvailablePart`, `Target`, `RejectPrompt`), `MAX_GAME_PHASE`, `defaultRecipeOptimizerConfig`, `isRecipeEnabled`, `setRecipesEnabled`, `recipeMatchesFilters`.
  - `app/models/suggestions.ts` — reject policy: `shouldPromptReject`, `applyRejectChoice`, `applyRejectSilent`, deny-recipes helper, as module functions operating on a `RecipeOptimizerConfig` (mutating it in place, matching the mutable-model architecture).
  - `app/models/factory-metrics.ts` — `getTotalPower`, `getTotalShards`, `getTotalSloops`, `availableOutputsFrom`, plus `factoryFloorArea` merged in from `factory-recipe.ts` — all as functions taking the factory as a parameter.
  - `app/models/solver/base-model.ts` — `createBaseModel`, `mergeConstraint` as pure functions (inputs → `ModelDefinition`).
  - `app/models/solver/rate-solver.ts` — rate-balancing solve as a pure function: factory snapshot in, `{ rates: Map<AssemblyLine, number>, error }` out.
  - `app/models/solver/recipe-optimizer.ts` — recipe-selection pipeline (`optimizeRecipes` body, `buildScoringObjective`, target constraints, candidate filtering, materialization plan) as pure functions.
  - `app/models/solver/verify.ts` — synchronous post-solve constraint verification returning structured `ConstraintViolation[]`. **Replaces the `setTimeout` deferred check** in `autoCalculateRates`.
  - `app/models/solver/errors.ts` — the `SolverError` discriminated union and `ConstraintViolation` type (shared by rate-solver, recipe-optimizer, verify, and the view formatter).
- `Factory` keeps thin `autoCalculateRates()` / `optimizeRecipes()` command wrappers that call `solver/*` and apply results. Queries and policy leave the class entirely: metrics and suggestion functions take `factory`/`config` parameters — no delegating facade methods remain (`getTotalPower`, `getTotalShards`, `getTotalSloops`, `availableOutputsFrom`, `shouldPromptReject`, `applyRejectChoice`, `applyRejectSilent` are deleted from `Factory`). Target ≤400 lines.
- Recipe selection splits at an explicit purity line: pure `solveRecipeSelection(input) → selection | error` plus `materializeSelection(factory, selection)` in the same module; `Factory.optimizeRecipes` = build input → solve → materialize → apply rates → update.
- **BREAKING (internal API)**: `Factory.solverError` becomes a discriminated union `SolverError | null` (kinds: conflicting-goals, nothing-to-optimize, infeasible-recipes, infeasible-rates, constraint-violations; all carry part slugs and raw numbers). A view-layer formatter in `FactoryComponent` (the only renderer) reproduces the current message wording — E2E assertions like `/No feasible/` keep passing. Removes the `displayNum` import from the model layer. `solverError` is not serialized, so no storage migration.
- Behavior change: constraint verification is synchronous (`solver/verify.ts`) — no `setTimeout`, no race against subsequent edits; the wrapper recomputes `rateLookup` (`_updateRates()`) before verifying.
- Behavior change (declared bug fix): verification bound checks use `!== undefined` instead of truthy guards, so 0-valued `min`/`max`/`equal` bounds are now checked (previously silently skipped). Applies to `verify.ts` only; the base-model builder's truthy intermediate-part guard is preserved verbatim.
- Behavior change: render notifications consolidate to exactly one `update()` per command (`autoCalculateRates`, `optimizeRecipes`); the rate-application helper loses its internal `update()`, removing today's redundant 2–3-notification bursts.
- No algorithm changes: LP model shapes, objective math, materialization behavior identical.

## Capabilities

### New Capabilities

- `optimizer-config`: config module home — types, defaults, and pure config functions (`setRecipesEnabled` cascade rules, `recipeMatchesFilters` composition) live in `optimizer-config.ts`, importable without the `Factory` class.
- `optimizer-suggestions`: suggestion reject policy as module functions over `RecipeOptimizerConfig` in `suggestions.ts`.
- `factory-metrics`: factory-wide aggregation totals (power, shards, sloops, floor area) in `factory-metrics.ts`; single floor-area implementation.
- `recipe-optimizer`: recipe-selection pipeline as pure functions in `solver/recipe-optimizer.ts`; `Factory.optimizeRecipes` reduced to solve + apply + notify.

### Modified Capabilities

- `rate-solver`: logic moves to `solver/rate-solver.ts` + `solver/base-model.ts` as pure functions (the spec's Purpose already names this destination); objective-accumulation requirements unchanged, re-anchored to the new home.
- `rate-solver-verification`: deferred `setTimeout` check becomes synchronous `solver/verify.ts` returning structured `ConstraintViolation[]`; message formatting moves to the view layer; truthy bound guards become `!== undefined` (0-valued bounds now checked). Existing message-content requirements re-expressed over the structured violations.

## Impact

- **Shrinks**: `app/models/factory.ts` (≈1,429 → ≤400 lines).
- **New**: `app/models/{optimizer-config,suggestions,factory-metrics}.ts`, `app/models/solver/{base-model,rate-solver,recipe-optimizer,verify}.ts`.
- **Edited**: `app/models/factory-recipe.ts` (floor area moves out; consumes `factory-metrics`), `app/components/FactoryComponent.tsx` (solverError formatting), `app/components/{OptimizationSection,RecipeOptimizerPanel,ProductionLineComponent}.tsx` + `app/models/factory-storage.ts` (import-path updates for moved config/suggestion functions).
- **Tests**: suites that assert only feasibility/null-ness of `solverError` pass unmodified; tests asserting error message substrings (`factory.test.ts` verification-message cases, `recipe-optimizer.test.ts` "Nothing to optimize") convert to structured assertions, with message wording covered by a new view-formatter test. New direct unit tests for `solver/*` pure functions, `verify.ts` violations (including 0-valued bounds), and `factory-metrics` totals. `npm run test:run`, `npm run test:e2e`, `npm run build` gate the change.
- **No dependency changes**; `javascript-lp-solver` stays.
