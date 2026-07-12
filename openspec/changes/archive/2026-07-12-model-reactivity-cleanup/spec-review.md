## Pass 1 — 2026-07-12

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass

### Findings

[R2] — "rate-affecting state" undefined; no enumeration/discriminator given, so "every rate-affecting mutator" is untestable — a reviewer can't tell which mutators are in-scope vs. presentation-only (R3 uses undefined complement "presentation state").
[R2] — "imperative propagation (`autoSetPartRate`)" listed as one of four recompute kinds but never scenario'd for the leaves-consistent guarantee; R2.S1 says "any" mutator yet no scenario exercises the autoSetPartRate path's consistency.
[R2.S2] — "solver returns infeasible" — no scenario for the opposite boundary: solver throws/errors vs. returns infeasible, and no scenario asserts `solverError` is CLEARED on a subsequent feasible re-solve.
[R5] — bullet list is the requirement body but several bullets have no scenario: maximize-output toggle, add/remove supplier, add/remove assembly line, disabling auto-calculate-rate, production-target optimization (`optimizeRecipes`) — each is a distinct recompute choice with no test.
[R5] — "even when a production line has a positive `outputRate`" for clock/remainder/machine-count: only clock-speed has a scenario (R5.S1); remainder toggle and machine-count edits with outputRate>0 have no scenario despite being called out as surprising.
[R5.S2] — sloop branch scenario covers outputRate>0 → re-solve and none → recompute, but "any production line" (multi-line, mixed) boundary untested.
[R5] — "Enabling a line's auto-calculate-rate SHALL run imperative propagation; disabling it SHALL recompute only" — no scenario; disabling path has no test at all.
[R6] — "All derived lookup tables SHALL remain tracked ... No lookup table SHALL be `ref()`-exempt" reads as scope expansion: asserting tracking behavior for six named lookups (incl. model-internal `_productionLineLookup`/`_partsConsumed`/`_partsProduced`) exceeds "ref()-exempt scratch" — scratch exemption is the stated scope, not a whitelist audit of every other table.
[R6.S1] — asserts mutating scratch "does not publish a notification" but no scenario proves the scratch value is still functionally readable/writable after `ref()` wrapping (ref only strips tracking; correctness of solver reads through it untested).
[R7] — "exactly one valtio `subscribe` notification batch" is a valtio-implementation claim; for multi-write mutators (add/remove supplier, autoSetPartRate propagation loop) "exactly one batch" depends on synchronous execution — no scenario covers a mutator that awaits/defers, and the async boundary is undefined.
[R7] — "resulting derived state SHALL match the pre-change behavior" is untestable as written: no baseline artifact/fixture is referenced to compare against; "pre-change behavior" is a moving target with no captured oracle.
[R1.S2 / R4.S2] — scenarios assert absence via source-text search ("no `new Factory(<arg>)` call site", "no `.update()` occurrences"); text-grep scenarios yield false positives (comments, strings, unrelated `.update()` on non-factory objects) — acceptance criteria are lexical not semantic.
[R3] — "graph node layout, factory icon" is a closed enumeration of presentation mutators; if any other presentation-only field exists (or is added) it's unspecified whether it must skip recompute — R3 asserts a complete taxonomy without saying it's exhaustive.
[factory-session R2] — duplicates factory-mutation-methods R4 near-verbatim ("mutations only through model methods", same grep scenario); overlapping requirements across two specs risk divergence and it's ambiguous which is authoritative.
[factory-session R3-REMOVED] — Migration note asserts new behavior "eliminating the reference-aliasing hazard" — a correctness claim (no aliasing) with no scenario proving the hazard is gone; either scope creep beyond "delete copy-ctor" or an untested guarantee.

## Pass 2 — 2026-07-12

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass

[R2 "rate-affecting state" undefined] — RESOLVED. New "Definitions" block defines rate-affecting mutator as the closed R5 list and presentation mutator as the R3 set; complement is now closed and testable.
[R2 autoSetPartRate not scenario'd] — RESOLVED. New R2.S2 exercises the propagation mutator's leaves-consistent guarantee.
[R2.S2 solver error boundary/clear] — RESOLVED. R2.S3 covers infeasible→error-set; R2.S4 asserts `solverError` clears on a later feasible solve.
[R5 unscenario'd bullets] — RESOLVED. R5.S3 (output-rate/maximize/constraint), R5.S5 (enable/disable auto-calc), R5.S6 (optimization + supplier/line structural) now cover the previously untested choices.
[R5 remainder/machine-count with outputRate>0] — RESOLVED. R5.S1 now names clock speed, remainder toggle, and machine count together under outputRate>0.
[R5.S2 "any production line" boundary] — RESOLVED. R5 now defines "any production line has outputRate>0" as evaluated across all lines (single line suffices); S2 keeps both branches.
[R5 disable auto-calc path] — RESOLVED. R5.S5 AND-WHEN branch tests disable → indexes only.
[R6 lookup-tracking scope expansion] — RESOLVED. R6 reworded to "only solver scratch is ref()-exempt / no other field exempt"; the six-lookup whitelist audit is gone, replaced by R6.S3 grep asserting the sole ref() target. Stays within stated scope.
[R6.S1 scratch still functional] — RESOLVED. R6.S1 now asserts the cycle guard behaves correctly (readable/writable) in addition to no-notification; text of R6 states ref() strips tracking only.
[R7 async batch boundary] — RESOLVED. Definitions block declares all M4 mutators synchronous (no setTimeout/microtask/await); R7 conditions "one batch" on that synchrony.
[R7 no oracle for "pre-change behavior"] — RESOLVED. R7.S1 now asserts rateLookup against concrete numeric fixture values, explicitly "not against a captured pre-change snapshot."
[R1.S2/R4.S2 lexical grep false positives] — RESOLVED. R1.S2 checks constructor signature + call-site arg count (semantic, not string match); R4.S1/S2 scope searches to "executable statements ... excluding comments and strings."
[R3 non-exhaustive taxonomy] — RESOLVED. R3 now applies "to every presentation-only mutator, whether or not it is in the current set," making the rule open-ended rather than a closed list.
[factory-session R2 duplication/authority] — RESOLVED. factory-session R2 now explicitly defers enforceable mutation contract to factory-mutation-methods R4; R4 declares itself "sole authority." Single source of truth established.
[factory-session R3-REMOVED aliasing claim] — RESOLVED. Migration now grounds no-aliasing in R1.S2's construction-time verification ("by construction") rather than asserting an untested runtime guarantee.

### Findings

None.
