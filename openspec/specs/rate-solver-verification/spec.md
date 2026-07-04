## Purpose

Correctness of `Factory.autoCalculateRates()`'s post-solve constraint-verification callback — the deferred check that compares solved net rates against the LP model's constraints and reports violations. Named to align with the eventual `solver/verify.ts` home planned for Phase M2 of `plans/model-refactor.md`; the logic currently lives inline in `factory.tsx`.

## Requirements

### Requirement: R1 Equal-constraint violation message reports the equal target
When `Factory.autoCalculateRates()`'s post-solve constraint-verification callback finds a solved part's net rate violates an `equal` constraint (`Math.abs(constraint.equal - netRate) > 0.0001`), the pushed error message SHALL interpolate `constraint.equal` as the target value, not any other field of the constraint (e.g. `constraint.min` or `constraint.max`).

This requirement covers only the message-interpolation bug (`constraint.min` → `constraint.equal`) at factory.tsx:1328. The branch's entry guard, `constraint.equal && Math.abs(...)` (factory.tsx:1324), is a truthy check that also skips the violation branch when `constraint.equal` is `0` — that is pre-existing behavior, a separate latent bug from this one, and out of scope for this requirement.

#### Scenario: R1.S1 Equal-constraint violation names the equal target, not min
- **WHEN** a solved part's net rate violates an `equal` constraint whose `equal` field is set to a value distinct from its (possibly unset) `min`/`max` fields
- **THEN** the pushed error message's interpolated target value equals `constraint.equal`

#### Scenario: R1.S2 Equal-constraint violation message is well-formed when min is unset
- **WHEN** a solved part's net rate violates an `equal` constraint whose `min` field is `undefined` (the common case — `equal` constraints do not also set `min`)
- **THEN** the pushed error message does not contain the literal substring `undefined`

#### Scenario: R1.S3 Min- and max-constraint violation messages are unaffected
- **WHEN** a solved part's net rate violates a `min` constraint or a `max` constraint
- **THEN** the pushed error message's interpolated target value equals `constraint.min` (for the min case) or `constraint.max` (for the max case), matching existing behavior, unchanged by this fix
