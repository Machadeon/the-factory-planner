<!-- Append-only. Each review pass adds a new ## Pass N section. Never delete or edit previous passes. -->

## Pass 1 — 2026-07-03

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass
(first pass of this phase: leave empty)

### Findings

[1.1] — Task sets up the `vi.mock`/`vi.spyOn` scaffold but doesn't call out configuring `vi.mocked(solver.Solve).mockReturnValue({ feasible: false })` as an explicit step, even though design.md:23 treats this as a fixed, shared configuration underpinning every scenario test. Not naming it as a distinct task risks each of 1.2-1.8 independently forgetting or duplicating it.
[1.1] — Task doesn't mention the per-test `mockClear()`/`beforeEach` reset that design.md:28 specifies as required to keep `mock.calls[0][0]` valid across multiple `it()` blocks in the same file. This was a specific finding raised and resolved in design-review.md Pass 2/3 — no task in tasks.md carries that resolved decision forward, risking silent reintroduction of the call-index staleness bug during implementation.
[1.2-1.8] — None of the seven per-scenario task descriptions reference `vi.spyOn(Factory.prototype, "createBaseModel").mockReturnValue(riggedModel)` as the sanctioned mechanism for injecting each scenario's coefficient-map shape (per design.md D2). The "how" is only implied by task 1.1's scaffold, not threaded into each scenario task, leaving room for an implementer to satisfy a scenario via an unapproved model-injection approach.
[3.1] — "All 7 new test scenarios pass" doesn't name the scenarios (S1, S2, S2a, S3, S4, S5, S6) explicitly. If a scenario were silently dropped from Group 1, this verification task's own wording wouldn't catch the gap since it doesn't enumerate what the 7 are.
[Verification] — No task explicitly re-confirms proposal.md's central claim that the fix produces byte-identical LP models for real recipe data (i.e., that `createBaseModel` still guarantees single-key variables and the fix is truly a no-op for today's game data). Task 3.2's blanket "all unit/integration tests pass" likely covers this transitively via existing `factory.test.ts`/`factory-recipe.test.ts`, but there's no explicit task tying back to that specific proposal claim.
[Verification] — No task mechanically confirms the exact typo is gone at the source level (e.g., grep for `coefficients.obj` without a leading underscore in factory.tsx). Since D1 is a single-token fix, a verification step that only checks test-suite pass/fail doesn't guarantee the literal token change was made as specified — tests could pass through the mocking/injection path without the real source line being touched correctly.
[R1 / 1.2, 1.3, 1.4] — Spec R1 states summation "SHALL be independent of the order resources are processed in," but only task 1.2 (S1, two keys) mentions verifying order-independence ("regardless of key order"). Tasks 1.3 (S2, three keys) and 1.4 (S2a, mixed-sign) don't mention testing order-independence for their respective scenarios, even though the spec's order-independence claim applies equally to those higher-arity cases.

## Pass 2 — 2026-07-03

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass

- [1.1] `{feasible: false}` shared config not called out — resolved. Task 1.1 now explicitly specifies `beforeEach` configuring `vi.mocked(solver.Solve).mockClear()` and `.mockReturnValue({ feasible: false })` as shared setup for every scenario below it.
- [1.1] `mockClear()`/reset cadence not carried into tasks — resolved. Same edit to 1.1 folds the reset into the explicit `beforeEach`, plus `afterEach` `vi.restoreAllMocks()` for the `createBaseModel` spy.
- [1.2-1.8] Injection mechanism not threaded into per-scenario tasks — resolved. Tasks 1.2-1.7 each now name "via the same `createBaseModel` spy mechanism" (or the full `vi.spyOn(Factory.prototype, "createBaseModel").mockReturnValue(riggedModel)` expression in 1.2); 1.8 correctly omits it since R1.S6 (`maximizeOutput` branch) doesn't require a rigged multi-key model.
- [3.1] Scenario names not enumerated — resolved. Task 3.1 now lists all 7 by name: R1.S1, R1.S2, R1.S2a, R1.S3, R1.S4, R1.S5, R1.S6.
- [Verification] No mechanical check that the literal typo token is gone — resolved. New task 3.2 greps `app/models/factory.tsx` for a remaining bare `coefficients.obj` reference.
- [Verification] No task ties back to proposal's "byte-identical for real data" claim — resolved. New task 3.3 requires `factory.test.ts` and `factory-recipe.test.ts` to still pass unchanged, explicitly tied to that claim in the task text.
- [R1 / 1.2, 1.3, 1.4] Order-independence only tested for S1 — resolved. Tasks 1.2, 1.3, and 1.4 each now require testing multiple key-processing orderings (1.2/1.4: "test both orderings"; 1.3: "test at least two orderings").

### Findings

None.

Minor wording observations noted but not blocking (no functional gap, no missing scenario/group/verification category): task 1.3's "at least two orderings" is looser phrasing than 1.2/1.4's "both orderings" given three keys have six permutations rather than two, and task 1.9's pass/fail expectation doesn't explicitly restate whether it covers every new ordering-variant assertion or one representative assertion per scenario now that 1.2-1.4 contain multiple assertions each. Neither affects scenario coverage, group ordering, dependency order, requirement-to-task completeness, or verification-task presence — the five checked categories are all satisfied.
