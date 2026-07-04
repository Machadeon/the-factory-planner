## Context

`Factory._updateRates()` (`factory.tsx:257-265`) resets `rateLookup`, `_assemblyLineLookup`,
`_partsConsumed`, `_partsProduced`, and `_mainOutputParts` to fresh empty containers at the
top of the method, then repopulates all of them from the current `factory.productionLines`
array. `_productionLineLookup` is the one exception: it is never reset, only added to
(`this._productionLineLookup[productionLine.part.slug] = productionLine;` inside the loop).
Any caller that replaces `factory.productionLines` wholesale without going through
`removeProductionLine` — e.g. `OptimizationSection.rejectAllSuggestions`
(`app/components/OptimizationSection.tsx:64-85`) — leaves orphaned entries in
`_productionLineLookup` pointing at `ProductionLine` objects no longer in the array.
`specs/production-line-index-consistency/spec.md` (R1) requires the lookup to reflect
exactly the current array after every `_updateRates()` call. This document decides how to
implement and test that.

## Goals / Non-Goals

**Goals:**
- Make `_updateRates()` clear `_productionLineLookup` before repopulating it, matching the
  reset pattern already used for the other four derived containers in the same method.
- Add regression tests covering spec scenarios R1.S1-S7 (wholesale removal, re-add after
  removal, re-optimize after removal, normal add/remove API, partial removal, empty
  array, idempotency).

**Non-Goals:**
- No change to the manual `_productionLineLookup` writes in `addProductionLine`
  (factory.tsx:958), `removeProductionLine` (factory.tsx:972), or `optimizeRecipes`'s
  `ensureLine()` (factory.tsx:619-627). Per the proposal, these stay as independent
  (redundant but harmless) writes; `addProductionLine`'s write is load-bearing for the
  `autoCreated=true` path, which skips `update()`/`_updateRates()` entirely
  (factory.tsx:964). Deduplicating them is tracked separately in
  `bugs/redundant_production_line_lookup_bookkeeping.md` for the Phase M1/M2 refactor.
- No change to `optimizeRecipes`'s `overwrite` branch (factory.tsx:614-617), which already
  clears `_productionLineLookup` explicitly and is unaffected by this bug.
- No change to `OptimizationSection.rejectAllSuggestions` or any other component code —
  the fix is entirely in the model layer; components that bypass `removeProductionLine`
  remain free to do so, since `_updateRates()` now tolerates it correctly.

## Decisions

**D1 — Fix**: add `this._productionLineLookup = {};` to the top of `_updateRates()`
(factory.tsx:258), alongside the four existing resets, in the same style
(`this.rateLookup = {}`, `this._assemblyLineLookup = {}`, etc.). One line, same location,
no other changes to the method or its call sites.

**D2 — Test mechanism**: direct unit tests using real `Factory`/`ProductionLine`/
`AssemblyLine` instances, no mocking. `_updateRates()` is a synchronous, pure function
over `this.productionLines` and instance fields — the existing
`describe("_updateRates()", ...)` block in `tests/unit/models/factory.test.ts` (starting
at line 69) already tests it this way (direct construction, direct `factory._updateRates()`
calls, assertions on the resulting lookup/index state). No solver mocking, no timers, no
component rendering needed.
  - *Alternative considered*: reproduce the bug through a full `OptimizationSection`
    component render + reject-all button click (integration/E2E test). Rejected — the
    defect is entirely in `Factory._updateRates()`; a component-level test would exercise
    far more surface (React rendering, event handlers) than the invariant under test
    requires, and would be slower and more brittle. Per AGENTS.md's test-type guidance,
    model logic bugs get unit tests. The component path is simulated in the unit test by
    directly reassigning `factory.productionLines` to a filtered array (mirroring exactly
    what `rejectAllSuggestions` does) rather than going through the component.

**D3 — Test placement**: extend the existing `describe("_updateRates()", ...)` block in
`tests/unit/models/factory.test.ts` rather than create a new test file. This is coverage
of an existing, already-tested method gaining a missing case, not a new capability area.

## Risks / Trade-offs

- [Tests reassign `factory.productionLines` directly, bypassing `removeProductionLine`,
  which is unusual in this codebase's normal usage] → Intentional and necessary: this is
  the exact bypass path that produces the bug in production
  (`OptimizationSection.rejectAllSuggestions`). Each test that does this includes a
  comment noting it mirrors that real call site.
- [The fix only addresses `_updateRates()`; the redundant manual bookkeeping in
  `addProductionLine`/`removeProductionLine` remains a separate, undeduplicated write
  path that could in principle diverge from the derived rebuild in the future] →
  Accepted per proposal scope; tracked in
  `bugs/redundant_production_line_lookup_bookkeeping.md`, not blocking this fix.

## Migration Plan

No data migration — pure in-memory index fix, nothing persisted depends on the buggy
intermediate state. Rollback: revert the one-line change in `factory.tsx` and the test
additions in `factory.test.ts`.

## Open Questions

None — scope (minimal fix vs. also deduplicating manual bookkeeping) was resolved during
proposal drafting: minimal fix only, deduplication tracked as a separate follow-up.
