# review — split-factory-god-class

## Pass 1 — 2026-07-06

**Source: Reviewer** (cold-read diff review, caveman-review format, full working tree vs HEAD)
**Status: APPROVED**

### Resolved from Previous Pass
(none — first pass)

### Findings

- app/models/solver/rate-solver.ts:43: ⚠ MED: maximize branch assigns `coefficients._obj = coefficients[partSlug]` directly — with multiple maximize targets a later target overwrites an earlier one, and a variable lacking the part key passes `!== 0` (undefined !== 0) and sets `_obj = undefined`. **Not fixed here, deliberately:** verbatim move of pre-existing `factory.ts` behavior; spec `rate-solver` R1.S6 pins the direct-assignment semantics and the change declares "no algorithm changes" as a non-goal. Filed as follow-up task "Fix multi-maximize objective overwrite in rate solver" (regression test first, spec amendment required).

No CRITICAL/HIGH findings. Import direction, update() counts, move fidelity, and test migration all verified clean by the reviewer.

### Deviations from plan (recorded per tasks 7.1 / 9.6)

- `factory.ts` is 500 lines, above the proposal's aspirational ≤400 target. Remaining surface is exactly what the specs assign to `Factory`: state + indexes, `_updateRates`, the two thin command wrappers, line/supplier mutators, the imperative rate engine (`setPartRate`/`autoSetPartRate`/`getPartDemand`/`_hasRecycledRubberPlasticLoop`), and index-coupled queries (`allOutputs`/`allInputs`/`getOutputInfo`/`recipeOutputs`/`allIntermediateParts`/`allParts`). No spec'd extraction was skipped.
- Lighthouse audit skipped: no UI layout/style change — the only visual surface touched is the solver-error Alert, whose wording is preserved by the view formatter (pinned by `tests/unit/lib/format-solver-error.test.ts` and the E2E `/No feasible/` assertion).
- Spec amendment during apply (recorded in spec-review Pass 3 and design D7): verification skips the `min` bound for supply-augmented parts (`_raw_` sibling), scenario R3.S4.
- Pre-existing failures not part of this change: `tests/integration/TextCalculatorField.test.tsx` tsc `variant` errors and `app/components/logistics/LogisticEdge.tsx` a11y lint error (follow-up chip filed).

### Gates

- `npm run test:run`: 54 files, 349 passed, 2 todo ✓
- `npm run test:e2e`: 93 passed, 1 skipped (pre-existing skip) ✓
- `npm run build`: clean ✓
- `npm run lint-fix`: clean except pre-existing LogisticEdge a11y error ✓
