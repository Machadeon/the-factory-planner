## Pass 1 — 2026-07-03

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass
<!-- First pass of this phase: leave empty -->

### Findings

[1.8] — Overclaims for the full stub set. "Confirm the new stubs fail (proving they exercise the bug before the fix lands)" does not hold for all 7 stubs. R1.S4 (task 1.4) exercises only the normal `addProductionLine`/`removeProductionLine` API, which manually maintains `_productionLineLookup` independent of `_updateRates()`'s missing clear (factory.tsx:958, 972) — this scenario is stated in spec.md as "unchanged from existing behavior" and would already pass pre-fix. R1.S7 (task 1.7) calls `_updateRates()` twice with no changes to `productionLines` between calls — since nothing is removed, the unfixed loop just re-writes the same keys to the same objects and produces no stale entries, so it would also pass pre-fix. Only S1, S2, S3, S5, S6 (tasks 1.1, 1.2, 1.3, 1.5, 1.6) actually exercise the missing-clear defect via direct array replacement and would fail before the fix. Task 1.8 should scope its "confirm stubs fail" instruction to that subset, or note that S4/S7 are expected to pass both before and after (guarding against regression, not proving the bug).

[Scenario coverage] — Complete. R1.S1-S7 each map 1:1 to tasks 1.1-1.7, no gaps, no duplicates.

[Group ordering] — Correct. All test-stub tasks (Group 1) precede the fix (Group 2, task 2.1), which precedes verification (Group 3). Task 1.8 (run tests, confirm failure) correctly sits after stub authoring and before the fix, matching AGENTS.md's "run stubs first, confirm failure; then implement" gate.

[3.4] — Verified: `bugs/cannot_optimize_after_reject.md` exists and its 5 repro steps match task 3.4's description exactly.

[Verification group] — Adequate and correctly scoped: no E2E/lighthouse/browser tasks present, consistent with this change having no UI surface (confirmed in design-review.md Pass 1). 3.1-3.3 cover unit tests, full test suite, and build; 3.4 covers manual confirmation against the original bug report. Nothing silently missing — the absence of browser-based verification is appropriate here, not an oversight.

[Requirement coverage] — R1 fully covered: task 2.1 implements the fix (matches D1 exactly, same file/line/style as design.md), tasks 1.1-1.7 cover all spec scenarios, task 3.1 re-verifies post-fix.

## Pass 2 — 2026-07-03

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass

- [1.8] — Fixed. Now reads "confirm stubs 1.1, 1.2, 1.3, 1.5, 1.6 fail (these exercise the missing-clear defect via direct array replacement). Stubs 1.4 and 1.7 are expected to already pass pre-fix." Matches the Pass 1 analysis exactly — correct subset, correct reasoning stated inline.
- [1.4] — Fixed. Inline note added: "Regression guard: this path already passes pre-fix, since `addProductionLine`/`removeProductionLine` maintain `_productionLineLookup` manually — it does not exercise the missing-clear defect." Accurate.
- [1.7] — Fixed. Inline note added: "Regression guard: this path already passes pre-fix (no removal happens between calls), it pins the no-op case rather than reproducing the bug." Accurate.

### Findings

None. Remaining sections (scenario coverage, group ordering, 3.4 bug-report cross-check, verification group scoping, requirement coverage) unchanged from Pass 1 and still hold.
