## Purpose

Correctness invariant of `Factory._updateRates()`'s derived-index rebuild for
`_productionLineLookup`. Named to align with the eventual `factory.ts` home planned for
Phase M2 of `plans/model-refactor.md` (indexes stay co-located with `_updateRates` there).

## Requirements

### Requirement R1: `_productionLineLookup` reflects only current production lines
When `Factory._updateRates()` runs, `_productionLineLookup` SHALL, after the call
completes, contain an entry for every `ProductionLine` currently in `factory.productionLines`
and no entry for any part slug whose production line is no longer in that array.

This requirement covers only the missing-clear defect in `_updateRates()`
(factory.tsx:257) — it does not remove or change the manual `_productionLineLookup`
writes in `addProductionLine`, `removeProductionLine`, or `optimizeRecipes`'s
`ensureLine()`; those remain as independent (redundant but harmless) writes, tracked
separately in `bugs/redundant_production_line_lookup_bookkeeping.md`.

Note on trigger: `factory.update` (factory.tsx:204) is an externally-injected React
re-render callback — in a real app it is wired by `FactoryComponent` to call
`_updateRates()`, but it defaults to a no-op (factory.tsx:228) and unit tests that
construct `Factory` directly never wire it. All scenarios below therefore name
`factory._updateRates()` itself as the trigger under test, matching how the existing
suite (`tests/unit/models/factory.test.ts`) already exercises it directly.

#### Scenario R1.S1: Lookup drops entries for lines removed via direct array replacement
- **WHEN** `factory.productionLines` is reassigned to a filtered array that omits a
  previously-present production line (bypassing `removeProductionLine`), and
  `factory._updateRates()` subsequently runs
- **THEN** `_productionLineLookup` no longer contains a key for the removed line's part slug

#### Scenario R1.S2: Re-adding a part after wholesale removal succeeds
- **WHEN** a production line for part `P` is removed via direct array replacement (as in
  R1.S1), `factory._updateRates()` runs, and `addProductionLine(P)` is then called
- **THEN** a new production line for `P` is created and appended to `factory.productionLines`
  (the stale-lookup guard does not block the add)

#### Scenario R1.S3: Re-optimizing after reject-all creates a fresh production line
- **WHEN** `optimizeRecipes()` (default, non-`overwrite`) previously created a production
  line for part `P`, that line is later removed via direct array replacement and
  `factory._updateRates()` runs, and `optimizeRecipes()` is called again and selects a
  recipe producing `P`
- **THEN** the resulting production line for `P` is present in `factory.productionLines`
  (not merely written onto an orphaned object absent from the array)

#### Scenario R1.S4: Lookup still reflects lines added or removed through the normal API
- **WHEN**, starting from a factory with production lines for parts `A` and `B`,
  `removeProductionLine(A)` is called (normal path, not a direct array replacement) and
  then `addProductionLine(C)` is called
- **THEN** `_productionLineLookup` contains keys for exactly `B` and `C` (not `A`),
  matching `factory.productionLines`, unchanged from existing behavior

#### Scenario R1.S5: Partial removal leaves the remaining line's entry intact
- **WHEN** `factory.productionLines` holds lines for parts `A` and `B`, is reassigned to
  an array containing only the line for `B` (direct array replacement removing only `A`),
  and `factory._updateRates()` subsequently runs
- **THEN** `_productionLineLookup` contains a key for `B` and no key for `A`

#### Scenario R1.S6: Lookup is empty after all production lines are removed
- **WHEN** `factory.productionLines` is reassigned to `[]` (direct array replacement) and
  `factory._updateRates()` subsequently runs
- **THEN** `_productionLineLookup` has no entries

#### Scenario R1.S7: Repeated calls with no changes are idempotent
- **WHEN** `factory._updateRates()` is called twice in a row with no changes to
  `factory.productionLines` between the calls
- **THEN** `_productionLineLookup` contains the same entries (same keys, same
  `ProductionLine` object references) after the second call as after the first
