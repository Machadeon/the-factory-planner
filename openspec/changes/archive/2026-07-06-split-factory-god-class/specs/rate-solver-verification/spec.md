## MODIFIED Requirements

### Requirement: R1 Equal-constraint violation message reports the equal target
When post-solve constraint verification finds a solved part's net rate violates an `equal` constraint (`Math.abs(constraint.equal - netRate) > RATE_EPSILON`), the resulting `ConstraintViolation` SHALL carry `bound: "equal"` and the constraint's `equal` value as its limit — not any other field of the constraint (e.g. `min` or `max`) — and the view-layer formatter SHALL interpolate that limit as the target value in the rendered message.

Verification lives in `app/models/solver/verify.ts` and returns structured `ConstraintViolation` values (part slug, violated bound kind, limit, actual net rate); the `ConstraintViolation` type and the `SolverError` union are defined in `app/models/solver/errors.ts`. Message text is produced by the view-layer formatter, not the model.

#### Scenario: R1.S1 Equal-constraint violation names the equal target, not min
- **WHEN** a solved part's net rate violates an `equal` constraint whose `equal` field is set to a value distinct from its (possibly unset) `min`/`max` fields
- **THEN** the violation's limit equals `constraint.equal`, and the formatted message's interpolated target value equals that limit

#### Scenario: R1.S2 Equal-constraint violation message is well-formed when min is unset
- **WHEN** a solved part's net rate violates an `equal` constraint whose `min` field is `undefined` (the common case — `equal` constraints do not also set `min`)
- **THEN** the formatted message does not contain the literal substring `undefined`

#### Scenario: R1.S3 Min- and max-constraint violations carry their own bounds
- **WHEN** a solved part's net rate violates a `min` constraint or a `max` constraint
- **THEN** the violation carries `bound: "min"` with the `min` value (or `bound: "max"` with the `max` value) as its limit, and the formatted message interpolates that limit

## ADDED Requirements

### Requirement: R2 Synchronous verification
`app/models/solver/verify.ts` SHALL export a pure, synchronous verification function that compares the solved model's constraints against the factory's recomputed `rateLookup` and returns a `ConstraintViolation[]`. `Factory.autoCalculateRates()` SHALL call it synchronously after applying rates and recomputing `rateLookup` (`_updateRates()`), before returning — the model layer SHALL contain no `setTimeout`. When violations exist, `solverError` SHALL be set to the structured constraint-violations variant before `autoCalculateRates()` returns; when none exist, a previously null `solverError` stays null. The `_raw_` constraint semantics are preserved: raw-resource constraints measure net consumption-first (`consumptionRate − productionRate`), computed into a local without mutating the shared `rateLookup` entry; parts missing from `rateLookup` or the part lookup are skipped as today.

Notification consolidation (declared behavior change): the rate-application helper (`_applyRates`) SHALL no longer call `update()` internally; each command wrapper (`autoCalculateRates`, `optimizeRecipes`) SHALL notify exactly once at the end of the whole operation. Today the feasible path notifies twice (`_applyRates` internal `update()` plus the wrapper's); this change removes the redundant burst.

#### Scenario: R2.S1 Violations visible on return
- **WHEN** `autoCalculateRates()` produces a solution whose applied rates violate a model constraint
- **THEN** `factory.solverError` holds the constraint-violations variant immediately after the call returns, with no timer flush required and exactly one `update()` notification for the whole operation

#### Scenario: R2.S2 Raw constraint nets consumption-first without mutation
- **WHEN** verification checks a `_raw_<part>` constraint
- **THEN** the compared net rate is `consumptionRate − productionRate` for that part, and the part's `rateLookup` entry is unchanged after verification

#### Scenario: R2.S3 No deferred callbacks in the model layer
- **WHEN** `app/models/` is searched for `setTimeout`
- **THEN** there are no occurrences

### Requirement: R3 Defined-bound checks (0-valued bounds verified)
Verification SHALL test each bound with `!== undefined` rather than truthiness, so 0-valued `min`, `max`, and `equal` bounds are checked. This is a declared behavior change from the pre-M2 implementation, which silently skipped 0-valued bounds.

Exception (implementation-revealed, amended during apply): the `min` bound SHALL be skipped for a supply-augmented part — a part whose model has a `_raw_<slug>` sibling constraint. Such a part's LP balance row includes the raw-supply variable, which `rateLookup` cannot observe, so its net production is legitimately negative by up to the raw draw; its `min: 0` is an LP-internal device, not a verifiable factory property. (The pre-M2 truthy guard skipped these accidentally; checking them naively flags every raw-consuming factory as infeasible.)

#### Scenario: R3.S1 Zero equal bound violated
- **WHEN** a part has constraint `{ equal: 0 }` and its solved net rate is 5
- **THEN** verification returns a violation with `bound: "equal"`, limit 0, actual 5

#### Scenario: R3.S2 Zero max bound violated
- **WHEN** a part has constraint `{ max: 0 }` and its solved net rate is 5
- **THEN** verification returns a violation with `bound: "max"`, limit 0, actual 5

#### Scenario: R3.S3 Zero min bound satisfied
- **WHEN** a part has constraint `{ min: 0 }` and its solved net rate is 5
- **THEN** verification returns no violation for that part

#### Scenario: R3.S4 Supply-augmented min bound skipped
- **WHEN** a part has constraint `{ min: 0 }`, the model also contains a `_raw_<slug>` constraint for it, and the part's rateLookup net is negative (consumed from raw supply)
- **THEN** verification returns no min violation for that part, while a part without a `_raw_` sibling and negative net still violates its `min: 0`

### Requirement: R4 View-layer message formatting
The view layer (the `solverError` renderer in `FactoryComponent`) SHALL format `SolverError` variants into display text, preserving the current message wording skeletons (violations joined into "No feasible solution! One or more constraints could not be satisified: …" with per-bound "must be … /min" phrasing; infeasible messages retain the "No feasible" prefix relied on by E2E assertions). All numeric values in all variants SHALL be formatted with `displayNum` — for constraint-violation messages, which previously interpolated raw numbers, this is a declared minor display change (integer values render identically). `app/models/` SHALL NOT import `displayNum` or any `app/lib` formatting util.

#### Scenario: R4.S1 Wording preserved for each variant
- **WHEN** the formatter renders each `SolverError` variant (conflicting-goals, nothing-to-optimize, infeasible-recipes, infeasible-rates, constraint-violations with min/max/equal bounds)
- **THEN** the produced text matches the current wording skeletons, including the "No feasible" prefix for infeasible variants

#### Scenario: R4.S2 Model layer free of display formatting
- **WHEN** `app/models/` is searched for `displayNum` imports
- **THEN** there are no occurrences
