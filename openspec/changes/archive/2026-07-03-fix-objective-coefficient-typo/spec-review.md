<!-- Append-only. Each review pass adds a new ## Pass N section. Never delete or edit previous passes. -->

## Pass 1 — 2026-07-03

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass
(first pass: leave empty)

### Findings

[R1.S1] — WHEN clause says the shape is "as returned by `Factory.createBaseModel`," but proposal.md:L5 states `createBaseModel` guarantees this exact shape (a variable with two truthy `_raw_X` keys) cannot occur today; scenario premise contradicts the proposal's own investigation.
[R1.S1] — Proposal.md:L12 says the test "constructs the scenario directly against the loop's logic" (not via `createBaseModel`/`autoCalculateRates()` end-to-end); spec's WHEN clause implies the opposite construction mechanism. Spec and proposal disagree on how the test reaches this state.
[R1] — Requirement doesn't cite or constrain the fix location (`factory.tsx:1247-1248`); proposal.md:L11,13 scopes this to a one-line key-name fix with explicit "no extraction into new files" exclusion. A spec-literal implementation (e.g. extracting the objective-building loop into a helper) would satisfy R1 while exceeding proposal scope.
[R1] — "raw-resource-linked coefficient" is undefined in the spec; meaning (the `_raw_<resource>` key format, sourced from `defaultResourceLimits` iteration) only exists in the proposal's code citation, not in the spec itself.
[R1] — "across the raw-resource iteration" presumes an outer loop over resources that the spec never establishes or describes.
[R1.S1] — "not `Y` (the last-processed value) or `X` (the first-processed value)" doesn't specify iteration order over the two raw-resource keys, leaving ambiguous whether order is deterministic or the test must be order-independent.
[R1] — No scenario for 3+ raw-resource-linked keys on one variable (does accumulation generalize beyond pairwise sum?).
[R1] — No scenario for a zero-valued raw-resource coefficient mixed with a non-zero one; "truthy" filter is only implied via scenario wording, never asserted as a skip-if-falsy rule.
[R1] — No scenario for negative coefficient values summing to zero or negative, which would change solver behavior.
[R1.S2] — "Single raw-resource variable is unaffected" covers one key; no scenario asserts the zero-key baseline (`_obj` stays unset/undefined when no raw-resource key is truthy).
[R1] — No regression scenario confirming the `maximizeOutput` (max-target) branch is unaffected by this fix, despite R1 explicitly scoping to the no-maximizeOutput path.

## Pass 2 — 2026-07-03

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass

- [R1.S1] WHEN-clause/createBaseModel contradiction — resolved. New note under R1.S1 explicitly states today's real data can't produce the shape and defers construction mechanism to design.md, matching proposal.md:L12.
- [R1.S1] Spec/proposal disagreement on test construction — resolved. Same note aligns wording with the proposal instead of implying an end-to-end `createBaseModel` path.
- [R1] Fix-location/scope overreach (extraction not barred) — resolved. New paragraph (L6) explicitly locks the fix to the inline `coefficients.obj`/`_obj` correction and states extraction "is out of scope."
- [R1] "raw-resource-linked coefficient" undefined — resolved. Requirement body now spells out `defaultResourceLimits` keys and the `_raw_<resource>` key format inline.
- [R1] "raw-resource iteration" unexplained — resolved. Requirement body now states "it iterates the configured raw resources."
- [R1.S1] Iteration-order ambiguity — resolved. Requirement body and R1.S1's THEN clause both state the sum is independent of processing order.
- [R1] No 3+-key scenario — resolved. R1.S2 added.
- [R1] No zero-valued-coefficient scenario — resolved. R1.S3 added.
- [R1.S2] No zero-key baseline scenario — resolved. R1.S5 added.
- [R1] No maximizeOutput regression scenario — resolved. R1.S6 added.

### Findings

[R1] — Requirement body claims summation is "independent of... the sign of individual contributions," but no scenario (S1-S6) exercises a negative value or a positive/negative combination; every scenario's X/Y/Z is implicitly positive, so the sign-independence claim is asserted but untested by the scenario set.
[R1.S1] — Deferring "the exact construction mechanism" to design.md (per the note under S1) leaves this scenario unfalsifiable as written until design.md exists; acceptable per proposal.md:L12 but worth flagging as an open dependency, not a closed scenario.

## Pass 3 — 2026-07-03

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass

- [R1] Sign-independence claim untested — resolved. New Scenario R1.S2a exercises mixed-sign coefficients (`X` positive, `-Y` negative), asserting `_obj = X + (-Y)` and explicitly ruling out single-value and absolute-sum outcomes.
- [R1.S1] "Unfalsifiable until design.md exists" hedge — resolved. The note under R1.S1 no longer forward-references design.md; it now states the scenario is validated by supplying a model in this shape directly to `autoCalculateRates()`, a concrete, self-contained validation method stated within the spec itself.

### Findings

None.
