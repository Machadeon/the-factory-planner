## Context

`Factory.autoCalculateRates()` schedules a `setTimeout` closure (factory.tsx:1281-1337) that re-checks the solved solution against `model.constraints` after `_applyRates` has run, reading `this.rateLookup` live at fire time (not a captured snapshot — see `tests/unit/models/factory.test.ts`'s existing "deferred constraint verification" describe block, which already exercises this same closure for a different regression). The `equal`-constraint branch (factory.tsx:1323-1329) interpolates `constraint.min` instead of `constraint.equal` into the violation message, so today it always reads "must be exactly undefined/min" regardless of the actual target. `specs/rate-solver-verification/spec.md` (R1) requires the correct field.

## Goals / Non-Goals

**Goals:**
- Fix the one-line interpolation typo.
- Add a regression test that exercises the real (un-mocked) deferred-verification closure and proves the equal-branch message names the right target.

**Non-Goals:**
- No change to the `constraint.equal && ...` truthy entry guard (factory.tsx:1324) — the `equal === 0` skip case is a separate, pre-existing latent bug, explicitly out of scope (spec R1, second paragraph).
- No change to the `min`/`max` branches, no extraction of the verification closure into `solver/verify.ts` (Phase M2 territory per `plans/model-refactor.md`).
- No change to `Factory`'s public API.

## Decisions

**D1 — Fix**: change `constraint.min` to `constraint.equal` at factory.tsx:1328. One-word fix, no other line changes.

**D2 — Test mechanism**: exercise the real closure, no mocking.
- Reuse the existing test's setup shape: a manual production line on a real recipe (`ironIngotRecipe`) with `autoCalculateRate = true` and `outputRate` set to a value the recipe can hit exactly (e.g. 30/min from `ironIngotPart`) — this makes `autoCalculateRates()` add an `{ equal: 30 }` constraint for `iron-ingot` (factory.tsx:1226) and solve feasibly, so `solverError` starts `null`.
- Call `factory.autoCalculateRates()`, then — *before* awaiting the deferred tick — directly mutate `factory.rateLookup["iron-ingot"]`'s `productionRate` to a value that diverges from the `30` target by more than the `0.0001` tolerance. The verification closure reads `this.rateLookup` live when the `setTimeout` fires (confirmed by the existing "deferred constraint verification" test, which relies on the same live-read behavior), so this forces the equal-branch violation deterministically without needing a real solver deviation or a rigged model.
- `await new Promise((resolve) => setTimeout(resolve, 0))` to let the closure run (same pattern as the existing deferred-verification test).
- Assert `factory.solverError` contains the substring `"exactly 30/min"` and does not contain `"undefined"`.
- *Alternative considered*: mock `javascript-lp-solver`'s `Solve` to return a solution that deviates from the equal target. Rejected — harder to guarantee the LP solver's own numeric output lands outside the `0.0001` tolerance deterministically; mutating `rateLookup` directly is simpler, matches an established precedent in this same test file, and tests exactly the branch under change (message formatting), not solver behavior.
- *Alternative considered*: unit-test the message-building logic in isolation by extracting it. Rejected — proposal and spec explicitly exclude extraction for this change (Phase M2 territory).

**D3 — Test location**: add a new `it()` inside the existing `describe("autoCalculateRates() — deferred constraint verification", ...)` block in `tests/unit/models/factory.test.ts` (not a new file) — it already sets up the fixtures and pattern this test reuses, and this is a second regression against the same closure.

## Risks / Trade-offs

- [Directly mutating `factory.rateLookup` mid-test is a white-box technique] → Acceptable: it's already the established pattern in this describe block (see the existing "does not mutate rateLookup" test's framing) and is the only way to force a specific constraint-verification branch without depending on solver internals.

## Migration Plan

No data migration. Rollback: revert the one-line change and the added test case.

## Open Questions

None.
