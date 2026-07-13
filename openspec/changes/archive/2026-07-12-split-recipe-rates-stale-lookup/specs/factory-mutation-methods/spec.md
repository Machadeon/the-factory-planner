## MODIFIED Requirements

### Requirement: R4 — components mutate only through model methods
No component or hook in `app/components/` or `app/hooks/` SHALL assign a `Factory` (or child model) field directly, nor call `factory.update()`, `factory.autoCalculateRates()`, or `factory.optimizeRecipes()` directly. All mutations SHALL go through named model methods on the proxy. Render-path reads SHALL come from snapshots; mutations SHALL target the proxy (reads-from-snapshot / writes-to-proxy). This capability is the sole authority for the mutation contract; `factory-session` R2 defers to it. Enforcement SHALL also cover the two concrete escape-pattern *categories* identified by the `splitRecipeRates` bug (issue #23): a rate-affecting model method called directly on a `ProductionLine`/`AssemblyLine` ref instead of through a `Factory` method, and a mutating helper function called directly from a component instead of through a `Factory` method that wraps it. The helper-mediated category covers both `suggestions.ts` helpers that mutate `optimizer` in place (`applyRejectSilent` and `applyRejectChoice`), not only the one the bug happened to use.

#### Scenario: R4.S1 — no direct field writes in components
- **WHEN** executable statements in `app/components/` and `app/hooks/` are searched for direct assignments to factory model fields (e.g. `factory.constraints =`, `factory.optimizer =`, `factory.graphLayout[...] =`, `factory.icon =`), excluding comments and strings
- **THEN** no occurrences remain outside model files

#### Scenario: R4.S2 — no direct recompute/solve calls in components
- **WHEN** executable statements in `app/components/` and `app/hooks/` are searched for `.update()`, `.autoCalculateRates()`, `.optimizeRecipes()` invoked on the factory, excluding comments and strings
- **THEN** no occurrences remain, and `useFactorySession` no longer assigns `factory.update`

#### Scenario: R4.S3 — no direct `productionLine.splitRecipeRates(` calls in components
- **WHEN** executable statements in `app/components/` and `app/hooks/` are searched for `productionLine.splitRecipeRates(` (a rate-affecting call on the bare model ref, not routed through `factory.splitRecipeRates(...)`), excluding comments and strings
- **THEN** no occurrences remain

#### Scenario: R4.S4 — no direct `applyRejectSilent(` or `applyRejectChoice(` calls in components
- **WHEN** executable statements in `app/components/` and `app/hooks/` are searched for `applyRejectSilent(` or `applyRejectChoice(` called directly (not from within a `Factory` method), excluding comments and strings
- **THEN** no occurrences remain — the reject-then-recompute sequence is expressed as `factory.rejectLine(...)` / `factory.rejectAssembly(...)` (silent path) or `factory.rejectLineChoice(...)` / `factory.rejectAssemblyChoice(...)` (prompted-choice path) instead

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
| split recipe rates (rescale a production line's existing assembly lines by n/(n+1), n = count before any new line is added) | `_updateRates` only |
| reject line / reject assembly, silent or prompted-choice (apply reject behavior to `optimizer.enabledRecipes`; deletion itself is a separate, already-contracted call the component still makes) | `_updateRates` only |

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

#### Scenario: R5.S7 — split recipe rates leaves rateLookup consistent
- **WHEN** `Factory.splitRecipeRates(pl)` is called on a production line with `n` existing assembly lines (evaluated before the mutator runs; the mutator only rescales lines already present — adding the new line that motivated the split is a separate, caller-side step outside this mutator)
- **THEN** every existing assembly line's rate is rescaled by `n/(n+1)`, indexes are recomputed, and `factory.rateLookup` reflects the rescaled rates with no further call from the caller

#### Scenario: R5.S8 — split recipe rates on an empty production line is a no-op
- **WHEN** `Factory.splitRecipeRates(pl)` is called on a production line with zero assembly lines
- **THEN** the rescale loop has nothing to rescale (vacuously consistent), and indexes are still recomputed

#### Scenario: R5.S9 — reject line / reject assembly (silent path) leave rateLookup consistent
- **WHEN** `Factory.rejectLine(pl)` or `Factory.rejectAssembly(recipe)` is called, with `_updateRates()` always running regardless of whether `optimizer.rejectPrompt` is `"always"` (a deny entry is added) or something else (`enabledRecipes` is left unchanged) — mirroring `rejectAllSuggestions()`'s unconditional recompute
- **THEN** `optimizer.enabledRecipes` reflects the remembered reject behavior exactly as `applyRejectSilent` previously computed it, indexes are recomputed, and no re-solve runs
- **AND** the mutator's recompute completes before the component's separate, unchanged deletion call (`onDeleteClicked()` / `removeAssemblyLine()`) runs — the two stay sequential, caller-side steps, exactly as today

#### Scenario: R5.S10 — reject line / reject assembly (prompted-choice path) leave rateLookup consistent
- **WHEN** `Factory.rejectLineChoice(pl, choice)` or `Factory.rejectAssemblyChoice(recipe, choice)` is called with the user's explicit choice from the reject-suggestion prompt
- **THEN** `optimizer.enabledRecipes`/`optimizer.rejectPrompt` reflect the choice exactly as `applyRejectChoice` previously computed it, indexes are recomputed, no re-solve runs, and the recompute completes before the component's separate, unchanged deletion call runs
