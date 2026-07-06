# Design: split-factory-god-class

## Context

`app/models/factory.ts` (1,429 lines) mixes domain state, two LP pipelines, pure config functions, reject policy, and aggregation queries. Phase M1 (`model-hygiene`, archived) already did the mechanical hygiene: `.ts` renames, `game-data/` split, `shardsForClock`/`totalMachines` exports, `RATE_EPSILON`/`SOLVER_EQUALITY_FUDGE` constants, `factoryRecipeId`/`factoryRecipeSlug` helpers. This change is Phase M2 of `plans/model-refactor.md`: split the god class along its six concerns. Component-refactor Phase 4 consumes `optimizer-config.ts` and `suggestions.ts`, so they must land in final homes now.

Wiring fact that shapes the verify design: `factory.update` (injected at `FactoryComponent.tsx:171`) runs `factory._updateRates()` then bumps the version counter. The current `setTimeout` verification works only because `update()` rebuilt `rateLookup` before the timer fired. A synchronous verify must therefore recompute `rateLookup` itself before checking constraints.

## Goals / Non-Goals

**Goals:**
- `factory.ts` ≤ 400 lines: state, indexes, line/supplier mutators, imperative rate propagation (`setPartRate`/`autoSetPartRate`), thin `autoCalculateRates`/`optimizeRecipes` command wrappers.
- Solver logic directly unit-testable as pure functions — no `Factory` instance, no `update` stubs, no timers.
- Structured `SolverError`; view formats; `displayNum` gone from `app/models/`.
- Exactly one `update()` notification per command.

**Non-Goals:**
- No LP algorithm changes; model shapes byte-identical (asserted by tests).
- No `RecipeLike` union / constructor / `MachineCount` type work (M3).
- No `update` field removal or valtio work (M4); no storage changes (M5).
- No unification of the imperative rate engine with the LP engine; `setPartRate`, `autoSetPartRate`, `getPartDemand`, `_hasRecycledRubberPlasticLoop` stay in `factory.ts` untouched.

## Decisions

### D1 — Module map and dependency direction

```
solver/errors.ts        SolverError union + ConstraintViolation (types only, no imports)
solver/base-model.ts    createBaseModel(recipes, factoryConstraints), mergeConstraint
solver/rate-solver.ts   solveRates(input): RateSolveResult
solver/recipe-optimizer.ts  solveRecipeSelection(input), materializeSelection(factory, selection)
solver/verify.ts        verifyConstraints(constraints, rateLookup): ConstraintViolation[]
optimizer-config.ts     types + MAX_GAME_PHASE + defaults + isRecipeEnabled/setRecipesEnabled/recipeMatchesFilters
suggestions.ts          shouldPromptReject/applyRejectChoice/applyRejectSilent (+ internal denyRecipes)
factory-metrics.ts      getTotalPower/getTotalShards/getTotalSloops/factoryFloorArea/availableOutputsFrom
factory.ts              class Factory — imports solver/*, optimizer-config; NOT factory-metrics/suggestions
```

Direction: `factory-metrics` and `suggestions` import *from* the model (type-only where possible); `factory.ts` never imports them — queries and policy sit above the aggregate, keeping the graph acyclic. Shared domain types stay where they are: `Rate` and `PartConstraint` remain exported from `factory.ts`, and `solver/*` modules **type-import** them (plus `AssemblyLine`, `ProductionLine`, `RecipeLike` as needed). These type-only back-edges are erased at compile time — no runtime cycle exists; the value-import direction is strictly `factory.ts → solver/*`. This matches the existing convention (`factory-recipe.ts` already type-imports `Factory`). `factory-recipe.ts` imports `factoryFloorArea` and the metric functions from `factory-metrics.ts` for its constructor (type-only `Factory` import already exists there; no new cycle: factory-metrics → factory is type-only, factory-recipe → factory-metrics is value, factory → factory-recipe is type-only). Alternative considered: metrics as `Factory` delegate methods (plan §3 wording) — rejected in grill: commands stay methods, queries become functions; smaller class, no facade regrowth.

### D2 — SolverError union (solver/errors.ts)

