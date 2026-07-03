# Model Layer Refactor Plan

Status: PROPOSED — companion to `component-refactor.md`. Each phase becomes one OpenSpec change. Verdict: the model layer **does** need redesign, but a targeted restructure, not a rewrite — the domain math (rate propagation, LP models, somersloop/power formulas, serialization round-trip) is sound and has real unit coverage (~126 cases in `tests/unit/models/`). The problems are structural: one god class, an inverted model→view dependency, type-unsafe seams, and duplication.

## 1. What is NOT wrong (keep as-is)

- **Mutable class models.** Load-bearing for the LP solver and rate propagation; kept. Reactivity over the mutable graph is valtio's job (proxy + `useSnapshot`, introduced in component plan Phase 2) — chosen precisely because it tracks mutable class instances unmodified, so no immutable-state rewrite is ever needed.
- **LP formulation.** Both solvers (rate balancing, recipe selection) produce correct models; `javascript-lp-solver` stays.
- **`storage-service.ts`.** Already clean: pure CRUD helpers, silent-failure reads, narrow key API. Only nit: `downloadJson` is a DOM/browser concern in a storage module — move alongside `lib/filenames.ts` in the component plan's Phase 1.
- **Serialization robustness.** Graceful skip-on-missing-reference, cycle stubbing, legacy migration all work and are tested.
- **`AssemblyLine` math** (clock/shards/power/sloop). Correct and mostly well-factored; issues are API-shaped, not logic-shaped.

## 2. Findings

### 2.1 `factory.tsx` is a 1,424-line god class — six concerns

| Concern | Members | ~Lines |
|---|---|---|
| Domain state + derived indexes | fields, `_updateRates`, `_addAssemblyLineLookup` | 120 |
| Rate-balancing solver | `autoCalculateRates`, `createBaseModel`, `mergeConstraint`, `_applyRates` | 320 |
| Recipe-selection optimizer | `optimizeRecipes`, `_buildScoringObjective`, `targetConstraints` | 450 |
| Optimizer config (pure, class-independent) | `RecipeOptimizerConfig` + types, `defaultRecipeOptimizerConfig`, `setRecipesEnabled`, `recipeMatchesFilters`, `isRecipeEnabled` | 160 |
| Suggestion reject policy | `shouldPromptReject`, `applyRejectChoice`, `applyRejectSilent`, `_denyRecipes` | 40 |
| Aggregation queries | `allInputs/allOutputs/getOutputInfo/allIntermediateParts/recipeOutputs/getPartDemand/getTotalPower/getTotalShards/getTotalSloops/availableOutputsFrom` | 200 |

The config functions and reject policy don't even use `this` meaningfully — they're module functions trapped in a class file.

### 2.2 Model→view coupling: injected `update()`

`Factory.update` is a view callback the model invokes from inside domain methods (`addSupplier`, `removeProductionLine`, `setPartRate`, `optimizeRecipes` calls it up to 3× per operation, `_applyRates` then calls it again). Consequences:

- Domain layer knows about rendering; unit tests must stub it.
- Redundant re-render bursts (e.g. `optimizeRecipes` → `_applyRates.update()` → `this.update()`).
- Components inconsistently call `factory.update()` vs `factory.autoCalculateRates()` vs both after mutations — because the contract "who triggers recompute+render" is undefined.

Resolution: valtio makes render notification automatic (mutations on the proxied graph publish themselves), so `update` stops carrying render duty at component Phase 2 (reduced to a recompute-only shim) and is deleted entirely in M4, which internalizes derived-state recompute into the mutators.

### 2.3 Async side effect inside the model

`autoCalculateRates` schedules a `setTimeout` that re-checks constraints against `rateLookup`, mutates `solverError`, and calls `update()` again. Untestable without timers, races with subsequent edits, and duplicates knowledge of constraint semantics. Verification should be a synchronous pure function over the solved state.

### 2.4 Type-unsafe seams

- `RecipeLike` is too thin, so `FactoryRecipe` capabilities are reached via `recipe as unknown as { avgPowerPerInstance: number }` (factory.tsx ×3, assembly-line.tsx ×1, factory-recipe.ts ×1). Both classes already carry a literal-typed discriminant (`isFactoryRecipe: true/false as const`) — a proper discriminated union (`type AnyRecipe = Recipe | FactoryRecipe`) makes every cast disappear via narrowing.
- `AssemblyLine` constructor: **10 positional params** — call sites like `new AssemblyLine(fr, rate, 0, 100, 0, true, true)` are unreadable and error-prone (factory-storage passes `rows ?? 1` in one branch, `rows ?? 0` in another — likely unintentional divergence). Needs an options object with defaults.
- `getMachineCount()` returns an undiscriminated union probed by `"fullMachines" in count` at 5+ call sites — should be `{ kind: 'remainder', ... } | { kind: 'uniform', ... }`.

