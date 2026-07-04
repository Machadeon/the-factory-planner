## Why

`Factory._updateRates()` (`app/models/factory.tsx:257`) rebuilds `rateLookup`,
`_assemblyLineLookup`, and the parts-consumed/produced sets from scratch on every call,
but never clears `_productionLineLookup` first — it only adds entries for the current
`productionLines`. Any code path that replaces `factory.productionLines` wholesale without
going through `removeProductionLine` (e.g. `OptimizationSection.rejectAllSuggestions`)
leaves stale slugs pointing at orphaned `ProductionLine` objects that are no longer in the
array. This causes two observable failures:

1. `addProductionLine`'s guard (`part.slug in this._productionLineLookup`, line 932)
   wrongly refuses to re-add a part whose production line was removed, since the stale
   key is still present.
2. `optimizeRecipes`'s `ensureLine()` (line 619-627, default non-`overwrite` path) finds
   the stale entry and writes the new recipe/rate onto the orphaned object instead of
   creating a fresh `ProductionLine` and pushing it into `factory.productionLines` — so
   the result never renders. This is the exact bug already recorded in
   `bugs/cannot_optimize_after_reject.md` ("Cannot run recipe optimizer after rejecting
   all suggested recipes").

This is bug 3 of `plans/model-refactor.md` Phase M0.

## What Changes

- `_updateRates()` clears `_productionLineLookup` (`= {}`) before repopulating it, the
  same pattern already used for `rateLookup` and `_assemblyLineLookup`.
- No change to `addProductionLine` / `removeProductionLine` / `optimizeRecipes`'s manual
  bookkeeping of `_productionLineLookup` — those manual writes stay as-is. (One of them,
  in `addProductionLine`, is load-bearing for the `autoCreated=true` path, which skips
  `update()`/`_updateRates()` entirely; removing it is a separate, larger change tracked
  in `bugs/redundant_production_line_lookup_bookkeeping.md` for the M1/M2 refactor
  phases, not this bug fix.)

## Capabilities

### New Capabilities
- `production-line-index-consistency`: the correctness invariant of
  `Factory._updateRates()`'s derived-index rebuild — `_productionLineLookup` reflects
  exactly the current `productionLines` array after every call, with no leftover entries
  from lines that are no longer present. Named to align with the eventual `factory.ts`
  home planned for Phase M2 of `plans/model-refactor.md` (indexes stay co-located with
  `_updateRates` there), even though the logic is unchanged in file location for this fix.

### Modified Capabilities

(none)

## Impact

- `app/models/factory.tsx` — one-line fix inside `_updateRates()`.
- Fixes `bugs/cannot_optimize_after_reject.md`.
- Regression test added to `tests/unit/models/factory.test.ts` covering: (a) reject-all
  then re-add the same part succeeds, (b) reject-all then re-run `optimizeRecipes`
  (non-overwrite) produces a production line that is actually present in
  `factory.productionLines`.
- **Sequencing**: third of 3 Phase M0 bug fixes in `plans/model-refactor.md`; independent
  of bugs 1 (`_obj`/`obj` typo) and 2 (equal-constraint message) — no shared code paths,
  touches `_updateRates` which neither other fix touches.
