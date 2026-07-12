# Review — model-reactivity-cleanup

## Pass 1 — 2026-07-12

**Source: Reviewer**
**Status: APPROVED**

### Resolved from Previous Pass

(empty on pass 1)

### Findings

- app/components/ProductionLineComponent.tsx:184: MED: `splitRecipes()` calls `productionLine.splitRecipeRates()` directly — a rate-affecting mutation (scales every assembly line's rate by n/(n+1)) with no Factory mutator and no recompute, so `rateLookup` stays stale until the next mutation. Pre-existing on main, but it contradicts the change's own R4/R5 contract ("every rate-affecting mutation goes through a named Factory method that owns its recompute") and slips past the contract test. Add `Factory.splitRecipeRates(pl)` ending in `_updateRates()` and convert the component.
- tests/unit/mutation-contract.test.ts:44: LOW: enforcement regexes only match `factory.<field> =` and `factory.update/autoCalculateRates/optimizeRecipes(` — nested writes (`factory.optimizer.targets = x`), writes through line refs (`productionLine.rate = x`, `assemblyLine.machineSpeed = x`), and helper-mediated mutations (`applyRejectSilent(factory.optimizer, …)` at ProductionLineComponent.tsx:131) all escape. Widen the patterns to cover `productionLine.`/`assemblyLine.`/`pl.`/`al.` assignments, or document the gap.
- app/models/suggestions.ts:58: LOW: doc comments here and at line 71 still say "Callers own the post-mutation `factory.update()`" — `update` no longer exists; the owning callers are now `Factory.acceptAllSuggestions()`/`rejectAllSuggestions()` ending in `_updateRates()`. Update both comments.
- app/models/factory.ts:632: LOW: `removeAssemblyLine` adds an `if (index >= 0)` guard the old component code lacked — on main, a slug miss spliced index -1 and silently deleted the *last* assembly line. The guard is a strict improvement, but it is a behavior change under the "preserved verbatim" claim; record it as intentional.

Verification notes: full unit suite green (81 files, 530 passed). All 11 converted components mutate through the proxy (`useFactory()` or proxy-derived props/node data); no snapshot-derived args found. No remaining `factory.update()`/direct `autoCalculateRates()`/`optimizeRecipes()` calls in components or hooks; `rebuild()` and the copy constructor have no surviving callers. `_updateRates` reassigns `rateLookup` first (reassignment-publishes invariant holds). Solver error early-returns that dropped the old `this.update()` are safe: every path either writes `solverError` (rendered via `snap.solverError` in FactoryPage, which re-renders the subtree) or reaches `_updateRates()`. R5 semantics spot-checked verbatim: clock/remainder/machine-count/config/point-override/supplier/add-remove = recompute-only; sloop re-solves iff any `outputRate > 0`; output-rate/maximize/constraint re-solve; optimize wraps the recipe optimizer; auto-calc enable propagates via `autoSetPartRate`. `ref()` usage is confined to the solver scratch set and enforced by test R6.S3.

## Pass 2 — 2026-07-12

**Source: Main (post-review follow-up)**
**Status: APPROVED**

### Resolved from Previous Pass

- suggestions.ts:58,71 (LOW) — FIXED. Both doc comments rewritten to reference `Factory.acceptAllSuggestions()`/`rejectAllSuggestions()` owning the post-mutation recompute; no longer mention the deleted `factory.update()`.
- mutation-contract.test.ts (LOW) — PARTIALLY ADDRESSED. R4.S1 regex widened to catch nested/indexed writes (`factory.optimizer.targets =`, `factory.graphLayout[id] =`) via `(\.[a-zA-Z]+|\[[^\]]*\])*`. Test still passes (2/2), confirming no such writes remain in `app/`. Left open: writes through bare `productionLine.`/`assemblyLine.` refs and helper-mediated `applyRejectSilent(factory.optimizer, …)` — pre-existing reject-policy paths, out of M4's enumerated scope; captured as follow-up.

### Findings

- app/components/ProductionLineComponent.tsx:184: MED (LEFT OPEN — out of scope): `splitRecipes()` is pre-existing on main and unchanged by M4. Adding a recompute would be a behavior change (verbatim-preservation is an M4 non-goal); if `splitRecipeRates` can shift intermediate consumption it is a latent bug that belongs in its own bug change with a regression test (per AGENTS.md M0 pattern), not smuggled into this refactor.
- app/models/factory.ts `removeAssemblyLine` guard: LOW — recorded as INTENTIONAL. The `index >= 0` guard fixes main's `splice(-1, 1)` last-line-deletion on a slug miss; kept as a safe correctness improvement.
