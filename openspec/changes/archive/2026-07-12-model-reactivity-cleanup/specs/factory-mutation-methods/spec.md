# factory-mutation-methods

The mutation contract for the valtio-proxied domain graph: named model methods own their derived-state recompute, components mutate only through them, and the model holds no render callback. Behavior is preserved verbatim from the pre-change component call sites — this capability relocates *where* the recompute decision lives (component → model), not *what* it decides.

**Definitions.** A **rate-affecting mutator** is any model method enumerated in R5 (the closed list of mutators M4 introduces or converts). A **presentation mutator** is a model method that changes only persisted view state and appears in R3. Every model mutation a component performs is one or the other. All mutators M4 introduces are **synchronous** — they perform their writes and recompute before returning, with no `setTimeout`, microtask, or `await` (the former deferred `setTimeout` verification was already removed in M2).

## ADDED Requirements

### Requirement: R1 — the model holds no render callback
`Factory` SHALL NOT expose an `update` field or any other view/render callback, and no model method SHALL invoke one. Render notification SHALL rely solely on valtio proxy tracking (a mutation on the proxied graph publishes itself). The `Factory` constructor SHALL take no arguments; copy-construction (`new Factory(oldFactory)`) SHALL NOT exist.

#### Scenario: R1.S1 — no update field
- **WHEN** `app/models/factory.ts` is inspected
- **THEN** there is no `update` field declaration and no executable `this.update(` call remains in the file

#### Scenario: R1.S2 — no copy constructor
- **WHEN** the `Factory` constructor signature is inspected and `app/` + `tests/` are searched for constructor calls
- **THEN** the constructor declares no parameters and every `new Factory(...)` call passes zero arguments (no copy-construction path exists)

#### Scenario: R1.S3 — mutation still re-renders without a callback
- **WHEN** a rate-affecting mutator runs on the proxied factory and no `update` callback exists
- **THEN** components whose snapshot read the changed fields re-render

### Requirement: R2 — rate-affecting mutators recompute their derived state
Every mutator enumerated in R5 SHALL, before returning, leave derived state (`rateLookup` and the index lookups) consistent with the mutation by performing the exact recompute the pre-change call site performed: a plain index recompute (`_updateRates`), a rate re-solve (`autoCalculateRates`), a recipe re-selection (`optimizeRecipes`), or imperative propagation (`autoSetPartRate`). A caller SHALL NOT need to run any recompute after invoking a mutator.

#### Scenario: R2.S1 — index-recompute mutator leaves state consistent
- **WHEN** an `_updateRates`-class mutator (e.g. add assembly line) is called
- **THEN** `rateLookup` and the index lookups reflect the mutation with no further call from the caller

#### Scenario: R2.S2 — propagation mutator leaves state consistent
- **WHEN** the auto-calculate-rate propagation mutator (`autoSetPartRate` path) is invoked
- **THEN** the propagated rates and index lookups are consistent on return, with no caller-side recompute

#### Scenario: R2.S3 — solver-error branch sets error and stays consistent
- **WHEN** a re-solve mutator's solver returns infeasible
- **THEN** `solverError` is set (a tracked write), derived state is left consistent, and no render callback is invoked

#### Scenario: R2.S4 — solver error clears on a later feasible solve
- **WHEN** a re-solve mutator runs feasibly after a previous infeasible result set `solverError`
- **THEN** `solverError` is cleared to its no-error value

### Requirement: R3 — presentation mutators do not recompute
A presentation mutator SHALL NOT trigger any rate recompute or re-solve; the proxy write itself is the notification. This rule applies to every presentation-only mutator, whether or not it is in the current set (graph node layout position set/prune, factory icon).

#### Scenario: R3.S1 — layout write skips recompute
- **WHEN** a graph-layout position is set or pruned via its model method
- **THEN** no `_updateRates` / `autoCalculateRates` / `optimizeRecipes` runs, and the layout change is still observable on the proxy

#### Scenario: R3.S2 — icon write skips recompute
- **WHEN** the factory icon is set via its model method
- **THEN** no recompute or re-solve runs, and the new icon is observable on the proxy

### Requirement: R4 — components mutate only through model methods
No component or hook in `app/components/` or `app/hooks/` SHALL assign a `Factory` (or child model) field directly, nor call `factory.update()`, `factory.autoCalculateRates()`, or `factory.optimizeRecipes()` directly. All mutations SHALL go through named model methods on the proxy. Render-path reads SHALL come from snapshots; mutations SHALL target the proxy (reads-from-snapshot / writes-to-proxy). This capability is the sole authority for the mutation contract; `factory-session` R2 defers to it.

#### Scenario: R4.S1 — no direct field writes in components
- **WHEN** executable statements in `app/components/` and `app/hooks/` are searched for direct assignments to factory model fields (e.g. `factory.constraints =`, `factory.optimizer =`, `factory.graphLayout[...] =`, `factory.icon =`), excluding comments and strings
- **THEN** no occurrences remain outside model files

