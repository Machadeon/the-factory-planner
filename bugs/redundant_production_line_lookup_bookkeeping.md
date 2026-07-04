# Redundant manual `_productionLineLookup` bookkeeping in add/removeProductionLine

Once `_updateRates` clears and rebuilds `_productionLineLookup` from scratch on every
`factory.update()` call (fix: `fix-stale-production-line-lookup`), the manual
`this._productionLineLookup[part.slug] = ...` / `delete this._productionLineLookup[part.slug]`
lines in `addProductionLine` and `removeProductionLine` (factory.tsx) become duplicate
sources of truth. They're not dead code today — `addProductionLine` skips `update()`
entirely when `autoCreated=true` (factory.tsx:964), so the manual set is the only thing
keeping the lookup's guard (`part.slug in this._productionLineLookup`) correct for
back-to-back auto-created adds in the same synchronous batch.

Full cleanup (per `plans/model-refactor.md` Phase M0 item 3 / M1-M2) requires either:
- making `addProductionLine` always call `_updateRates()`/`update()` (changes render-trigger
  behavior for bulk auto-create — needs its own regression coverage), or
- keeping an explicit "local cache vs. derived index" distinction documented so the two
  don't silently diverge again.

Not itself user-visible today; tracked so the M1/M2 god-class-split changes don't miss it.

## Steps to Reproduce

N/A — this is a code-hygiene/duplication risk, not a reproducible user-facing bug.

## Expected Results

`_productionLineLookup` has exactly one place that mutates it (the derived rebuild in
`_updateRates`), or the manual bookkeeping is documented as intentionally redundant.

## Actual Results

Three independent write sites (`addProductionLine`, `removeProductionLine`, `optimizeRecipes`'
`ensureLine`) plus the derived rebuild in `_updateRates` all mutate the same field.

## Full Error Message

None
