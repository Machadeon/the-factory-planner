## Pass 1 — 2026-07-08

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass
(empty — first pass)

### Findings

Coverage map (scenario → Group 1 stub): R1.S1/S2 → 1.2; R1.S3 → 1.1; R2.S1/S2 → 1.3; R3.S1/S2/S3 → 1.4; R4.S1 → 1.9; R5.S1/S2 → 1.6; R6.S1 → 1.5; R6.S3 → 1.7; R7.S2 → 1.8; R8.S2 → 1.9; factory-page R7.S2 → 1.10; factory-page R7.S3 → 1.9. These are covered.

Gaps:
- R6.S2 — 1.9 covers only the negative half ("FactoryPage contains no `rateLookup` trigger", source-scan). The positive half — "it still re-renders when `productionLines.length`, `solverError`, or `icon` change" — has no Group 1 stub. Add an integration assertion that mutating each of those three fields re-renders FactoryPage.
- R7.S1 — behavioral assertion ("no descendant reads the parent factory via `useFactory()` for that foreign data" for `NestedFactoryRow` / `PartRateSummary`) is mapped only to 1.9's structural prop-scan. 1.8 covers `FactoryPickerDialog` (R7.S2) but the general foreign-data-not-inherited case for the other two components has no dedicated stub. Add a stub asserting a nested/other-library factory renders from an explicit prop, not from `useFactory()`.
- R8.S1 / factory-page R7.S1 ("suites green, no selector change") — present only in verification tasks 6.2/6.3, not as a Group 1 stub. Acceptable as a meta-suite assertion (not a discrete testable behavior, cannot be a stub), but note: no Group 1 task pins "zero e2e selector edits"; it is enforced only at 6.3. Non-blocking.

Ordering / structure:
- Group 1 (1.1–1.10) precedes all implementation (Groups 2–5). Correct.
- 1.5–1.7 are stubs in Group 1; their real assertions land at 5.1 (same commit as the 5.2 root-trigger drop). This matches the design's tripwire ordering and is intentional, not a stub-after-impl violation. Correct.
- 4.2 (Batch B) lists `LogisticsSection` reading contexts and 4.3 (Batch C) again handles `LogisticsSection` → nodes. `LogisticsSection` appears in two batches with no split-of-responsibility stated; clarify which drilled props each batch removes to avoid a half-migrated interface between commits. Minor.

Implementation coverage (every requirement has an impl task): R1 → 2.1; R2 → 2.2; R3 → 2.3 + 4.3; R4 → 3.1 + 4.1–4.5; R5 → 3.1 + 3.2; R6 → 5.2; R7 → 4.4; R8 dead-props → 4.5. No requirement lacks an implementation task.

Blocking rationale: the two coverage gaps (R6.S2 positive re-render half, R7.S1 behavioral foreign-data assertion) are missing Group 1 stubs for real spec scenarios. Add those two stubs and clarify the LogisticsSection batch split; then APPROVED.

## Pass 2 — 2026-07-08

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass

- R6.S2 positive half (Pass 1 gap 1) — RESOLVED. Stub 1.11 added: FactoryPage STILL re-renders when `productionLines.length`/`solverError`/`icon` change after the root trigger is removed. Both halves of R6.S2 now covered (1.9 negative source-scan + 1.11 positive re-render).
- R7.S1 behavioral half (Pass 1 gap 2) — RESOLVED. Stub 1.12 added: `NestedFactoryRow`/`PartRateSummary` show foreign data from an explicit prop/local with no descendant `useFactory()` inherit. Complements 1.9 (prop-scan) and 1.8 (FactoryPickerDialog).
- LogisticsSection batch split (Pass 1 minor) — RESOLVED. 4.2 now performs LogisticsSection's full prop removal in one commit ("does not span batches"); 4.3 is "logistics internals only (no LogisticsSection interface change)." No half-migrated interface across commits.
- R8.S1 / factory-page R7.S1 selector-edit pin (Pass 1 non-blocking note) — RESOLVED. 6.3 now asserts `git diff --stat` shows zero modified files under `tests/e2e/`.

### Findings

Minor (clerical, non-blocking — do not gate advancement):
- 6.1 — verification range still reads "stubs (1.1–1.10)"; the stub set is now 1.1–1.12. Update the range so the two newly-added stubs are captured by the "all stubs implemented and passing" gate.
- 5.1 — "Add the render-count integration test (stubs 1.5–1.7) as real assertions" omits 1.11. Since 1.11 asserts post-trigger-removal behavior, its real assertion must land in this same-commit step (with 5.2), not earlier — include 1.11 in 5.1's list. (1.12 is not trigger-dependent and can land with Batch D 4.4; it just also needs inclusion in 6.1's range.)

Coverage: every spec scenario now maps to a Group 1 stub — R1.S1/S2→1.2, R1.S3→1.1, R2.S1/S2→1.3, R3.S1/S2/S3→1.4, R4.S1→1.9, R5.S1/S2→1.6, R6.S1→1.5, R6.S2→1.9+1.11, R6.S3→1.7, R7.S1→1.9+1.12, R7.S2→1.8, R8.S1→6.3, R8.S2→1.9, factory-page R7.S1→6.3, R7.S2→1.10, R7.S3→1.9. No scenario unmapped. Group 1 precedes all implementation; every requirement retains an implementation task (unchanged from Pass 1). Ordering correct.

No blocking findings. Both Pass 1 gaps closed; the two remaining items are stale stub-range references in gate tasks, clerical only.