### 2.5 Latent bugs found during this read (fix as separate bug changes, regression test first)

1. **`factory.tsx:1247`** — min-inputs objective accumulates into the wrong key: `coefficients._obj = (coefficients.obj ?? 0) + ...` reads `obj`, writes `_obj`. A variable consuming multiple raw resources gets only its *last* coefficient instead of the sum.
2. **`factory.tsx:1328`** — equal-constraint violation message interpolates `constraint.min` instead of `constraint.equal` ("must be exactly undefined/min").
3. **Stale `_productionLineLookup`** — `_updateRates` rebuilds every index *except* `_productionLineLookup` (only adds, never clears). `OptimizationSection.rejectAllSuggestions` replaces `factory.productionLines` wholesale without touching the lookup, so `addProductionLine`'s `part.slug in this._productionLineLookup` guard can wrongly block re-adding a part after reject-all.
4. **Aliased-state hazard:** `new Factory(oldFactory)` copies `productionLines`/`supplierFactories` **by reference** — the "rebuilt" factory shares mutable children with the old one. Works today only because the old instance is discarded; any future undo/compare feature breaks silently. (Also `FactoryComponent.rebuildFactory` is currently the only caller.)

### 2.6 Duplication and misplacement

| Issue | Where |
|---|---|
| Shard-from-clock `Math.ceil((speed-100)/50)` | private `shardsForClock` in assembly-line (unexported) + inlined **3×** in factory-storage + 2× in AssemblyLineControls |
| `deserializeFactory` vs `deserializeFactoryStub` | ~60 lines copy-pasted; stub is deserialize-with-no-nested-links |
| `recipeSlugLookup` built locally in factory-storage | belongs in `library` next to the other lookups |
| recipeLookup registration loop | duplicated 2× in library.tsx (base recipes + generated burn recipes) |
| `factory:` slug prefix parsing (`slice`, `replace`) | factory.tsx, factory-storage.ts, FactoryOverviewComponent — no single `factoryRecipeId()` helper |
| Rate tolerance `0.0001` / `1e-6` / `1e-8` / `0.00001` magic numbers | scattered through factory.tsx, components — inconsistent epsilons |
| Machine-count-to-total (`fullMachines + (remainderClock>0 ? 1:0)`) | factory.tsx, factory-recipe.ts, AssemblyLineControls, MachineCountDisplay |
| `displayNum` (UI formatting) imported into factory.tsx solver errors | model depends on view util; error data should carry numbers, view formats them |
| Hardcoded special cases (`recipe-alternate-dilutedpackagedfuel-c` in `setRecipesEnabled`, rubber/plastic loop slugs in `_hasRecycledRubberPlasticLoop`) | policy embedded in mechanism; at minimum hoist to named constants in game-data |

### 2.7 Other structural issues

- **`library.tsx` (296 lines)** does four jobs at module init: constants (rawResources, defaultResourceLimits, notAutomatable, syntheticSinkPoints), parts/buildings parsing, recipe construction, and ~100 lines of synthetic burn-recipe generation for generators. Side-effectful module-level loops with exported mutable arrays.
- **`ProductionLine` constructor auto-creates an AssemblyLine** (when the part has exactly one recipe) — business logic hidden in a constructor, opted out via a positional `suppressAutoRecipe` flag. Deserialization constructs then immediately overwrites `assemblyLines = []`, i.e. the side effect is actively fought by callers.
- **Two coexisting rate systems:** imperative propagation (`setPartRate` → `autoSetPartRate` recursion with `_autoSetPartRateInProgress` cycle guard + auto-created-line garbage collection) *and* LP `autoCalculateRates`. Both are entered from different UI paths. Not fixable cheaply — but the boundary must become explicit so each mutation path declares which engine re-balances it.
- **Wrong extensions:** `factory.tsx`, `assembly-line.tsx`, `production-line.tsx`, `recipe.tsx`, `part.tsx`, `building.tsx`, `library.tsx` contain zero JSX → rename `.ts`.
- **View-model data on domain classes:** `Factory.graphLayout`, `AssemblyLine.rows/rowSpacing` are graph-view presentation state (persisted, so they must survive) — group under an explicit `presentation`/`layout` sub-object so the domain surface stays legible.

## 3. Target structure

