## Why

The `Factory` model still carries a view callback: `factory.update`. Component Phase 2 reduced it to a recompute-only shim (`() => factory._updateRates()`), but the field and ~30 scattered `factory.update()` / `autoCalculateRates()` call sites remain, alongside ~11 direct component writes into model fields. The contract for "who triggers recompute + render" is still undefined, so components inconsistently call `update()`, `autoCalculateRates()`, or both after a mutation. valtio now makes render notification automatic on the proxied graph, so the model can own its derived-state recompute and carry zero render knowledge. This is the last structural blocker for undo/redo (F1), which needs a clean mutation surface and no aliasing hazards.

## What Changes

- **BREAKING (internal API):** Delete the `Factory.update` field and every internal `this.update()` call. Each rate-affecting mutator ends by recomputing its own derived state (`_updateRates()`, or a re-solve where the mutation demands it). Render notification is the valtio proxy's job.
- Delete the transitional recompute-only `update` shim in `useFactorySession` (R3 of `factory-session`).
- **Full mutation-contract conversion.** Every component mutation of the factory graph goes through a named model method on the proxy — no component assigns model fields or calls `update()`/`autoCalculateRates()`/`optimizeRecipes()` directly. Introduces mutators such as `setConstraints`, `setOptimizerConfig`, `setPartPointOverride`, `setIcon`, `setSloopedSlots`, and presentation setters `setNodePosition` / `pruneGraphLayout`. Each mutator decides internally whether a re-solve is needed, removing the copy-pasted "if outputRate>0 solve else update" branching (e.g. `AssemblyLineControls`).
- **Delete dead `rebuild()` + the `new Factory(oldFactory)` copy-constructor path.** `rebuild()` in `useFactorySession` has zero callers (removed by component Phases 2–4) and is the only caller of the copy constructor. Removing both eliminates the reference-aliasing hazard (`productionLines` / `supplierFactories` copied by reference) at the source; the `Factory` constructor becomes no-arg. Undo/redo (F1) will introduce its own deliberate snapshot mechanism.
- **`ref()`-exempt only solver scratch:** wrap `_autoSetPartRateInProgress` in `ref()` so it is not proxy-tracked. `rateLookup`, `_assemblyLineLookup`, and `_mainOutputParts` stay tracked (components render from them); the no-reader lookups (`_productionLineLookup`, `_partsConsumed`, `_partsProduced`) stay tracked so future read accessors remain reactive — a profiling pass over eager-optimizer mode validates there is no tracking-noise regression but does not change the exempt list.
- Document the mutation contract in `AGENTS.md`: components mutate via model methods on the proxy and never trigger renders manually; reads-from-snapshot / writes-to-proxy.

Explicitly **out of scope** (verbatim M4 boundary): converting `_updateRates`'s eager index rebuild to valtio `derive`/computed values (plan item 5 — non-blocker, eager rebuild is fast and safe); and the read-side accessor-encapsulation refactor (`getPartRate` etc.), captured as a separate follow-up in `plans/plan.md`.

## Capabilities

### New Capabilities
- `factory-mutation-methods`: named model mutators own their derived-state recompute (rate-affecting mutators recompute or re-solve; presentation mutators do not); components mutate only through them; the model holds no render callback. Includes the `ref()`-exempt scratch rule and the mutation-contract statement enforced across the component tree.

### Modified Capabilities
- `factory-session`: delete R3 (the transitional `update` shim) and the `Factory.update` field it assigned; tighten R2 so component mutations go through model methods only (not bare field assignment); delete the dead `rebuild()` swap and the `new Factory(oldFactory)` copy-constructor path. R6 dirty-tracking is already `subscribe`-driven and is unaffected in substance.

## Impact

- **Model:** `app/models/factory.ts` (delete `update` field + internal calls + copy-ctor param; add/rename mutators; `ref()` scratch), plus mutators that migrate branching logic out of components.
- **Hooks:** `app/hooks/useFactorySession.ts` (delete shim + `rebuild()`).
- **Components (~41 sites):** `AssemblyLineComponent`, `AssemblyLineControls`, `ProductionLineComponent`, `ProductionTargetsBar`, `NestedFactoryRow`, `ConstraintsPanel`, `LogisticsSection`, `OptimizationSection`, `optimization/*` panels, `logistics/AssemblyLineNode`, `factory/useFactoryPageFlows` — replace `update()`/`autoCalculateRates()` calls and direct field writes with named model methods.
- **Docs:** `AGENTS.md` mutation-contract section.
- **Tests:** new counting-`subscribe` integration tests (one action → correct recompute + one notification batch) land before `update()` deletion; model unit tests drop `update` stubbing.
- **Downstream:** unblocks F1 (undo/redo).
