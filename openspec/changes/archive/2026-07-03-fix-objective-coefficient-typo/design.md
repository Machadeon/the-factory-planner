## Context

`Factory.autoCalculateRates()`'s minimize-inputs objective loop (`factory.tsx:1243-1251`) has a key-name typo (`coefficients.obj` read vs. `coefficients._obj` write) that should sum raw-resource-linked coefficients per LP variable but instead overwrites. `Factory.createBaseModel()` (factory.tsx:1120) guarantees today's real recipe data can never produce a variable with more than one `_raw_X` key, so the bug is currently inert — see proposal.md. `specs/rate-solver/spec.md` (R1) requires the accumulation to be correct regardless, as a forward invariant. This document decides how to exercise that requirement in a test without violating the proposal's "no extraction into a new module" constraint (extraction is reserved for `plans/model-refactor.md` Phase M2).

## Goals / Non-Goals

**Goals:**
- Fix the one-line typo.
- Add a unit test that exercises the real, un-extracted code path in `autoCalculateRates()` with a model shape today's game data can't produce, proving the accumulation logic itself (not a duplicated copy of it).

**Non-Goals:**
- No extraction of the objective-building loop into `solver/*` (Phase M2 territory).
- No change to `Factory`'s public API or to any other `autoCalculateRates()` behavior (rate targets, `maximizeOutput` branch, constraint handling).
- No attempt to make the multi-raw-resource-key shape reachable through real recipe data.

## Decisions

**D1 — Fix**: change `coefficients.obj` to `coefficients._obj` at factory.tsx:1248. One-word fix, no other line changes.

**D2 — Test mechanism**:
  - Mock the solver module at the module level: `vi.mock("javascript-lp-solver", () => ({ default: { Solve: vi.fn() } }))`, then in the test get the typed handle via `vi.mocked(solver.Solve)` (where `solver` is the same default import `factory.tsx` uses). This is Vitest's documented module-mocking mechanism — it replaces the module in the resolution graph before `factory.tsx` imports it, so it does not depend on how the CJS/ESM default-export binding behaves at runtime, unlike spying on the already-imported binding (`vi.spyOn(solver, "Solve")`), which is unreliable for default exports of dual CJS/ESM packages under Vite/Vitest.
  - Rig the model via `vi.spyOn(Factory.prototype, "createBaseModel").mockReturnValue(riggedModel)`, where `riggedModel` is typed as `ModelDefinition` (TypeScript enforces shape compatibility with the real return type at compile time, so drift in `createBaseModel`'s signature fails the build, not silently at runtime).
  - Configure the mock: `vi.mocked(solver.Solve).mockReturnValue({ feasible: false })`. Reading `factory.tsx:1264` (`if (solution.feasible) { ... }`) confirms `{ feasible: false }` is sufficient and *minimal*: it short-circuits before `_applyRates`, `this.update()`, and the `setTimeout` constraint-verification block ever run, so the test exercises exactly the objective-construction code (lines 1204-1254) and nothing past the solve call — no need to stub `factory.update`, no async `setTimeout` to await.
  - Call `factory.autoCalculateRates()` with no `maximizeOutput` target on any production line (so it takes the minimize-inputs branch), then capture the model via `vi.mocked(solver.Solve).mock.calls[0][0]` and assert on the rigged variable's `_obj`.
  - *Alternative considered*: extract the accumulation loop into an exported pure function, test it directly with a plain object. Rejected — the proposal explicitly excludes extraction for this change; that refactor belongs to Phase M2, where the same logic will already be relocated to `solver/rate-solver.ts` and directly testable there.
  - *Alternative considered*: construct a real `Factory` + recipes that happen to trigger the buggy path. Rejected — proven impossible under current game data (proposal's investigation); would require fabricating fake recipe/part data disconnected from `data.json`, which is a heavier and less honest test than mocking the one module boundary and one method that already separate "model construction" from "model consumption."
  - This is the first test in the codebase to spy on `Factory.prototype`; `vi.mock` module-factory mocking already has precedent elsewhere (integration tests mock `next/image`, `@xyflow/react`) so only the prototype-spy half is novel. Scoped narrowly (one test file, `vi.restoreAllMocks()` in `afterEach` for the prototype spy) so it doesn't set an expectation of mocking elsewhere.
  - Each `it()` block calls `vi.mocked(solver.Solve).mockClear()` (or resets in `beforeEach`) before invoking `autoCalculateRates()`, so `mock.calls[0][0]` reliably refers to that test's own solve call rather than accumulating call history across tests in the same file.

**D3 — Test location**: new test file `tests/unit/models/factory-auto-calculate-rates-objective.test.ts` — hyphenated per word (`auto`/`calculate`/`rates`/`objective`), matching this directory's per-concept-word-hyphenation convention (e.g. `factory-recipe-footprint.test.ts`, `factory-integer-instances.test.ts`) more closely than a squashed `autocalculaterates` would. Named after the existing method under test (`Factory.autoCalculateRates`), not the not-yet-existing `solver/rate-solver.ts` (Phase M2). The test file carries a one-line comment noting that Phase M2's extraction of this logic to `solver/rate-solver.ts` (`plans/model-refactor.md`) should relocate this test alongside it.

## Risks / Trade-offs

- [Spying on `createBaseModel` couples the test to that method's existence/signature] → Acceptable: `createBaseModel` is called out by name in the proposal and spec as the fix's context; Phase M2 will relocate this logic and the test will need updating regardless, at which point it moves with the extracted function and stops needing the spy.
- [Mocking `solver.Solve` means the test never runs a real LP solve] → Intentional: the requirement under test is model-construction correctness (what gets handed to the solver), not solver correctness, which is already covered by existing `autoCalculateRates()` tests using real recipes.
- [Rigged model shapes are synthetic and not physically meaningful (e.g. negative raw-resource coefficient)] → Acceptable per spec R1: the requirement is stated as a general arithmetic invariant independent of real-world value constraints; scenario R1.S2a exists precisely to pin that generality.

## Migration Plan

No data migration. Rollback: revert the one-line change and delete the test file.

Deferred cost (not "none", tracked): Phase M2 (`plans/model-refactor.md`) relocates this objective-building logic to `solver/rate-solver.ts`, at which point `tests/unit/models/factory-auto-calculate-rates-objective.test.ts` must move and be rewritten to call the extracted pure function directly instead of mocking `createBaseModel`/`solver.Solve`. Tracked via the one-line comment in the test file itself (D3) — this is a process-based marker, not a structural guarantee (no lint rule or CI check enforces it); it relies on whoever performs the Phase M2 extraction reading the comment when they touch this code, same as any other in-code TODO in this codebase.

Fallback if the mocking mechanism in D2 doesn't work as designed: `vi.mock` module-factory mocking is Vitest's standard, documented approach (unlike the rejected `vi.spyOn` on a default export), so residual risk is low; if it still fails in practice, the fallback is the first alternative considered in D2 — extract the accumulation loop into a small pure function scoped to this change only (not the full Phase M2 `solver/*` split) and unit-test it directly. This fallback is documented here rather than adopted up front because it does more (introduces a new file/export) than the primary mechanism, for a risk now assessed as low.

## Open Questions

None.