```ts
export interface ConstraintViolation {
  partSlug: string;
  bound: "min" | "max" | "equal";
  limit: number;
  actual: number; // net rate, raw
}

export type SolverError =
  | { kind: "conflicting-goals"; partSlug: string; targetRate: number; lineRate: number }
  | { kind: "nothing-to-optimize" }
  | { kind: "infeasible-recipes"; targets: { partSlug: string; rate?: number; maximize?: boolean }[] }
  | { kind: "infeasible-rates" }
  | { kind: "constraint-violations"; violations: ConstraintViolation[] };
```

`Factory.solverError: SolverError | null`. Not serialized (unchanged). Alternative — keep strings, drop `displayNum`: rejected in grill; leaves formatting in model and raw numbers in UI.

### D3 — View formatter

`formatSolverError(error: SolverError): string` lives in `app/lib/format-solver-error.ts` — it needs an importable export for its mandated unit test, and exporting a non-component helper from `FactoryComponent.tsx` would violate the one-exported-component-per-file rule. It returns a flat string deliberately: the sole renderer is the existing MUI Alert, which displays one string today; structured multi-line output would be speculative surface (revisit if the Alert UI ever grows per-violation rows). Reproduces current wording skeletons; all numerics through `displayNum`. E2E `/No feasible/` assertions keep passing. `factory-integer-instances.test.ts` / `factory.test.ts` / `recipe-optimizer.test.ts` message assertions convert to structured assertions (`kind`, `violations[0].bound/limit`, etc.); wording pinned by formatter unit test.

### D4 — Pure rate solver

```ts
// rate-solver.ts
export interface RateSolveInput {
  recipes: RecipeLike[];                 // one entry per assembly line, in traversal order
  rateTargets: Map<string, number>;      // partSlug → outputRate
  maxTargets: Set<string>;
  factoryConstraints: PartConstraint[];
}
export type RateSolveResult =
  | { feasible: true; ratesBySlug: Map<string, number>; model: ModelDefinition }
  | { feasible: false };
export function solveRates(input: RateSolveInput): RateSolveResult;
```

Returns rates keyed by recipe slug (the LP variable), not by `AssemblyLine` — keeps the function free of instance identity; the wrapper maps slugs back onto its assembly lines exactly as today (`solution[al.recipe.slug]`). Returns the built `model` so the wrapper can verify against its constraints (same object the `setTimeout` closure captured before). Objective accumulation (R1 of `rate-solver` spec) moves verbatim.

Wrapper sequence (`Factory.autoCalculateRates`):
1. `solverError = null`; walk lines → build `RateSolveInput`.
2. `solveRates`. Infeasible → `solverError = { kind: "infeasible-rates" }`, `update()`, return.
3. `_applyRates(rates)` (no longer notifies — D6).
4. `this._updateRates()` — rebuild `rateLookup` (replaces the rebuild the old flow got from `update()` before the timer fired).
5. `verifyConstraints(model.constraints, this.rateLookup)` → violations → `solverError = { kind: "constraint-violations", violations }`.
6. `update()` once. (`update()` runs `_updateRates` again via the injected callback — redundant but cheap; the callback contract is untouched until M4.)

### D5 — Pure recipe selection + materializer

```ts
// recipe-optimizer.ts
export interface RecipeSelectionInput {
  productionLines: ProductionLine[];     // read-only snapshot access
  supplierFactories: FactoryRecipe[];
  factoryConstraints: PartConstraint[];
  config: RecipeOptimizerConfig;
  partPointOverrides: Record<string, number>;
  globalPointOverrides: Record<string, number>;
}
export interface RecipeSelection {
  selected: { recipe: RecipeLike; rate: number }[];
  targetFixed: Map<string, number>;
  targetMax: Set<string>;
  ratesBySlug: Map<string, number>;
}
export type RecipeSelectionResult =
  | { ok: true; selection: RecipeSelection }
  | { ok: false; error: SolverError };
export function solveRecipeSelection(input: RecipeSelectionInput): RecipeSelectionResult;
export function materializeSelection(factory: Factory, selection: RecipeSelection): void;
```

`solveRecipeSelection` takes live arrays but must not mutate them (spec R1.S1 asserts this); no defensive cloning — same trust the class methods have today, now testable. `targetConstraints()` moves in as a private helper of this module (only consumer). `_buildScoringObjective` and `recipeFlow` move in as module privates. `materializeSelection` performs today's materialization loop (overwrite clear, ensure-line, rate-update-or-append, target flags) against `factory.productionLines` using a **local** slug → line map built at entry — it does not read or write `factory._productionLineLookup` (no private reach-in; the wrapper's subsequent `_updateRates()` rebuilds all indexes, which M0 made authoritative).

