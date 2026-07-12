Ordering note (reviewer check c): the counting-`subscribe` tests (1.19) and all behavior-preservation stubs in Group 1 are authored **before** any task that deletes `update()` (Group 6). Stubs use the new mutator API, so they fail until Groups 3–4 land; the `update` field is not removed until Group 6, after the batch/behavior tests exist and pass.

## 1. Test Stubs

Write all as failing stubs first (target the new `Factory` mutator API from design D6 / spec R5). Run them and confirm failure before implementing.

- [x] 1.1 Unit stub (R1.S1): assert `app/models/factory.ts` has no `update` field and no executable `this.update(` call.
- [x] 1.2 Unit stub (R1.S2): assert `Factory` constructor takes zero params and every `new Factory(...)` in `app/` + `tests/` passes no args (no copy-construction).
- [x] 1.3 Integration stub (R1.S3 / factory-session R2.S1): a rate-affecting mutator on the proxied factory re-renders a consumer that read the changed field, with no version counter.
- [x] 1.4 Unit stub (R2.S1): an `_updateRates`-class mutator (add assembly line) leaves `rateLookup` + index lookups consistent with no caller recompute.
- [x] 1.5 Unit stub (R2.S2): the `autoSetPartRate` propagation mutator leaves propagated rates + lookups consistent on return.
- [x] 1.6 Unit stub (R2.S3): a re-solve mutator on an infeasible model sets `solverError` and leaves state consistent, no callback.
- [x] 1.7 Unit stub (R2.S4): a feasible re-solve after an infeasible one clears `solverError`.
- [x] 1.8 Unit stub (R3.S1): `setNodePosition` / `pruneGraphLayout` change layout without running any recompute/solve; change is observable.
- [x] 1.9 Unit stub (R3.S2): `setIcon` changes the icon without recompute/solve.
- [x] 1.10 Unit stub (R5.S1): clock speed, remainder toggle, and machine-count edits do NOT re-solve even with a line at `outputRate > 0` (indexes recomputed only).
- [x] 1.11 Unit stub (R5.S2): sloop change re-solves when any line has `outputRate > 0`, recomputes-only otherwise.
- [x] 1.12 Unit stub (R5.S3): output-rate edit, maximize-output toggle, and constraint edit each re-solve.
- [x] 1.13 Unit stub (R5.S4): optimizer-config edit and per-part point-override edit recompute only (no solver, no optimizer).
- [x] 1.14 Unit stub (R5.S5): enabling line auto-calc runs propagation; disabling recomputes only.
- [x] 1.15 Unit stub (R5.S6): production-target optimization runs the recipe optimizer; add/remove supplier and add/remove assembly line recompute only.
- [x] 1.16 Unit stub (R6.S1): `ref()`-wrapped `_autoSetPartRateInProgress` guards recursion correctly (add/has/delete work) and its mutation publishes no notification.
- [x] 1.17 Integration stub (R6.S2): rebuilding `rateLookup` / `_assemblyLineLookup` / `_mainOutputParts` re-renders components that read them.
- [x] 1.18 Unit stub (R6.S3): the only `ref(` in `app/models/factory.ts` wraps `_autoSetPartRateInProgress`.
- [x] 1.19 Integration stub (R7.S1): a counting `subscribe(factory, cb)` on a fixture fires exactly once per single mutator call, and `rateLookup` holds the expected concrete rates. Cover one mutator per recompute kind (`_updateRates`, `autoCalculateRates`, `optimizeRecipes`, `autoSetPartRate`).
- [x] 1.20 Unit stub (R4.S1): standing test — no direct factory-field assignments in `app/components/` or `app/hooks/` (executable lines only).
- [x] 1.21 Unit stub (R4.S2): standing test — no `.update()` / `.autoCalculateRates()` / `.optimizeRecipes()` calls on the factory in `app/components/` or `app/hooks/`, and `useFactorySession` no longer assigns `factory.update`.
- [x] 1.22 Integration stub: autosave scheduling through `useFactorySession` still fires on a mutation (via `subscribe`) after the shim is gone.
- [x] 1.23 Run Group 1, confirm the stubs fail (missing mutators / field still present).

## 2. Model internals — recompute correctness (design D2)

