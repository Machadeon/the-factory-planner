## ADDED Requirements

### Requirement: R1 Minimize-inputs objective accumulates raw-resource coefficients
When `Factory.autoCalculateRates()` builds the minimize-inputs LP objective (no `maximizeOutput` target present), it iterates the configured raw resources (`defaultResourceLimits` keys) and, for each LP variable whose coefficient map has a truthy, non-zero value under that resource's `_raw_<resource>` key, contributes that value toward the variable's `_obj` coefficient. The `_obj` coefficient SHALL equal the arithmetic sum of every such contribution for that variable, not just the most recently processed one. Summation SHALL be independent of the order resources are processed in and of the sign of individual contributions. A raw-resource key whose value is `0` or otherwise falsy SHALL NOT contribute to the sum.

This requirement is satisfied by correcting the existing inline accumulation logic in `Factory.autoCalculateRates()` (the `coefficients.obj` / `coefficients._obj` key-name mismatch). It does not require, and does not permit, extracting the objective-building loop into a separate module — that restructuring is out of scope (see `plans/model-refactor.md` Phase M2).

The `maximizeOutput` branch (a separate, pre-existing code path that assigns `_obj` directly rather than accumulating) is unaffected by this requirement.

#### Scenario: R1.S1 Variable with two raw-resource-linked coefficients sums both
- **WHEN** a variable's coefficient map has two truthy, non-zero raw-resource keys (`_raw_<resource-a>: X`, `_raw_<resource-b>: Y`) and `autoCalculateRates()` runs with no `maximizeOutput` target
- **THEN** that variable's `_obj` equals `X + Y`, regardless of which resource key is processed first

Note: today's real recipe/game data cannot produce this two-key shape via `Factory.createBaseModel` (see proposal.md's investigation); this scenario is validated by supplying a model in this shape directly to `autoCalculateRates()`, not by reproducing the shape through normal recipe data.

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
- **WHEN** `autoCalculateRates()` runs with a `maximizeOutput` target present
- **THEN** the minimize-inputs accumulation logic described in this requirement does not execute; `_obj` assignment follows the existing direct-assignment behavior of the `maximizeOutput` branch, unchanged by this fix
