<!-- Append-only. Each review pass adds a new ## Pass N section. Never delete or edit previous passes. -->

## Pass 1 — 2026-07-03

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass
(first pass of this phase: leave empty)

### Findings

[D2] — `vi.spyOn(solver, "Solve")` targets a default import from `javascript-lp-solver` (dual CJS/ESM package: `main: ./dist/index.cjs`, `module: ./dist/index.mjs`). No prior test in `tests/unit/models/` spies on a third-party default export; under Vitest/Vite ESM interop, default-export bindings can be frozen or rebound such that the spy never intercepts the real call inside `factory.tsx`'s closure over `solver`. Design doesn't note verifying the spy actually attaches before relying on it as the assertion mechanism.
[D2] — `vi.spyOn(Factory.prototype, "createBaseModel")` is the first prototype spy in this codebase (self-acknowledged in design.md:23) — no precedent pattern to validate against. Design discusses spy-target risk (method existence/signature, in Risks) but not spy return-shape risk if `createBaseModel`'s return type evolves.
[D2] — Design states the test asserts on the `model` argument "captured via `vi.spyOn(solver, "Solve")`" but never specifies the capture mechanism (`mock.calls[0][0]`, closure variable, etc.) — this is the one line meant to fully define the test mechanism and leaves a mechanical detail unresolved.
[D2] — The mocked `SolveResult` is only specified as "minimal valid" with no field-level definition; `autoCalculateRates()`'s code after the solve call (factory.tsx:1258+) was not reviewed here for what fields it reads off `SolveResult`, so "minimal valid" is undefined and could still throw downstream if a required field is omitted.
[D3] — Test file name `factory-rate-solver-objective.test.ts` references `rate-solver`, a module that doesn't exist yet (aspirational Phase M2 name per proposal.md:L18, no current `rate-solver.ts` source file). Existing test files in `tests/unit/models/` (e.g. `factory-recipe-footprint.test.ts`, `factory-integer-instances.test.ts`) name themselves after an existing source file/feature, not a future one — this file breaks that convention by naming itself after code that doesn't exist.
[Migration Plan] — States "None" but Risks (L29) already identifies that Phase M2's relocation will require updating this test "regardless" — that's a deferred migration cost, not an absent one, and it's untracked: no TODO/back-reference from `plans/model-refactor.md` Phase M2 to this specific test file to prevent it being silently dropped or orphaned during that refactor.
[Migration Plan] — No rollback/fallback path specified if the `vi.spyOn(solver, "Solve")` mechanism (per the interop risk above) doesn't work as designed during implementation — D2 presents one mechanism with no documented fallback if it fails.

Modern web standards: N/A, confirmed — no UI/DOM/web-platform surface in this change (pure `app/models/factory.tsx` LP-model logic + new unit test).
Frontend design: N/A, confirmed — no visual/component/copy changes.

## Pass 2 — 2026-07-03

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass

- [D2] `vi.spyOn(solver, "Solve")` CJS/ESM interop risk — resolved. Replaced with `vi.mock("javascript-lp-solver", ...)` module-factory mocking, which replaces the module in the resolution graph before `factory.tsx` imports it, avoiding default-export binding risk. Confirmed `vi.mock` has precedent elsewhere in the codebase (`tests/integration/*.test.tsx` mocking `next/image`, `@xyflow/react`), so this is a known-good mechanism, just newly applied to `tests/unit/models/` and to `javascript-lp-solver` specifically.
- [D2] Prototype-spy return-shape risk — resolved. `riggedModel` is now typed as `ModelDefinition`, so a future signature change in `createBaseModel` fails the build rather than silently passing a malformed shape at runtime.
- [D2] Capture mechanism unspecified — resolved. Design now states the exact expression: `vi.mocked(solver.Solve).mock.calls[0][0]`.
- [D2] "Minimal valid" `SolveResult` undefined — resolved. Design pins the exact value `{ feasible: false }` and cites `factory.tsx:1264` (`if (solution.feasible)`) as justification. Independently verified against the source: this gate does short-circuit before `_applyRates`, `this.update()`, and the `setTimeout` block, confirming the claim.
- [D3] Test filename referencing a non-existent module — resolved. Renamed to `factory-autocalculaterates-objective.test.ts`, naming after the real, existing `Factory.autoCalculateRates` method, matching the directory's naming convention, plus an in-file comment pointing to Phase M2 for eventual relocation.
- [Migration Plan] Deferred cost untracked — resolved. Migration Plan now explicitly documents the Phase M2 relocation cost and its tracking mechanism (in-file comment).
- [Migration Plan] No fallback for mock-mechanism failure — resolved. Documents a concrete fallback (extract a small local pure function) with reasoning for why it isn't adopted up front (residual risk assessed low, fallback does strictly more than needed today).

### Findings

[D3] — `factory-autocalculaterates-objective.test.ts` squashes `autoCalculateRates` into `autocalculaterates` with no internal word separation, unlike the directory's existing hyphen-per-concept convention (`factory-recipe-footprint.test.ts`, `factory-integer-instances.test.ts`). Harder to scan/grep than a form that preserves word boundaries (e.g. `factory-auto-calculate-rates-objective.test.ts`); partially undercuts the stated goal of matching convention for readability.
[Migration Plan] — Claim that "the test's own presence and comment are the durable marker, so it can't be silently dropped or orphaned" overstates the guarantee: the in-file comment is not enforced by any lint rule, CI check, or cross-reference from `plans/model-refactor.md` back to this test file. Nothing structurally prevents Phase M2 from moving/deleting the file without reading the comment. The mechanism is process/attention-based, not structural — fine as a lightweight solution, but the phrasing claims stronger enforcement than actually exists.
[D2] — `vi.restoreAllMocks()` in `afterEach` (L27) correctly restores the `vi.spyOn(Factory.prototype, "createBaseModel")` spy, but module mocks registered via `vi.mock("javascript-lp-solver", ...)` are file-scoped and aren't meaningfully reset by `restoreAllMocks` the same way — if multiple tests share the file and rely on per-test call-count isolation (e.g. `mock.calls[0][0]` assumes call index 0), the design doesn't address how/whether `vi.mocked(solver.Solve).mockClear()` or equivalent is needed between tests to keep that index valid.

Modern web standards: N/A, reconfirmed — no UI/DOM/web-platform surface.
Frontend design: N/A, reconfirmed — no visual/component/copy changes.

## Pass 3 — 2026-07-03

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass

- [D3] Squashed test filename — resolved. `factory-auto-calculate-rates-objective.test.ts` hyphenates every word (`auto`/`calculate`/`rates`/`objective`), matching the directory's per-concept-word convention.
- [Migration Plan] Overstated enforcement guarantee — resolved. Now reads "a process-based marker, not a structural guarantee (no lint rule or CI check enforces it)" — accurately describes the actual enforcement level instead of overselling it.
- [D2] `mock.calls[0][0]` call-index staleness across tests — resolved. Design now states each `it()` block clears `solver.Solve`'s mock call history before invoking `autoCalculateRates()`, keeping the `mock.calls[0][0]` index valid per test. Separately verified the `Factory.prototype.createBaseModel` spy is unaffected by this concern: `vi.restoreAllMocks()` in `afterEach` (L27) fully removes and reinstalls that spy's `mockReturnValue` per test, so no cross-test bleed there either.

### Findings

None.

Modern web standards: N/A, reconfirmed — no UI/DOM/web-platform surface in this change.
Frontend design: N/A, reconfirmed — no visual/component/copy changes.
