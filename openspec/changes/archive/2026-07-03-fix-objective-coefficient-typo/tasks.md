## 1. Test Stubs

- [x] 1.1 Create `tests/unit/models/factory-auto-calculate-rates-objective.test.ts` with: `vi.mock("javascript-lp-solver", () => ({ default: { Solve: vi.fn() } }))`; in `beforeEach`, `vi.mocked(solver.Solve).mockClear()` and `vi.mocked(solver.Solve).mockReturnValue({ feasible: false })` (shared config per design.md D2, used by every scenario below); in `afterEach`, `vi.restoreAllMocks()` (resets the per-scenario `createBaseModel` spy). Confirm the file runs (empty `describe` block) before writing real tests.
- [x] 1.2 Write unit test stub (failing/pending): R1.S1 — via `vi.spyOn(Factory.prototype, "createBaseModel").mockReturnValue(riggedModel)` with a variable holding two truthy raw-resource keys, assert `_obj` equals `X + Y` regardless of key order (test both orderings).
- [x] 1.3 Write unit test stub (failing/pending): R1.S2 — via the same `createBaseModel` spy mechanism, a variable with three truthy raw-resource keys; assert `_obj` equals `X + Y + Z` regardless of processing order (test at least two orderings).
- [x] 1.4 Write unit test stub (failing/pending): R1.S2a — via the same `createBaseModel` spy mechanism, mixed-sign coefficients (`X` positive, `-Y` negative); assert `_obj` equals `X + (-Y)` regardless of processing order (test both orderings).
- [x] 1.5 Write unit test stub (failing/pending): R1.S3 — via the same `createBaseModel` spy mechanism, one truthy key (`X`) plus one zero-valued key; assert `_obj` equals `X`.
- [x] 1.6 Write unit test stub (failing/pending): R1.S4 — via the same `createBaseModel` spy mechanism, exactly one truthy raw-resource key (`X`); assert `_obj` equals `X`.
- [x] 1.7 Write unit test stub (failing/pending): R1.S5 — via the same `createBaseModel` spy mechanism, no truthy raw-resource key on the variable; assert `_obj` is `undefined`.
- [x] 1.8 Write unit test stub (failing/pending): R1.S6 — with a `maximizeOutput` target set on a production line, assert the minimize-inputs accumulation path does not run and `_obj` assignment matches the existing direct-assignment behavior (unchanged by this fix).
- [x] 1.9 Run the new test file and confirm S1/S2/S2a fail against current (buggy) code, while S3/S4/S5/S6 pass (per proposal's dead-code analysis, these should already hold). This confirms the stubs actually exercise the typo before it's fixed. Confirmed: 6 failed (S1×2, S2×2, S2a×2), 4 passed (S3, S4, S5, S6) — exact match.

## 2. Fix

- [x] 2.1 Change `coefficients.obj` to `coefficients._obj` at `app/models/factory.tsx:1248`.
- [x] 2.2 Add the one-line comment in the new test file noting Phase M2 (`plans/model-refactor.md`) should relocate this test to `solver/rate-solver.ts` when that extraction happens.

## 3. Verification

- [x] 3.1 All 7 new test scenarios pass: R1.S1, R1.S2, R1.S2a, R1.S3, R1.S4, R1.S5, R1.S6. (10/10 tests, incl. 2 orderings each for S1/S2/S2a)
- [x] 3.2 Grep `app/models/factory.tsx` confirms no remaining bare `coefficients.obj` reference (only `coefficients._obj`), mechanically verifying the D1 token fix was applied as specified, independent of test-suite pass/fail.
- [x] 3.3 Existing real-recipe-data tests (`tests/unit/models/factory.test.ts`, `tests/unit/models/factory-recipe.test.ts`) still pass unchanged, confirming the fix is a no-op for today's game data as proposal.md claims (byte-identical LP models for real recipes). 36/36 passed.
- [x] 3.4 All unit/integration tests pass (`npm run test:run`). 31 files, 226 passed + 2 pre-existing todo.
- [x] 3.5 `npm run build` succeeds.
- [x] 3.6 Biome check on touched files (`app/models/factory.tsx`, new test file): 0 findings. (Full-repo `npm run lint-fix` reports pre-existing, unrelated noise from `out/`, a gitignored static-export build dir not excluded in biome.json's `files.includes` — out of scope for this change, flagged separately.)
