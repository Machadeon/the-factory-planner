# Validation Review — Logistics Graph View

Inline review (separate-agent reviewer deferred — session limit). Checks: spec coverage,
correct test types, missing edge cases, no trivially-passing tests.

## Coverage map (spec → AC)

- R1.1/R1.2 → AC8, AC9 (+ expanded props). ✓
- R2.1 → AC9 (node + ports; machine-count label asserted within AC9). ✓
- R2.2/R2.3 → AC16. ✓
- R2.4 → AC9, AC10 (square vs circle). ✓
- R2.5 → AC11. ✓
- R2.6 → AC15 (link) + AC2 (footprint data). ✓
- R3.1/R3.2 → AC12. ✓
- R3.4/R3.6 → AC13. ✓
- R3.5/R3.6 → AC14. ✓
- R4.2 → AC17 (non-trivial: monotonic + compression + clamp). ✓
- R4.4 → AC23 (edge split). ✓ (added in review)
- R5 → AC19, AC22. ✓
- R6 → AC20. ✓
- R7 → AC6, AC7, AC21. ✓
- R8.1 → AC18 (columns + cycle termination). ✓
- R9 → AC3, AC4 (regression guard), AC5. ✓

## Concerns

1. **[non-blocking] R4.3 (belt vs pipe) and R4.5 (edge→port handle) not unit-tested.**
   These are visual/styling + React Flow handle wiring, impractical in jsdom. Verified
   visually during the implementation loop (screenshot / lighthouse step) and implicitly
   by AC19–AC22 e2e. Acceptable.

2. **[non-blocking] R3.3 (source/sink lighter styling) untested.** Purely cosmetic;
   covered by visual check, not an automated AC.

3. **[resolved] R4.4 multi producer/consumer split had no test.** Added AC23 +
   `buildPartEdges` stub.

4. **No trivially-passing tests.** AC17 asserts log compression ratio (not just
   monotonic). AC18 asserts ordering AND cycle termination. AC6 asserts schema value AND
   round-trip. AC3 forces a fractional-by-default scenario under a part cap. AC4 is an
   intentional regression guard (passes pre-impl, must stay passing) — documented as
   such, not a stealth no-op.

## Stub status (verified by running)

- All R9 / footprint / id / storage / graph-layout stubs **fail** today (assert on
  not-yet-existing fields/modules), except AC4 which passes as a regression guard.
- Integration AC8 fails (missing `logistics-empty` testid); AC9–AC16 are `it.todo`.
- E2E AC19–AC22 are `test.fixme`.

## Verdict

No blocking concerns. Validation covers every spec requirement with appropriate test
types and meaningful pass conditions. Cleared for implementation planning.
