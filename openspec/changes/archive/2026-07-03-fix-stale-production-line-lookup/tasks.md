## 1. Test Stubs

- [x] 1.1 Write unit test stub in `tests/unit/models/factory.test.ts` (extend existing `describe("_updateRates()", ...)` block): R1.S1 — lookup drops entries for lines removed via direct array replacement.
- [x] 1.2 Write unit test stub: R1.S2 — re-adding a part after wholesale removal succeeds (`addProductionLine` guard no longer blocks it).
- [x] 1.3 Write unit test stub: R1.S3 — re-optimizing after reject-all creates a fresh production line present in `factory.productionLines` (not written onto an orphaned object).
- [x] 1.4 Write unit test stub: R1.S4 — lookup still reflects lines added/removed through the normal `addProductionLine`/`removeProductionLine` API (baseline: parts A, B present; remove A; add C; lookup has exactly B, C). Regression guard: this path already passes pre-fix, since `addProductionLine`/`removeProductionLine` maintain `_productionLineLookup` manually — it does not exercise the missing-clear defect.
- [x] 1.5 Write unit test stub: R1.S5 — partial removal (one of several lines removed via direct array replacement) leaves the remaining line's entry intact.
- [x] 1.6 Write unit test stub: R1.S6 — lookup is empty after all production lines are removed (`productionLines` reassigned to `[]`).
- [x] 1.7 Write unit test stub: R1.S7 — repeated `_updateRates()` calls with no changes are idempotent (same keys, same `ProductionLine` object references). Regression guard: this path already passes pre-fix (no removal happens between calls), it pins the no-op case rather than reproducing the bug.
- [x] 1.8 Run `npx vitest run tests/unit/models/factory.test.ts` and confirm stubs 1.1, 1.2, 1.3, 1.5, 1.6 fail (these exercise the missing-clear defect via direct array replacement). Stubs 1.4 and 1.7 are expected to already pass pre-fix — they pin existing-correct behavior, not reproduce the bug.

## 2. Core Fix

- [x] 2.1 In `app/models/factory.tsx`, add `this._productionLineLookup = {};` to the top of `_updateRates()` (factory.tsx:257-258), alongside the existing resets of `rateLookup`, `_assemblyLineLookup`, `_partsConsumed`, `_partsProduced`, `_mainOutputParts`.

## 3. Verification

- [x] 3.1 `npx vitest run tests/unit/models/factory.test.ts` passes (all 7 new scenarios plus existing cases).
- [x] 3.2 All unit/integration tests pass (`npm run test:run`).
- [x] 3.3 `npm run build` succeeds.
- [x] 3.4 Manually verify the fix against the recorded bug report: `bugs/cannot_optimize_after_reject.md` steps 1-5 no longer reproduce (optimize → reject all → optimize again produces suggestions).
