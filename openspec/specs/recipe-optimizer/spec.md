# recipe-optimizer Specification

## Purpose
TBD - created by archiving change split-factory-god-class. Update Purpose after archive.
## Requirements
### Requirement: R1 Pure solve / impure materialize split
`app/models/solver/recipe-optimizer.ts` SHALL export the recipe-selection pipeline split at an explicit purity line:
- `solveRecipeSelection(input)` SHALL be pure: it takes a snapshot input (production lines, supplier factories, factory constraints, optimizer config, part-point overrides, global point overrides) and returns either a structured error or a selection result (selected recipes with rates, fixed targets, maximize targets). It SHALL NOT mutate the factory, the config, or any input, and SHALL NOT invoke `update()`.
- `materializeSelection(factory, selection)` SHALL apply a selection to a `Factory`, performing all mutation.

`Factory.optimizeRecipes(globalPointOverrides)` SHALL reduce to: build input → `solveRecipeSelection` → on error, set `solverError` and notify → otherwise `materializeSelection`, apply solved rates, and notify. The pipeline body, `_buildScoringObjective`, and `targetConstraints` SHALL no longer be defined in `factory.ts`.

Notification: the rate-application helper no longer notifies internally (see `rate-solver-verification` R2); `Factory.optimizeRecipes` SHALL call `update()` exactly once per invocation, as its final step — replacing today's up-to-three notifications per operation (declared behavior change).

#### Scenario: R1.S1 Solve is side-effect free
- **WHEN** `solveRecipeSelection` runs against a snapshot built from a factory
- **THEN** the factory's production lines, optimizer config, and inputs are unchanged and no notification occurs

#### Scenario: R1.S2 Direct unit test without Factory wiring
- **WHEN** a test calls `solveRecipeSelection` with a hand-built input
- **THEN** it returns a selection or error without requiring an `update` stub

#### Scenario: R1.S3 Wrapper notifies exactly once
- **WHEN** `Factory.optimizeRecipes` completes (success or error path)
- **THEN** `update()` has been called exactly once, as the operation's final step

### Requirement: R2 Selection pipeline behavior preserved
`solveRecipeSelection` SHALL preserve the current algorithm:
- Targets: declared optimizer targets translate to fixed-rate constraints and a maximize set — a declared target with `maximize` false and `rate` undefined or ≤ 0 is silently dropped. In gap-fill mode (`overwrite: false`) existing production lines add `maximizeOutput` targets unconditionally and fixed targets only when `outputRate > RATE_EPSILON`. A production line whose `outputRate` conflicts with a declared fixed target (difference > `RATE_EPSILON`) yields a conflicting-goals error; no targets at all yields a nothing-to-optimize error.
- Candidates: enabled recipes only; in gap-fill mode recipes producing a part already produced by kept lines are excluded while existing lines' recipes are always candidates; recipes producing hard-limited available parts are excluded.
- Supply overlays: supplier-factory products then available parts (available parts win conflicts) become `_supply_` variables with max-rate constraints, and each overlaid part additionally gets `{ min: 0 }` merged onto its part constraint via `mergeConstraint`.
- Maximize targets solve in a first pass (objective per part flow, `sinkPoints` weighting when selected); the achieved maxima become equality constraints scaled by `1 − SOLVER_EQUALITY_FUDGE` before the scoring pass.
- Scoring objective: the `ScoringObjective` translates to a single linear `_obj` row exactly as today (sinkPoints/inputValue price capped sources; power/logistics/buildings/minResources price recipes, with the factory-recipe and variable-power special cases).
- Infeasibility in either pass yields an infeasible-recipes error carrying the target list.

#### Scenario: R2.S1 Existing optimizer suite passes
- **WHEN** the `recipe-optimizer.test.ts` suite runs against `Factory.optimizeRecipes` after the split (error assertions updated to the structured forms)
- **THEN** all selection outcomes (chosen recipes, rates, gap-fill exclusions, supply handling, objective effects) are unchanged

#### Scenario: R2.S2 Conflicting goals reported with data
- **WHEN** a production line's `outputRate` differs from a declared fixed target for the same part by more than `RATE_EPSILON` in gap-fill mode
- **THEN** the result is an error carrying the part identity and both numeric rates (no pre-formatted display string)

### Requirement: R3 Materialization behavior preserved
`materializeSelection` SHALL preserve current behavior: in overwrite mode existing production lines are cleared first; selected recipes group by primary product into production lines (creating missing lines); an existing assembly line with the same recipe slug gets its rate updated, otherwise a new assembly line is appended; fixed targets set `outputRate`, `autoCalculateRate: true`, `maximizeOutput: false` on their lines; maximize targets set `maximizeOutput: true`, `autoCalculateRate: true`; finally solved per-recipe rates apply to all assembly lines and per-line rates recompute.

#### Scenario: R3.S1 Overwrite vs gap-fill materialization
- **WHEN** the same selection materializes once with `overwrite: true` and once with `overwrite: false` onto a factory with pre-existing lines
- **THEN** overwrite mode replaces all lines while gap-fill mode preserves existing lines, updating rates on matching recipes and appending only missing ones

### Requirement: R4 Structured optimizer errors
Recipe-optimizer failures SHALL be represented as structured variants of the `SolverError` union (conflicting-goals, nothing-to-optimize, infeasible-recipes) carrying part slugs and raw numbers. The `SolverError` union is defined in `app/models/solver/errors.ts`. The model layer SHALL NOT build display strings for them and SHALL NOT import `displayNum`.

#### Scenario: R4.S1 Error variants carry data only
- **WHEN** each failure mode is triggered
- **THEN** `factory.solverError` holds the matching union variant with its data fields, and `app/models/` contains no `displayNum` import
