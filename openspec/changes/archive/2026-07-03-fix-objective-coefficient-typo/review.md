<!-- Append-only. Each review pass adds a new ## Pass N section. Never delete or edit previous passes. -->

## Pass 1 — 2026-07-03

**Source: Reviewer**
**Status: APPROVED**

### Resolved from Previous Pass
(first pass of this phase: leave empty)

### Findings

app/models/factory.tsx:1248: LOW: none — fix matches D1 exactly (`coefficients.obj` → `coefficients._obj`), verified via `git diff main` this is the only change to this line, and grep confirms no remaining bare `coefficients.obj` reference in the file.

tests/unit/models/factory-auto-calculate-rates-objective.test.ts:59-67 (R1.S3 test): LOW: assertion (`_obj === 7` when rigged with one non-zero key and one zero-valued key) is arithmetically indistinguishable from a mutant that removed the zero-value guard entirely, since adding `0` to a sum is always a no-op — no numeric example under this black-box model shape can actually distinguish "zero key was skipped" from "zero key was summed but contributed nothing." Structural limitation of the chosen test approach (accepted implicitly when D2's mocking strategy was approved in design-review.md), not an implementation defect. No fix available without changing the test's construction mechanism (out of scope for this change).

tests/unit/models/factory-auto-calculate-rates-objective.test.ts:96-107 (R1.S6 test): LOW: asserts the correct `_obj` value (`4`) via the `maximizeOutput` direct-assignment path, but the rigged model has no `_raw_X` keys, so the assertion can't distinguish "the minimize-inputs accumulation loop was skipped because `maxTargets.size > 0`" (the literal claim in spec.md's R1.S6 THEN clause) from "the loop ran but had nothing to accumulate." Verified by tracing the real branch logic (factory.tsx:1230-1253): both explanations produce identical output here. Doesn't invalidate the test — it's still a valid, if partial, check that `maximizeOutput` behavior is unaffected by the fix — just doesn't fully pin branch-exclusivity as literally worded in the spec.

Independent verification performed beyond static reading: ran `npx vitest run tests/unit/models/factory-auto-calculate-rates-objective.test.ts` (10/10 pass); ran `npx vitest run tests/unit/models/factory.test.ts tests/unit/models/factory-recipe.test.ts` (39/39 pass, confirming proposal's "byte-identical for real data" claim); `grep -n "coefficients\.obj\b" app/models/factory.tsx` returns no match; manually traced R1.S6's `ProductionLine` construction and `maximizeOutput` branch logic against the real `factory.tsx:1211-1238` code and confirmed the rigged model's key (`part.slug`) correctly matches what `maxTargets` checks; confirmed `SolveResult`'s `result: number` field is non-optional in the type definition and the test correctly supplies it (`{ feasible: false, result: 0 }`), which is more type-correct than design.md's stated minimal shape (`{ feasible: false }` alone).

Scope confirmed via `git diff main -- app/models/factory.tsx`: exactly two hunks exist, one at line 1248 (this change) and one at line ~1328 (`constraint.equal`, belonging to the unrelated concurrent `fix-equal-constraint-violation-message` change per `git status` showing that change's own `openspec/changes/` directory). Only the line-1248 hunk and the new test file were reviewed as part of this change; the unrelated hunk and unrelated `factory.test.ts` modifications were excluded per the coordinator's scope note, independently confirmed via `git diff`/`git status` rather than taken on faith.

No CRITICAL, HIGH, or MED findings. Two LOW findings noted above are accepted design trade-offs inherent to the approved test mechanism (design-review.md, APPROVED), not implementation defects — left open, non-blocking.