- [x] 2.1 Replace each internal `this.update()` in `factory.ts` with the recompute spec R5 pins for that method.
- [x] 2.2 Delete redundant trailing `this.update()` where a `_updateRates()`/solve already ran in the path (`optimizeRecipes`, `autoCalculateRates`).
- [x] 2.3 Delete `this.update()` in solver-error branches (rely on the tracked `solverError` write). Keep the `update` field for now (external callers unmigrated).
- [x] 2.4 Confirm no internal `this.update()` calls remain; 2.x behavior stubs that don't need new mutators start passing.

## 3. Model mutators (design D1/D4/D6)

- [x] 3.1 Add rate-affecting `Factory` mutators taking proxy-derived child refs: `setClockSpeed`, `setAllowRemainder`, `setMachineCount`, `setSloopedSlots` `(al, value)`; `setProductionLineRate`, `setOutputRate`, `setMaximizeOutput`, `setAutoCalculateRate` `(pl, value)`. Each ends with its R5 recompute (reuse existing child setters + solver wrappers internally).
- [x] 3.2 Add structural mutators: `addAssemblyLine(pl, recipe)`, `addFactoryAssemblyLine(...)`, `removeAssemblyLine(pl, recipe)`, `acceptLine(pl)`, `acceptAssembly(pl, recipe)` — recompute per R5.
- [x] 3.3 Add config mutators: `setConstraints` (re-solve), `setOptimizerConfig`, `setPartPointOverride`/`setPartPointOverrides` (recompute-only); add `optimize(overrides)` wrapper.
- [x] 3.4 Add presentation mutators: `setIcon`, `setNodePosition`, `pruneGraphLayout` — no recompute.
- [x] 3.5 Verify each mutator maps to exactly one R5 row (no added/dropped/re-mapped behavior). Behavior stubs 1.4–1.15 now pass.

## 4. Component conversion (spec R4)

- [x] 4.1 `AssemblyLineControls` / `AssemblyLineComponent`: route speed/remainder/machine-count/sloop through the new mutators; remove the inline `if outputRate>0 … else …` branch and `factory.update()` calls.
- [x] 4.2 `ProductionLineComponent` / `ProductionTargetsBar` / `NestedFactoryRow`: route rate/output/maximize/auto-calc/optimize/accept/reject/add-remove through mutators.
- [x] 4.3 Optimization panels (`ConstraintsPanel`, `SourceFactoriesEditor`, `OptimizerPanel`, `AvailablePartsEditor`, `OptimizerRecipeFilters`, `PointValuesPanel`) and `OptimizationSection`: replace field-writes + `update()`/`autoCalculateRates()` with `setConstraints`/`setOptimizerConfig`/`setPartPointOverride(s)`.
- [x] 4.4 `LogisticsSection` / `logistics/AssemblyLineNode`: replace `graphLayout` writes + `update()` with `setNodePosition`/`pruneGraphLayout`.
- [x] 4.5 `factory/useFactoryPageFlows`: replace `factory.icon = …` + `update()` with `setIcon`.
- [x] 4.6 Enable the R4 standing tests (1.20/1.21); confirm no direct writes or solve calls remain.

## 5. Aliasing + constructor cleanup (design D5)

- [x] 5.1 Delete `rebuild()` from `useFactorySession`.
- [x] 5.2 Delete the `oldFactory?` branch; make the `Factory` constructor no-arg. Confirm the remaining `new Factory()` sites pass no args. Stubs 1.2 pass.

## 6. Delete the render callback (design D5) — after Groups 1, 3, 4

- [x] 6.1 Delete the `factory.update` shim assignment in `useFactorySession`.
- [x] 6.2 Delete the `update` field from `Factory`. Build fails on any missed caller — fix until green. Stubs 1.1/1.21 pass.
- [x] 6.3 Update the stale `factory.update()` comment in `FactoryContext.tsx`.

## 7. ref() scratch + contract doc (design D3)

- [x] 7.1 Initialize `_autoSetPartRateInProgress` as `ref(new Set())` in `factory.ts` (import `ref` from valtio). Stubs 1.16/1.18 pass.
- [x] 7.2 Add the mutation-contract section to `AGENTS.md` (mutate via model methods on the proxy with proxy-derived args; never trigger renders; reads-from-snapshot / writes-to-proxy).

## 8. Verification

- [x] 8.1 All unit/integration tests pass (`npm run test:run`).
- [x] 8.2 All E2E tests pass (`npm run test:e2e`).
- [x] 8.3 Production build passes (`npm run build`).
- [x] 8.4 Profile eager-optimizer mode before/after (plan §155 validation): confirm no tracking-noise regression; the `ref()` exempt list stays `{ _autoSetPartRateInProgress }` (non-blocking — record numbers only).