```
app/models/
  game-data/                    # static data; loads once, no domain logic
    constants.ts                # rawResources, defaultResourceLimits, notAutomatable,
                                # syntheticSinkPoints, special-case recipe slugs, RATE_EPSILON
    load.ts                     # parts/buildings/recipes parse from data.json
    generator-recipes.ts        # synthetic burn-recipe generation
    index.ts                    # parts, partSlugLookup, buildings, recipes, recipeLookup,
                                # recipeSlugLookup (hoisted from factory-storage)
  recipe.ts                     # Recipe (unchanged) + RecipePart types
  factory-recipe.ts             # FactoryRecipe
  recipe-like.ts                # AnyRecipe discriminated union replacing RecipeLike casts
  part.ts / building.ts
  assembly-line.ts              # options-object ctor; exports shardsForClock, totalMachines();
                                # discriminated MachineCount
  production-line.ts            # no auto-recipe side effect (moves to factory.addProductionLine)
  factory.ts                    # SLIM: state, indexes (_updateRates incl. _productionLineLookup),
                                # line/supplier add-remove, queries; delegates to solver/*
  factory-metrics.ts            # getTotalPower/Shards/Sloops, floor area (merged from
                                # factory-recipe.ts), machine-count totals
  optimizer-config.ts           # RecipeOptimizerConfig + defaults + setRecipesEnabled +
                                # recipeMatchesFilters (+ cascade fns from component plan)
  suggestions.ts                # reject policy + accept/reject-all walks (component plan M-target)
  solver/
    base-model.ts               # createBaseModel, mergeConstraint (pure: inputs → ModelDefinition)
    rate-solver.ts              # solveRates(factory) → { rates, error } pure result
    recipe-optimizer.ts         # optimizeRecipes pipeline + buildScoringObjective + materialize
    verify.ts                   # synchronous constraint verification (replaces setTimeout);
                                # returns structured violations {part, bound, actual}, view formats
  factory-storage.ts            # serialize/deserialize (single deserialize core + link-resolver
                                # strategy replaces the stub copy)
  migrations.ts                 # migrateLibrary + per-schema steps split out of factory-storage
  storage-service.ts            # unchanged minus downloadJson
```

`Factory` public API after the split: state fields, `_updateRates`, add/remove production line & supplier, `setPartRate`/`autoSetPartRate`, query methods delegating to `factory-metrics`, and thin `autoCalculateRates()`/`optimizeRecipes()` wrappers that call `solver/*` and apply results. No `update` field — render notification is valtio's job; mutators own their derived-state recompute (M4). Target ≤400 lines.

## 4. Phases

Ordering interlocks with `component-refactor.md`: component Phases 2/4 planned to *create* `models/optimizer-config.ts`, `suggestions.ts`, `machine-tuning.ts`, `consumer-links.ts`, `library-ops.ts`. Land **M1–M2 before component Phase 4** so those files land in their final homes once.

### Phase M0 — bug fixes (immediately, before any refactor)

Separate bug changes with regression tests first, per AGENTS.md:
1. `_obj`/`obj` accumulation typo in `autoCalculateRates` min-inputs objective.
2. `constraint.min` in equal-violation message.
3. `_productionLineLookup` rebuilt inside `_updateRates`; delete the manual bookkeeping in `addProductionLine`/`removeProductionLine`/`optimizeRecipes`.

### Phase M1 — mechanical hygiene (no behavior change)

1. Rename model `.tsx` → `.ts` (`git mv`).
2. `game-data/` split of library.tsx; hoist `recipeSlugLookup`; dedupe the recipeLookup registration loop.
3. Export `shardsForClock` + `totalMachines(count)` from assembly-line; replace all inline copies (factory-storage ×3, factory.tsx, factory-recipe.ts; components follow in their own plan).
4. `RATE_EPSILON` (and named solver fudge constants) in `game-data/constants.ts`; sweep magic tolerances.
5. `factoryRecipeId(slug)` / `factoryRecipeSlug(id)` helpers; sweep prefix parsing.
6. Move `downloadJson` out of storage-service.

### Phase M2 — split the god class

1. Extract `optimizer-config.ts` and `suggestions.ts` (pure moves — these are the files the component plan consumes).
2. Extract `solver/base-model.ts`, `solver/rate-solver.ts`, `solver/recipe-optimizer.ts` as pure functions: input = factory snapshot + config, output = `{ rates: Map<AssemblyLine, number>, error: string | null }` (or selected recipes). `Factory.autoCalculateRates`/`optimizeRecipes` become thin apply-wrappers. Existing `factory.test.ts` / `recipe-optimizer.test.ts` keep passing against the wrappers; new direct tests target the pure functions.
3. Extract `factory-metrics.ts`; merge `factoryFloorArea` from factory-recipe.ts.
4. Replace the `setTimeout` verification with `solver/verify.ts`: synchronous, returns structured `ConstraintViolation[]`; the wrapper sets `solverError` from it, view layer formats (removes `displayNum` import from the model).

### Phase M3 — type-safety pass

