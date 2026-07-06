## Pass 1 — 2026-07-05

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass
(none — first design pass)

### Findings

- [D5 wrapper sequence] — 🟡 `optimizeRecipes` sequence never clears `solverError` at operation start (current code does, factory.ts:340; D4 step 1 does for `autoCalculateRates`). Followed literally, a stale error survives a subsequent successful optimize and stays rendered in the Alert. Add "solverError = null" as step 0.
- [D1/D4/D7 module map] — 🟡 shared types `Rate` and `PartConstraint` are left in `factory.ts`, but `RateSolveInput.factoryConstraints: PartConstraint[]`, `verifyConstraints(..., rateLookup: {[slug]: Rate})`, and `base-model`'s factory-constraint param all need them — solver/* must type-import `factory.ts` while `factory.ts` value-imports solver/*. These type-only back-edges are erased at runtime but undocumented, in a design that otherwise spells out its acyclicity story (D1) and in a codebase whose convention is explicit acyclic layering (AGENTS.md game-data/constants pattern). Pin the types' home (e.g. move `Rate`/`PartConstraint` to `solver/errors.ts` or a shared types module) or declare the type-only back-edge as accepted.
- [D3 formatter home] — 🟡 "private helper in `FactoryComponent.tsx` or `app/lib/format-solver-error.ts` — implementer's choice" is illusory: D3 also mandates a unit test, which requires an importable export, and exporting a non-component helper from `FactoryComponent.tsx` conflicts with the one-exported-component-per-file rule (AGENTS.md). Pin `app/lib/format-solver-error.ts`.
- [D5 materializeSelection] — 🔵 mutating `_productionLineLookup` from outside the class is acknowledged as a risk but a one-line `Factory` internal (e.g. keep `ensureLine` as a method) would keep index maintenance inside the class; underscore-field reach-in from a sibling module is the same facade-leak pattern D1 rejects for metrics.
- [D3 formatter API] — 🔵 `formatSolverError(error): string` locks multi-violation output into one flat sentence inside the warning Alert; returning structured lines (joined by the caller today) would preserve wording skeletons while not baking the single-string shape into the API for later list rendering.

## Pass 2 — 2026-07-05

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass

- 🟡 [D5 wrapper sequence] stale `solverError`: resolved — wrapper sequence now leads with `solverError = null`, with rationale ("without it a stale error Alert would survive a successful re-optimize"), matching current factory.ts:340 behavior.
- 🟡 [D1/D4/D7] undocumented type back-edges: resolved — D1 now states `Rate`/`PartConstraint` stay exported from `factory.ts`, `solver/*` type-imports them (plus `AssemblyLine`/`ProductionLine`/`RecipeLike`), back-edges erased at compile time, value-import direction strictly factory → solver, anchored to the existing `factory-recipe.ts` type-import precedent (verified real).
- 🟡 [D3 formatter home] illusory implementer's choice: resolved — pinned to `app/lib/format-solver-error.ts` with the unit-test-needs-an-export and one-exported-component-per-file rationale.
- 🔵 [D5 materializeSelection] private-index reach-in: resolved — materializer now builds a local slug → line map at entry and never reads or writes `_productionLineLookup`; wrapper's `_updateRates()` is the single index authority; risk entry updated. Verified sound: nothing between materialization and the rebuild consumes the private index (`_applyRates` iterates `productionLines` directly).
- 🔵 [D3 formatter API] flat-string return: resolved by rationale — string return kept deliberately; sole renderer is the single MUI Alert, structured lines declared speculative surface with an explicit revisit trigger.

### Findings

none
