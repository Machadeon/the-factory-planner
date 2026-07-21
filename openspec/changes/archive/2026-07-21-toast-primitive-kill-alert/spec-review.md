## Pass 1 — 2026-07-20

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass
(none — first pass)

### Findings
- [R2] — "4–5 seconds" is a range, not a fixed value; requirement says "fixed timeout" but gives a span, making R2.S2 untestable against an exact bound. Pin one value (or expose a constant to assert against).
- [R2.S1] — "auto-dismiss timeout elapses" for an error is ambiguous: errors have no timeout, so the scenario references a duration that does not exist. Reword to "after the info/success auto-dismiss duration would elapse".
- [R2/R3 interaction] — Error toasts are sticky and the visible cap is 3; three unclosed errors permanently starve the queue so no info/success ever surfaces. No requirement or scenario addresses this stuck-queue edge case.
- [R3.S2] — Does not specify WHICH of the three visible toasts is dismissed, nor the surfacing order when multiple are queued; "oldest-first (FIFO)" is stated in R3 but the scenario only exercises one queued item, leaving multi-item FIFO order unverified.
- [R3] — "New toasts SHALL NOT replace or clobber existing unread toasts" uses "unread", an untestable state (no read-tracking defined anywhere). Drop "unread" or define it.
- [R4.S1] — "assertive live region (or carries role=alert)" leaves the implementation choice open; acceptable, but no scenario asserts info/success use `aria-live="polite"`, so R4's polite-announcement clause is untested.
- [R4] — "satisfying the active a11y rules" is a vague acceptance criterion; not directly testable as written.
- [factory-session R5] — The four-block restore consolidation into `loadSerialized` (markDirty/backfillSlug/persistCurrentId options, slug backfill, id persistence) far exceeds the proposal's scope, which is limited to swapping three `alert()` calls for toasts. Scenarios R5.S1/S2/S3/S5 test refactor behavior unrelated to the toast change.
- [library-ops R5.S1] — Pulls in loadSerialized consent/persist/slug-backfill behavior ("current-id persist, slug backfill still occur per factory-session R5") beyond the alert→toast swap that this proposal scopes; scope creep from the referenced refactor.
- [library-ops R5] — Scenario numbering is out of order (S1, S3, S2, S4), which suggests a scenario was inserted/removed; verify no scenario (e.g. an original S2 behavior) was dropped.
- [factory-session R5.S4 vs library-ops R5.S4] — Both reproduce literal message strings inline; nothing pins these to a single source of truth, so the "same message text" guarantee across specs is untested and can drift.

## Pass 2 — 2026-07-20

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass
- [R2] — Resolved. Timeout pinned to constant `TOAST_AUTO_DISMISS_MS` (5000 ms) in R2; R2.S2 now asserts against that constant. Testable.
- [R2.S1] — Resolved. Reworded to "a span exceeding `TOAST_AUTO_DISMISS_MS` passes with no user action"; no longer implies errors have a timeout.
- [R2/R3 interaction] — Resolved. R3 now documents sticky-error slot occupation as intended, resolved by manual close; new R3.S3 exercises three errors blocking an info until one is closed.
- [R3.S2] — Resolved. Strengthened to two queued items (fourth, fifth) proving surfacing order: fourth appears before fifth. FIFO now verified.
- [R3 "unread"] — Resolved. "unread" dropped; reworded to "SHALL NOT remove or replace any currently visible toast" and R3.S1 asserts none of the first three was removed by a later one.
- [R4.S1 polite clause] — Resolved. New R4.S3 asserts info/success render in a polite live region, not assertive.
- [R4 vague "active a11y rules"] — Resolved. Clause removed; R4 now states concrete assertive/polite/icon/named-close requirements. New R4.S4 asserts close control has an accessible name.

### Disputed Findings — Reviewer Concurs
- [factory-session R5 / library-ops R5 "scope creep", R5.S1/S2/S3/S5] — Withdrawn. Coordinator is correct: OpenSpec MODIFIED delta semantics require the entire existing requirement block copied verbatim, changing only the alert→toast clause. The surrounding scenarios are format-mandated, not scope introduced by this change.
- [library-ops R5 numbering S1,S3,S2] — Withdrawn. Ordering is inherited verbatim from the base `library-ops/spec.md`; S4 is the new toast scenario; no original scenario dropped. Confirmed against the delta.
- [message-text drift] — Deferred, agreed. Literals are inherited from pre-existing specs; centralizing into shared constants is a design.md concern, appropriately out of scope for a spec pass.

### Findings
None. Specs are unambiguous, testable, and within proposal scope (delta format accounted for).
