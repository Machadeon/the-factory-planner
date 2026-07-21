## Pass 1 — 2026-07-20

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass
(none — first tasks pass)

### Findings
- [factory-session R5.S1 — successful load] — No Group 1 test task and no implementation task. tasks.md only implements the alert→toast swap (4.2), not the `loadSerialized` consolidation the requirement mandates; the "store holds deserialized factory, identity fields match, dirty false, current id persisted" scenario is untested and unbuilt.
- [factory-session R5.S2 — slug backfill] — No test task and no impl task. Slug-backfill-on-restore behavior is unverified.
- [factory-session R5.S3 — autosave-restore options] — No test task and no impl task. The `{markDirty,backfillSlug,persistCurrentId}` opts contract has no coverage or implementation.
- [factory-session R5.S5 — no duplicated restore blocks] — No test task and no impl task. The "exactly one code path sets identity fields" collapse is neither asserted nor performed (4.2 edits the existing alert line in place, leaving the four duplicated blocks intact).
- [library-ops R5.S1 — single-factory import without consent] — No test task and no impl task; the load-without-save behavior is uncovered.
- [library-ops R5.S2 — bundle import loads root] — No test task and no impl task.
- [library-ops R5.S3 — library import without consent] — No test task and no impl task; the `requireConsent("openLibrary")` path is uncovered.
- [Scope mismatch — resolve before proceeding] — Root cause of the seven gaps above: the factory-session/library-ops MODIFIED requirement bodies mandate a full restore-consolidation + import-wiring refactor (scenarios S1/S2/S3/S5), but tasks.md scopes to only the alert→toast swap (tasks 4.1/4.2) and only tests the S4 toast scenarios. Either (a) descope those requirement bodies/scenarios to the toast clause so no orphan scenarios remain, or (b) add Group 1 test tasks and Section-2+ impl tasks for every S1/S2/S3/S5 scenario. As written, spec scenarios exist with no covering test and no implementation task.
- [1.16 vs 1.7/1.8 ordering] — Non-blocking: 1.16 (E2E) and 1.14/1.15 (integration regressions) sit in Group 1 before impl, which is correct; no dependency-order defect found among the toast-notifications tasks (2.x → 3.x mount → 4.x swap is sound).

Note: all 15 toast-notifications scenarios (R1–R5) ARE covered by Group 1 tasks 1.1–1.13 and precede implementation; that portion is clean. The concerns are confined to the factory-session/library-ops delta scenarios.

## Pass 2 — 2026-07-20

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass
- [factory-session R5.S1/S2/S3 — successful load / slug backfill / autosave opts] — Resolved. These describe behavior already shipped on `main` with existing tests in `useFactorySession.test.ts`; delta-format inherits them verbatim into the MODIFIED body. Now mapped to preservation task 1.16 (confirm green after harness wrap). No new impl needed, correctly noted in the Section 4 scope note.
- [factory-session R5.S5 — no duplicated restore blocks] — Resolved. Already shipped; existing assertion guarded by preservation task 1.17.
- [factory-session R5.S4 — failed deserialization toast] — Resolved. Task 1.15 MODIFIES the existing `window.alert`-spy test to assert the error toast + no alert + state unchanged. The one genuinely-changed session scenario.
- [library-ops R5.S1/S2/S3 — import-wiring variants] — Resolved. Already shipped in `FactoryPage.test.tsx`; mapped to preservation task 1.18 (confirm green after harness wrap).
- [library-ops R5.S4 — unrecognized/parse → toast] — Resolved. New stub 1.14, the only new library-ops behavior.
- [Scope mismatch] — Resolved. Root cause was that S1/S2/S3/S5 are pre-shipped inherited scenarios, not new work. tasks.md now distinguishes NEW (1.14 stub, 1.15 modify), PRESERVED (1.16–1.18), and captures the real cross-cutting impact — the new `useToast()` call throwing R1.S2 in every existing harness — as impl task 2.5 (ToastProvider harness wrap). Section 4 scope note makes the no-new-impl-for-S1/S2/S3/S5 boundary explicit.

### Findings
None. Every spec scenario across all three delta specs now maps to a Group 1 task (new stub, modified test, or preservation-confirm); the only new behavior (S4 swaps) has both test and impl tasks; dependency order is sound and the cross-cutting harness dependency (2.5) is captured.

Non-blocking observations (not gates):
- 1.16/1.18 are "confirm green AFTER harness wrap (2.5)", so these preservation checks depend on an impl-section task rather than preceding all implementation. This inverts the usual Group-1-before-impl rule, but is correct here: they are pre-existing passing tests being guarded, not new stubs to drive TDD. 5.2 re-runs the full suite as the backstop.
- 1.20 guard offers "source-scan OR covered by 1.14/1.15 spies" — recommend the source-scan form so a future re-introduced `alert(` in a path not exercised by 1.14/1.15 is still caught. Author's discretion.