#### Scenario: R4.S2 — no direct recompute/solve calls in components
- **WHEN** executable statements in `app/components/` and `app/hooks/` are searched for `.update()`, `.autoCalculateRates()`, `.optimizeRecipes()` invoked on the factory, excluding comments and strings
- **THEN** no occurrences remain, and `useFactorySession` no longer assigns `factory.update`

### Requirement: R5 — per-mutator recompute semantics preserved verbatim
Each named mutator SHALL preserve the exact recompute choice of the call site it replaces. The closed list:

| Mutator (action) | Recompute |
|---|---|
| clock speed, remainder toggle, machine-count edit | `_updateRates` only — never re-solve, even with `outputRate > 0` |
| somersloop slots | `autoCalculateRates` when any production line has `outputRate > 0`, else `_updateRates` |
| output-rate edit | `autoCalculateRates` |
| maximize-output toggle | `autoCalculateRates` |
| constraint edit | `autoCalculateRates` |
| production-target optimization | `optimizeRecipes` |
| enable line auto-calculate-rate | `autoSetPartRate` |
| disable line auto-calculate-rate | `_updateRates` only |
| optimizer-config edit | `_updateRates` only — never re-solve |
| per-part point-override edit | `_updateRates` only — never re-solve |
| add / remove supplier | `_updateRates` only |
| add / remove assembly line | `_updateRates` only |

"Any production line has `outputRate > 0`" is evaluated across all of the factory's production lines (a single line above zero suffices).

#### Scenario: R5.S1 — clock/remainder/machine-count edits do not re-solve
- **WHEN** clock speed, the remainder toggle, or the machine count is changed on an assembly line while some production line has `outputRate > 0`
- **THEN** indexes are recomputed but the rate solver does not run

#### Scenario: R5.S2 — sloop edit branches on output rate
- **WHEN** somersloop slots change and at least one production line has `outputRate > 0`
- **THEN** the rate solver runs; **AND WHEN** no production line has `outputRate > 0`, only indexes are recomputed

#### Scenario: R5.S3 — output-rate, maximize, and constraint edits re-solve
- **WHEN** an output-rate edit, a maximize-output toggle, or a constraints edit is applied via its model method
- **THEN** the rate solver runs and derived state reflects the change

#### Scenario: R5.S4 — config edits do not re-solve
- **WHEN** the optimizer config or a per-part point override is set via its model method
- **THEN** indexes are recomputed but neither the rate solver nor the recipe optimizer runs

#### Scenario: R5.S5 — auto-calculate-rate toggle
- **WHEN** a line's auto-calculate-rate is enabled
- **THEN** imperative rate propagation runs; **AND WHEN** it is disabled, only indexes are recomputed (no propagation, no re-solve)

#### Scenario: R5.S6 — optimization and supplier/line structural edits
- **WHEN** production-target optimization is invoked
- **THEN** the recipe optimizer runs; **AND WHEN** a supplier or assembly line is added or removed, only indexes are recomputed

### Requirement: R6 — only solver scratch is ref()-exempt
The solver scratch field `_autoSetPartRateInProgress` SHALL be excluded from valtio tracking via `ref()`. No other `Factory` field SHALL be `ref()`-exempt — in particular every derived lookup table stays tracked so components reading them (and any future read accessor over them) remain reactive. `ref()` SHALL strip tracking only; the scratch value SHALL remain functionally readable and writable so cycle-guard propagation still works.

#### Scenario: R6.S1 — scratch exempt but still functional
- **WHEN** rate propagation runs and mutates `_autoSetPartRateInProgress` (add/check/delete)
- **THEN** the cycle guard behaves correctly (recursion is guarded and cleared) and mutating the scratch set publishes no notification

#### Scenario: R6.S2 — rendered lookups reactive
- **WHEN** `rateLookup`, `_assemblyLineLookup`, or `_mainOutputParts` is rebuilt by a recompute
- **THEN** components whose snapshot read that lookup re-render

#### Scenario: R6.S3 — no other field exempt
- **WHEN** `app/models/factory.ts` is searched for `ref(`
- **THEN** the only `ref()`-wrapped field is `_autoSetPartRateInProgress`

### Requirement: R7 — one user action produces one notification batch with the correct result
A single user action routed through one synchronous mutator SHALL produce exactly one valtio `subscribe` notification batch, and the resulting `rateLookup` SHALL hold the rates that mutator's recompute produces for the given fixture. Because mutators are synchronous (per the capability definition), all of a mutator's writes fall in one batch.

#### Scenario: R7.S1 — single batch, correct rates
- **WHEN** a counting `subscribe(factory, cb)` listener is attached to a fixture factory and one rate-affecting mutator is invoked
- **THEN** the listener fires exactly once, and `rateLookup` holds the expected numeric production/consumption rates for that fixture (asserted against concrete values, not against a captured pre-change snapshot)
