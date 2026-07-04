## Pass 1 — 2026-07-03

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass
<!-- First pass of this phase: leave empty -->

### Findings

modern-web-guidance — N/A. Confirmed via skill: this change has zero UI/DOM surface (pure model-layer fix in `app/models/factory.tsx` plus unit tests in `tests/unit/models/factory.test.ts`); no client-side rendering, styling, or browser API surface to check against.

frontend-design — N/A. Confirmed via skill: no visual/UI artifact is produced or touched by this change; nothing to critique for palette, typography, layout, or copy.

[Context] — Verified against factory.tsx: `overwrite` branch (614-617) does already clear `_productionLineLookup` explicitly, and `_updateRates()` (257-265) is confirmed as the only place with the missing reset. Design's factual claims check out.

[D2] — Verified against tests/unit/models/factory.test.ts:39-45 (`makeFactory()` rewires `f.update = () => { f._updateRates(); }`): the claim that "the existing `describe(\"_updateRates()\", ...)` block already tests it this way" is accurate — this is the established idiom, not a new pattern introduced by this design.

[D2, Non-Goals] — Verified against app/components/OptimizationSection.tsx:64-85 (`rejectAllSuggestions`): confirmed it reassigns `factory.productionLines` via `.filter()` without calling `removeProductionLine`, matching the design's description of the real bypass call site the tests are asked to mirror.

[Risks/Trade-offs] — The second risk (redundant manual bookkeeping in `addProductionLine`/`removeProductionLine` could diverge from the derived rebuild) is accepted and deferred, consistent with spec.md's explicit scope note and the proposal. No gap.

[Migration Plan] — Adequate for the change's size (no persisted state affected); rollback description (revert one line + test additions) is accurate given D1/D3.

[Open Questions] — None left, consistent with a change this narrowly scoped; no hidden unresolved decision found by re-reading proposal.md/spec.md alongside this doc.

No genuine gaps found: D1 is the correct minimal fix (matches the reset pattern already used for the other four containers in the same method, same style, same location), D2's rejection of a component/E2E-level test is well-reasoned for a pure-function defect, D3's placement avoids an unnecessary new test file. No architecture conflicts, no anti-patterns, no missing edge case that isn't already deferred to a tracked follow-up bug.
