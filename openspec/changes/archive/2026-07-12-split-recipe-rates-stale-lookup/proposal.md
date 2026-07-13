## Why

`ProductionLineComponent.splitRecipes()` (app/components/ProductionLineComponent.tsx:183-186) calls `productionLine.splitRecipeRates()` directly. That method (app/models/production-line.ts:79-85) rescales every assembly line's `rate` by `n/(n+1)` — a rate-affecting mutation — but never recomputes `factory.rateLookup`. The lookup stays stale until some unrelated mutation happens to run `_updateRates()`. This violates the mutation contract in `factory-mutation-methods` (R2, R4) and AGENTS.md, and slipped past `tests/unit/mutation-contract.test.ts` because its regexes only match `factory.*` writes, not bare `productionLine.`/`assemblyLine.` refs or helper-mediated mutations. Flagged MED in the `model-reactivity-cleanup` review, left open as out-of-scope, never filed until GitHub issue #23. Tracked as B2.5 in `plans/plan-order.md`, and must land before B3 (Phase 5 renames this component).

## What Changes

- Add `Factory.splitRecipeRates(pl: ProductionLine)`: performs the same n/(n+1) rescale, ending in `_updateRates()` (index-recompute only, per the existing closed-list pattern for structural edits — no re-solve).
- Convert `ProductionLineComponent.splitRecipes()` to call `factory.splitRecipeRates(productionLine)` instead of `productionLine.splitRecipeRates()` directly. Remove the now-unused method from `ProductionLine` (or keep it private/inlined — decided in design).
- Add `Factory.rejectLine(pl: ProductionLine)` and `Factory.rejectAssembly(recipe: AnyRecipe)` mirroring the existing `rejectAllSuggestions()` pattern (factory.ts:654-657: helper call + `_updateRates()`). `rejectAssembly` takes no `pl` — reject state lives in the global `optimizer.enabledRecipes` keyed by recipe slug, unlike `acceptAssembly(pl, recipe)` which needs `pl` to find a specific `AssemblyLine.autoCreated` flag to flip. These wrap the `applyRejectSilent(factory.optimizer, …)` mutation from `ProductionLineComponent.tsx:130,144` (the silent-reject path) so it always ends in a recompute, same as every other `optimizer`-touching mutator (`setOptimizerConfig`, `rejectAllSuggestions`).
- Add `Factory.rejectLineChoice(pl: ProductionLine, choice: RejectChoice)` and `Factory.rejectAssemblyChoice(recipe: AnyRecipe, choice: RejectChoice)`, same pattern, wrapping `applyRejectChoice(factory.optimizer, …, choice)` from `ProductionLineComponent.tsx:152,162` (the prompted-choice path — same escape class as `applyRejectSilent`, found while placing the fix; converting it now closes the mutation-contract gap for this component's optimizer edits completely rather than leaving an identical hole under a different helper name).
- Deletion itself is unchanged in all four cases — the component still separately calls `props.onDeleteClicked()` / `removeAssemblyLine()` right after, exactly as today (those paths already recompute on their own).
- Widen `tests/unit/mutation-contract.test.ts` R4.S1/R4.S2 regexes to also catch, as concrete token patterns (not a semantic "is this rate-affecting" judgment call):
  - `productionLine.splitRecipeRates(` called directly from a component (the exact escape class this bug used)
  - `applyRejectSilent(` or `applyRejectChoice(` called directly from a component (forces both helpers behind a Factory method, closing the escape class for the optimizer-config path in both its silent and prompted forms)
- Regression test first (AGENTS.md bug process): split recipes on a line with intermediates, assert `factory.rateLookup` reflects the rescale immediately after the mutator call, no other mutation in between.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `factory-mutation-methods`: R5's closed list of mutators gains `splitRecipeRates`, `rejectLine`, `rejectAssembly`, `rejectLineChoice`, `rejectAssemblyChoice` (all `_updateRates` only, no re-solve). R4 gains two new enforcement scenarios (R4.S3, R4.S4) that ban the concrete escape-hatch call patterns this bug used — `productionLine.splitRecipeRates(`, `applyRejectSilent(`, and `applyRejectChoice(` called directly from a component.

## Impact

- `app/models/factory.ts` — new mutator methods: `splitRecipeRates(pl)`, `rejectLine(pl)`, `rejectAssembly(recipe)`, `rejectLineChoice(pl, choice)`, `rejectAssemblyChoice(recipe, choice)`.
- `app/models/production-line.ts` — `splitRecipeRates()` stays as-is (called only by the new `Factory.splitRecipeRates`), no removal.
- `app/components/ProductionLineComponent.tsx` — five call-site conversions (`splitRecipes`, `rejectLine`, `rejectAssembly`, both branches of `onRejectChoice`).
- `tests/unit/mutation-contract.test.ts` — widened regexes.
- `tests/unit/models/factory-mutation-methods.test.ts` (or equivalent) — new regression tests for `rateLookup`/`optimizer` consistency after split and after each reject variant.
- No storage/schema impact, no API impact.
