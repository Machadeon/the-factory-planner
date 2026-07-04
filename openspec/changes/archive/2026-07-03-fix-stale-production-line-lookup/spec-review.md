## Pass 1 — 2026-07-03

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass
<!-- First pass: leave empty -->

### Findings

[R1.S1] — "and `factory.update()` subsequently runs" is factually wrong as the trigger. `factory.update` (factory.tsx:204,228) is an externally-injected React re-render callback, defaulting to a no-op; it never calls `_updateRates()`. `_updateRates()` is only invoked from the constructor (factory.tsx:246), `factory-storage.ts:284`, `factory-storage.ts:470`, and `FactoryComponent.tsx:171` — not from `update()`. As written this scenario cannot pass in a unit test that calls `factory.update()` expecting a rebuild.

[R1.S2] — Same defect: "`factory.update()` runs" between removal and `addProductionLine(P)` does not trigger `_updateRates()`. The scenario needs `factory._updateRates()` (or a method that calls it) as the actual trigger, not `update()`.

[R1.S3] — Same defect: "`factory.update()` runs" before the second `optimizeRecipes()` call does not rebuild `_productionLineLookup`. Fix trigger reference or the scenario is untestable as stated.

[R1.S4] — Untestable as written: "matches `factory.productionLines` exactly, unchanged from existing behavior" gives no concrete before/after lookup state or assertion to check against — no baseline is defined in-spec.

[R1] — Missing edge case: no scenario for partial removal (one of several production lines removed via direct array replacement, others retained) — only wholesale/full replacement is covered by S1–S3.

[R1] — Missing edge case: no scenario for `productionLines` becoming empty (`[]`) after removal — zero-entry lookup state after clear is untested.

[R1] — Missing edge case: no scenario asserting idempotency of repeated `_updateRates()` calls with no intervening changes to `productionLines` (verifying the clear-then-repopulate doesn't drop/duplicate entries when nothing changed).

[R1.S2, R1.S3] — Not scope creep: both scenarios assert only the *observable effect* of the `_updateRates()` fix as seen through `addProductionLine`'s guard and `optimizeRecipes`'s `ensureLine()`, and the requirement text explicitly disclaims changing those functions. Consistent with proposal's stated regression-test plan (Impact section). No action needed, noted for completeness.

## Pass 2 — 2026-07-03

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass

- [R1.S1, R1.S2, R1.S3] — Fixed. All three scenarios now name `factory._updateRates()` as the trigger, not `factory.update()`. Verified against factory.tsx:257-265: `_updateRates()` clears then repopulates `_productionLineLookup` from `this.productionLines` directly, so calling it explicitly in a unit test is a valid, testable trigger. Added trigger-note (spec.md:14-19) correctly explains `update`'s no-op default and cites the existing test suite's idiom of calling `_updateRates()` directly — accurate and sufficient.
- [R1.S4] — Fixed. Concrete baseline given (factory with lines for A and B; `removeProductionLine(A)` then `addProductionLine(C)`; assert lookup contains exactly B and C). Testable as stated, uses only the normal API (in scope).
- [R1] (partial removal) — Fixed by new R1.S5. Correct and testable; asserts B's key stays present and A's is gone after a direct array replacement dropping only A.
- [R1] (empty productionLines) — Fixed by new R1.S6. Correct; asserts zero entries after reassigning to `[]` and calling `_updateRates()`.
- [R1] (idempotency) — Fixed by new R1.S7. Verified against factory.tsx:257-265: since the loop repopulates from the same `productionLines` array/object references on every call and nothing else mutates those objects, two consecutive calls with no intervening changes do yield identical keys and identical `ProductionLine` references. Scenario is achievable and correctly targets the actual clear-then-repopulate mechanism being fixed.

### Findings

None. No new issues; no scope violations in the added scenarios (S4-S7 exercise only `_updateRates()` directly or the normal `addProductionLine`/`removeProductionLine` API, consistent with the proposal's exclusion of changes to those functions' internals).