Wrapper sequence (`Factory.optimizeRecipes`): `solverError = null` → build input → solve → error: set `solverError`, `update()`, return → `materializeSelection` → `_applyRates(ratesBySlug → AssemblyLine map)` → `_updateRates()` → `update()` once. The leading reset matches current behavior — without it a stale error Alert would survive a successful re-optimize.

Alternative — one impure pipeline function taking `Factory`: rejected in grill; loses direct testability.

### D6 — Notification consolidation

`_applyRates` loses its trailing `this.update()`. Its only callers are the two wrappers, each of which now ends with exactly one `update()`. `addSupplier`/`removeSupplier`/`addProductionLine`/`removeProductionLine`/`setPartRate` keep their current single `update()` calls — out of scope. Declared behavior change; integration risk is a component that relied on the mid-operation render (none found: components read state after the call returns).

### D7 — verify.ts

```ts
export function verifyConstraints(
  constraints: Record<string, ConstraintBound>,
  rateLookup: { [partSlug: string]: Rate },
): ConstraintViolation[];
```

Pure, synchronous. Preserves `_raw_` consumption-first netting into locals (never mutates `rateLookup` entries), skips parts missing from `rateLookup`/`partSlugLookup` (the `console.warn` for unknown parts moves along). Bound checks use `!== undefined` (declared fix — 0-valued bounds now checked; scenarios R3.S1–S4). `RATE_EPSILON` tolerance unchanged.

Amendment (found during apply): the naive `!== undefined` min check false-positives on supply-augmented parts — a part with a `_raw_<slug>` sibling constraint has the raw-supply variable in its LP balance row, invisible to `rateLookup`, so consuming any raw resource flagged `min: 0` as violated (9 existing tests caught it). `verifyConstraints` skips the `min` bound for parts with a `_raw_` sibling; spec R3 amended with scenario R3.S4.

### D8 — Test migration

- Existing suites keep running against the wrappers; only error-shape assertions change (see D3).
- New direct tests: `tests/unit/models/solver/base-model.test.ts` (model shape identity vs. hand-built expectations incl. R3.S3 guard semantics), `rate-solver.test.ts` (R1 scenarios move from `factory-auto-calculate-rates-objective.test.ts` to hit the pure fn; wrapper test stays as a smoke), `recipe-optimizer.test.ts` additions (purity: deep-compare input before/after; materialize overwrite vs gap-fill), `verify.test.ts` (violation matrix incl. zero bounds, `_raw_` netting, no-mutation), `factory-metrics.test.ts` and `suggestions.test.ts` (moved coverage), formatter test (wording skeletons per variant).
- Notification-count assertions: counting `update` stub — one call per command (R2.S1, recipe-optimizer R1.S3).

## Risks / Trade-offs

- [Verify sees stale rates if step 4 forgotten] → wrapper sequence pinned in spec scenario R2.S1 ("no timer flush required"); verify test drives `autoCalculateRates` end-to-end.
- [Formatter wording drift breaks E2E `/No feasible/` or user muscle memory] → formatter unit test pins skeletons; E2E suite in the gate.
- [Snapshot input misses a field (e.g. `partPointOverrides`), silently changing objective] → base-model/objective identity tests compare built models against pre-move fixtures.
- [Materializer index drift vs. `_productionLineLookup`] → materializer never touches the private index (local map only); wrapper's `_updateRates()` rebuild is the single authority (M0 guarantee).
- [Double `_updateRates` per command (step 4 + inside `update()`)] → measured cheap (index rebuild is O(lines); already runs on every render today); disappears in M4.
- [Tests asserting message strings missed in sweep] → `npm run test:run` gate catches; grep for `solverError` in tests is part of the tasks.

## Migration Plan

Single change, no data migration (`solverError` transient, storage schema untouched). Land order inside the change: errors.ts → base-model → rate-solver + verify → recipe-optimizer → optimizer-config/suggestions/factory-metrics moves → factory.ts slim-down → component import updates + formatter → test migration. Rollback: revert the branch; no persisted-state compatibility concerns.

## Open Questions

None — grill session resolved facade scope, purity line, error shape, truthy-guard handling; spec-review pass 2 approved.
