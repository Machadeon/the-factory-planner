## Purpose

Correctness invariants of `Factory.autoCalculateRates()`'s LP objective construction. Named to align with the eventual `solver/rate-solver.ts` home planned for Phase M2 of `plans/model-refactor.md`, even though the logic currently lives inline in `factory.tsx`.
## Requirements
### Requirement: R1 Minimize-inputs objective accumulates raw-resource coefficients
When the rate solver builds the minimize-inputs LP objective (no `maximizeOutput` target present), it iterates the configured raw resources (`defaultResourceLimits` keys) and, for each LP variable whose coefficient map has a truthy, non-zero value under that resource's `_raw_<resource>` key, contributes that value toward the variable's `_obj` coefficient. The `_obj` coefficient SHALL equal the arithmetic sum of every such contribution for that variable, not just the most recently processed one. Summation SHALL be independent of the order resources are processed in and of the sign of individual contributions. A raw-resource key whose value is `0` or otherwise falsy SHALL NOT contribute to the sum.

This logic lives in the pure rate-solve function in `app/models/solver/rate-solver.ts` (its home per Phase M2 of `plans/model-refactor.md`); `Factory.autoCalculateRates()` is a thin wrapper over it. The requirement's accumulation semantics are unchanged by the extraction.

The `maximizeOutput` branch (a separate, pre-existing code path that assigns `_obj` directly rather than accumulating) is unaffected by this requirement.

#### Scenario: R1.S1 Variable with two raw-resource-linked coefficients sums both
- **WHEN** a variable's coefficient map has two truthy, non-zero raw-resource keys (`_raw_<resource-a>: X`, `_raw_<resource-b>: Y`) and the minimize-inputs objective is built (no `maximizeOutput` target)
- **THEN** that variable's `_obj` equals `X + Y`, regardless of which resource key is processed first

Note: today's real recipe/game data cannot produce this two-key shape via the base-model builder (see the archived `fix-objective-coefficient-typo` change's investigation); this scenario is validated by supplying a model in this shape directly to the pure rate-solve path, not by reproducing the shape through normal recipe data.

#### Scenario: R1.S2 Variable with three or more raw-resource-linked coefficients sums all
- **WHEN** a variable's coefficient map has three truthy, non-zero raw-resource keys with values `X`, `Y`, `Z`
- **THEN** that variable's `_obj` equals `X + Y + Z`

#### Scenario: R1.S2a Mixed-sign coefficients sum algebraically
- **WHEN** a variable's coefficient map has two truthy, non-zero raw-resource keys with values `X` (positive) and `-Y` (negative)
- **THEN** that variable's `_obj` equals `X + (-Y)`, not `X` alone or `-Y` alone, and not the absolute-value sum `X + Y`

#### Scenario: R1.S3 Zero-valued raw-resource key does not contribute
- **WHEN** a variable's coefficient map has one truthy, non-zero raw-resource key (`X`) and one raw-resource key present with value `0`
- **THEN** that variable's `_obj` equals `X`, unaffected by the zero-valued key

#### Scenario: R1.S4 Single raw-resource variable is unaffected
- **WHEN** a variable's coefficient map has exactly one truthy, non-zero raw-resource key with value `X`
- **THEN** that variable's `_obj` equals `X`

#### Scenario: R1.S5 No raw-resource key present leaves `_obj` untouched
- **WHEN** a variable's coefficient map has no raw-resource key with a truthy, non-zero value
- **THEN** that variable's `_obj` remains unset (`undefined`)

#### Scenario: R1.S6 maximizeOutput branch is unaffected
- **WHEN** the rate solver runs with a `maximizeOutput` target present
- **THEN** the minimize-inputs accumulation logic described in this requirement does not execute; `_obj` assignment follows the existing direct-assignment behavior of the `maximizeOutput` branch

### Requirement: R2 Pure rate-solve function with thin Factory wrapper
`app/models/solver/rate-solver.ts` SHALL export a pure rate-solve function that takes the solve inputs derived from the factory (assembly-line recipes, per-line output-rate and maximize targets, factory constraints) and returns solved per-assembly-line rates plus a feasibility outcome, without mutating the factory or invoking `update()`. `Factory.autoCalculateRates()` SHALL reduce to: build inputs → solve → on infeasible, set `solverError` to the structured infeasible variant → otherwise apply rates, recompute `rateLookup` (`_updateRates()`), run synchronous verification, and notify. The solve loop, model construction, and objective building SHALL no longer be defined in `factory.ts`.

#### Scenario: R2.S1 Solve is directly testable
- **WHEN** a test calls the pure rate-solve function with hand-built inputs
- **THEN** it returns rates and feasibility without a `Factory` instance or `update` stub, and repeated calls with the same input return the same result

#### Scenario: R2.S2 Wrapper preserves solve outcomes
- **WHEN** the existing `factory.test.ts` rate-balancing cases run against `Factory.autoCalculateRates()` after the extraction
- **THEN** solved assembly-line rates, production-line rates, and feasibility outcomes are unchanged

#### Scenario: R2.S3 Infeasible solve reports structured error
- **WHEN** the solve is infeasible
- **THEN** `factory.solverError` is set to the structured infeasible variant (no display string built in the model layer) and rates are left unchanged, matching current behavior

### Requirement: R3 Shared base-model builder module
`app/models/solver/base-model.ts` SHALL export `createBaseModel` and `mergeConstraint` as pure functions consumed by both the rate solver and the recipe optimizer, preserving current behavior: raw-resource variables and limits from `defaultResourceLimits` (zero-limit resources locked out via `{ min: 0 }` with no `_raw_` variable), `{ min: 0 }` constraints for `notAutomatable` parts, factory-constraint overlay (applied to the `_raw_` constraint when one exists, else the part constraint, via `mergeConstraint`'s equal-wins/min-max-tightening rules), the intermediate-part rule below, and integer marking (`ints`) for factory-recipe variables. Neither function SHALL remain defined in `factory.ts`.

Intermediate-part rule (preserved verbatim, including its truthy guard): for each part both consumed and produced by candidate recipes — if the part already has a constraint, skip it only when its `equal` field is truthy (an `equal: 0` constraint is NOT skipped), otherwise directly assign `min = 0`, overwriting any existing `min` even when the existing bound is stricter (e.g. a factory-constraint `min: 5` becomes `min: 0`); if the part has no constraint and is not `water`, set `{ min: 0 }`. The proposal's `!== undefined` bound fix applies to `solver/verify.ts` only, not here.

#### Scenario: R3.S1 Model shape preserved
- **WHEN** `createBaseModel` builds a model from the same recipes and constraints as before the move
- **THEN** the resulting constraints, variables, and `ints` marking are identical to the pre-move `Factory.createBaseModel` output

#### Scenario: R3.S3 Intermediate-part guard semantics preserved
- **WHEN** `createBaseModel` processes an intermediate part with constraint `{ equal: 0 }`, another with `{ min: 5 }`, and a third with `{ equal: 10 }`
- **THEN** the first ends with `{ equal: 0, min: 0 }`, the second with `{ min: 0 }`, and the third stays `{ equal: 10 }` untouched

#### Scenario: R3.S2 mergeConstraint rules preserved
- **WHEN** `mergeConstraint` merges an `equal` bound over an existing `equal` with a different value, an `equal` over min/max bounds, and tighter/looser `min`/`max` bounds over existing ones
- **THEN** conflicting equals warn and leave the existing bound, `equal` otherwise wins, `min` only rises, and `max` only falls — matching current behavior
