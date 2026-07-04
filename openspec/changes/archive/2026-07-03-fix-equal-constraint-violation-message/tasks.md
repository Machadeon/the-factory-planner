## 1. Test Stubs

- [x] 1.1 Write unit test stub in `tests/unit/models/factory.test.ts` (new `it()` inside the existing `describe("autoCalculateRates() — deferred constraint verification", ...)` block): R1.S1/R1.S2 — force an equal-constraint violation (fixed-rate production line + mutate `factory.rateLookup` post-solve per design.md D2) and assert `factory.solverError` contains `"exactly 30/min"` and not `"undefined"`, proving the message names the `equal` target and not `min`/`max`.
- [x] 1.2 Write unit test stub in the same describe block: R1.S3 (min case) — force a `min`-constraint violation via the same rateLookup-mutation technique and assert `factory.solverError` contains `"or greater"` with the correct `min` value, pinning that this fix leaves the `min` branch's message unaffected (regression guard, not exercising new behavior).
- [x] 1.3 Write unit test stub in the same describe block: R1.S3 (max case) — force a `max`-constraint violation via the same rateLookup-mutation technique and assert `factory.solverError` contains `"or less"` with the correct `max` value, pinning that this fix leaves the `max` branch's message unaffected (regression guard, not exercising new behavior).

## 2. Implementation

- [x] 2.1 Fix `constraint.min` → `constraint.equal` at `app/models/factory.tsx:1328`.

## 3. Verification

- [x] 3.1 New test stubs (1.1, 1.2, 1.3) fail before the fix where applicable and pass after (confirm actual test-first behavior; 1.2/1.3 pin pre-existing unaffected behavior and should pass both before and after).
- [x] 3.2 All unit tests pass (`npm run test:run`).
- [x] 3.3 `npm run lint-fix` clean (biome check on changed files `app/models/factory.tsx`, `tests/unit/models/factory.test.ts`: clean; unrelated pre-existing `out/` build-artifact noise in the full sweep is out of scope for this change).