1. `AnyRecipe = Recipe | FactoryRecipe` discriminated union; delete every `as unknown as` in models (and the ones components inherit).
2. `AssemblyLine` options-object constructor (`new AssemblyLine({ recipe, rate, machineSpeed: 100, ... })`); resolve the `rows ?? 1` vs `rows ?? 0` divergence in factory-storage deliberately (spec decides which is right).
3. Discriminated `MachineCount` (`kind: 'remainder' | 'uniform'`); update the 5 probe sites.
4. `ProductionLine` loses the auto-recipe constructor side effect; `Factory.addProductionLine` does it explicitly. `suppressAutoRecipe` flag dies.

### Phase M4 — model reactivity cleanup

The valtio store lands in component Phase 2 (proxy wrap in `useFactorySession`, autosave via `subscribe`), which reduces `factory.update` to a transitional recompute-only shim (`() => factory._updateRates()`). M4 finishes the job on the model side:

1. Delete the `update` field and every internal `this.update()` call. Each mutator that changes rate-affecting state ends with its own `_updateRates()` (or the recompute moves into the mutator directly). Mutation visibility to React is automatic via the proxy — the model carries zero render knowledge. Redundant burst sites (`optimizeRecipes` triple-update, `_applyRates`+caller double-update) disappear with the calls; valtio batches notifications regardless.
2. `ref()`-exempt state that must not be tracked: solver scratch (`_autoSetPartRateInProgress`), and — if profiling shows tracking noise — the derived lookup tables (`rateLookup` stays tracked; it's what components render from). Profile eager-optimizer mode before/after.
3. Define the mutation contract in AGENTS.md: components mutate via model methods on the proxy and never trigger renders manually. Today's scattered `factory.update()` / `autoCalculateRates()` component calls become model methods with clear names, e.g. `factory.setSloopedSlots(al, n)` decides internally whether re-solve is needed — removing the copy-pasted "if outputRate>0 solve else update" branching in AssemblyLineControls.
4. Fix `new Factory(oldFactory)` aliasing: either deep-rebuild via serialize/deserialize round-trip or document+enforce move semantics (old instance dead). Decide in spec; `rebuildFactory` is the only caller. (Aliasing matters more under valtio: a stale un-proxied reference to shared children would mutate invisibly.)
5. Follow-up (can trail into component Phase 4): evaluate converting `_updateRates`'s eager index rebuild into valtio `derive`/computed values — would make the M0 #3 stale-lookup bug class structurally impossible. Not a blocker; explicit recompute in mutators is already correct.

### Phase M5 — storage/migration cleanup

1. Single deserialize core with a link-resolution strategy param (`resolveNested: (id) => SerializedFactory | null`); stub mode = resolver that returns null. Deletes the 60-line copy.
2. Split `migrations.ts`; restructure `migrateLibrary` into per-schema-version steps (`v3→v4`, `v4→v5`) so the next schema bump doesn't grow the blanket any-typed functions.
3. Absorb the component plan's `library-ops.ts` (import remapping) here so import/export/migration live in one place.

### Explicit non-goals

- No immutable-state store (Redux/Zustand/Immer) — those contradict the mutable class model; valtio + mutable classes is the architecture.
- No LP solver replacement, no algorithm changes.
- No unification of the two rate engines (imperative propagation vs LP) — M4 makes the boundary explicit; unification is a future product decision, not a refactor.
- `graphLayout`/`rows`/`rowSpacing` stay persisted; only grouped, not removed.

## 5. Testing strategy

- M0 bugs: regression test per bug *first* (unit — model logic).
- Pure extractions (M1, M2): existing suites must pass unmodified where the public API is preserved; moved functions get direct unit tests at their new homes (solver model shapes, verify.ts violations, metrics totals).
- M3: compile-time win; add union-narrowing tests for FactoryRecipe paths (power/shards/sloops via factory-recipe lines) which are currently the least-covered branches.
- M4 is the highest-risk phase: before deleting `update()` calls, add integration tests pinning "one user action → correct recompute + one notification batch" via a counting `subscribe(factory, cb)` listener, plus autosave-scheduling behavior through `useFactorySession`. Model unit tests get simpler here — no more `update` stubbing.
- Full gates per phase: `npm run test:run`, `npm run test:e2e`, `npm run build`.

## 6. Sequencing with component plan

| Order | Change | Plan |
|---|---|---|
| 1 | M0 bug fixes (3 small changes) | model |
| 2 | Phase 1 `extract-ui-primitives-and-lib` | component |
| 3 | M1 `model-hygiene` | model |
| 4 | M2 `split-factory-god-class` | model |
| 5 | Phase 2 `decompose-factory-page` (introduces valtio store) | component |
| 6 | Phase 3 `introduce-app-contexts` (pushes `useSnapshot` down the tree) | component |
| 7 | M3 `model-type-safety` | model |
| 8 | Phase 4a–d component splits (consume M2's modules) | component |
| 9 | M4 `model-reactivity-cleanup` | model (after Phase 2's valtio store exists) |
| 10 | M5 `storage-migrations` | model |
| 11 | Phase 5 naming/layout sweep | component |
