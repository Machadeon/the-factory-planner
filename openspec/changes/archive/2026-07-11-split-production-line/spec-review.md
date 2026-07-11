## Pass 1 — 2026-07-10

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass
(empty — first pass)

### Findings

Ambiguity:
- [R1.S1] — "no single production-line component file exceeds ~250 lines": the `~` makes the threshold non-deterministic and untestable; pick a hard number or drop the size assertion from the SHALL/THEN.
- [R3] — reset trigger is ambiguous: R3 states "Adding an assembly line SHALL reset the intent" (reset on the add action) but R3.S2 asserts the picker hides "once the added line satisfies production" (reset on satisfaction). These are two different mechanisms; specify which fires.
- [R4] — spec does not state whether `mode` is required or optional (proposal §33 itself hedges "required/optional"); undefined behavior when `mode` is omitted. State the prop's requiredness and the fallback title if optional.
- [optimizer R3/R3.S1] — `lineRecipeSlugs` returns slugs "in order" but "order" is never anchored; state it is `assemblyLines` array order.

Missing edge-case scenarios:
- [R2/R2.S1] — `recipeInstanceRate` divides by `recipe.productLookup[part.slug]`; no scenario/guard for a zero or missing divisor (part not produced by recipe). Add a scenario or state the precondition.
- [R3/R3.S2] — no scenario for manual-open where the added recipe does NOT satisfy production (partial add): does the picker stay open? Current scenarios only cover the satisfying case.
- [optimizer R3] — no scenario for a kept (non-`autoCreated`) line with zero `autoCreated` assembly lines (the no-op branch) — assert nothing is removed and no slug collected.
- [optimizer R3] — no boundary scenario for an empty factory (zero production lines) calling `acceptAllSuggestions` / `rejectAllSuggestions`; assert no throw and empty-slug `applyRejectSilent`.

Scope:
- [optimizer R3] — requirement is labeled "R3" but proposal (Modified Capabilities) says "R1 already homes the reject policy there"; the requirement-id mismatch across artifacts is a traceability ambiguity — reconcile the numbering.

## Pass 2 — 2026-07-10

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass
- [R1.S1] — RESOLVED: `~250` replaced with hard cap "no single production-line component file exceeds 300 lines" (line 16); now deterministic/testable.
- [R3] — RESOLVED: reset trigger disambiguated to the add-assembly-line action — "`addAssemblyLine` SHALL set `pickerManuallyOpened` to `false`" (line 39); R3.S2/S3 consistent with add-action reset.
- [R4] — RESOLVED: `mode` now stated **required**, "no default... omitting it is a compile-time type error" (line 59).
- [optimizer R3/R3.S1] — RESOLVED: order anchored to "`productionLine.assemblyLines` array order" (line 7).
- [R2/R2.S1] — RESOLVED: precondition added (line 26) — callers pass a recipe from `recipeLookup[part.slug]`, divisor defined and non-zero, no new guard added (behavior preserved verbatim).
- [R3/R3.S2] — RESOLVED: new R3.S3 "Partial add keeps the picker open" scenario added (lines 49–51) covering the add-that-does-not-satisfy case.
- [optimizer R3 no-op branch] — RESOLVED: new R3.S5 covers a kept non-`autoCreated` line with zero `autoCreated` assembly lines (nothing removed, empty slug list).
- [optimizer R3 empty factory] — RESOLVED: new R3.S6 covers empty-factory accept/reject (no throw, `applyRejectSilent` with empty slug list).
- [optimizer R3 numbering] — RESOLVED: proposal reconciled to R3; spec and proposal now agree on the requirement id.

### Findings
(none — all Pass 1 findings resolved; no new ambiguity, missing edge case, or scope-excess issues found on cold re-read)
