## Pass 1 — 2026-07-05

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass
(none — first pass)

### Findings

- specs/rate-solver-verification/spec.md:R2.S1: 🟡 concern: "exactly one notification for the whole operation" is an undeclared behavior change — today the feasible path notifies twice (`_applyRates` internal `update()` at factory.ts:1427 plus wrapper `update()` at factory.ts:1284). Declare the notification consolidation as a behavior change or relax to "no deferred notification".
- specs/recipe-optimizer/spec.md:R1.S1: 🟡 concern: "no render notification occurs until the wrapper's final step" contradicts current `_applyRates`, which calls `update()` internally (factory.ts:1427) and is part of materialization. Spec whether `_applyRates` loses its internal notify (and note its other caller, `autoCalculateRates`, is affected too).
- specs/rate-solver/spec.md:R3: 🟡 concern: "except parts with an `equal` constraint" hides the truthy guard (`if (constraints[slug].equal) continue`, factory.ts:1189) — a part with `equal: 0` is NOT skipped and gets `min = 0`. State the truthy semantics, or an implementer using `!== undefined` diverges from R3.S1's "identical output" (proposal declares the `!== undefined` fix for verify only).
- specs/rate-solver/spec.md:R3: 🟡 concern: intermediate-part rule does direct assignment `constraints[slug].min = 0` (factory.ts:1190), overwriting a stricter existing `min` (factory-constraint `min: 5` becomes `0`); "`{ min: 0 }` on intermediate parts" reads like a merge, and `mergeConstraint` would keep the 5. Spec the overwrite explicitly.
- specs/recipe-optimizer/spec.md:R2: 🟡 concern: supply-overlay bullet specifies only `_supply_` max-rate constraints, omitting the `mergeConstraint(constraints, partSlug, { min: 0 })` applied per supplier product and per available part (factory.ts:464, 476). Add it — dropping it changes model shape.
- specs/recipe-optimizer/spec.md:R2: 🔵 nit: gap-fill mode adds a line's fixed target only when `outputRate > RATE_EPSILON` (factory.ts:355); spec says lines "add their `outputRate`" unconditionally. State the threshold.
- specs/recipe-optimizer/spec.md:R2: 🔵 nit: declared targets with `maximize` false and `rate` undefined or ≤ 0 are silently dropped (factory.ts:793-797, `targetConstraints`); no bullet or scenario covers this edge. Add one.
- specs/recipe-optimizer/spec.md:R4: 🔵 nit: no spec pins which module exports the `SolverError` union and `ConstraintViolation` type — the view formatter and structured-assertion tests need a stable import path. Name the home module (same gap in rate-solver-verification R2).
- specs/factory-metrics/spec.md:R2: 🔵 nit: "with the depth-32 recursion guard" — `factoryFloorArea` never recurses (factory-recipe.ts:15-33; nested lines use precomputed `footprintAreaPerInstance`, `depth` is never incremented), so the guard is dead code. Reword so the implementer isn't told to preserve phantom recursion.
- specs/optimizer-suggestions/spec.md:R2: 🔵 nit: "removes the slugs from `config.enabledRecipes` in place" — source reassigns a new filtered array (factory.ts:836-839), not in-place array mutation; aliased-array holders observe the difference. Say "replaces `enabledRecipes` with a filtered copy; the config object is mutated".
- specs/optimizer-suggestions/spec.md:R1: 🔵 nit: proposal lists a "deny-recipes helper" in `suggestions.ts` but the spec doesn't say whether it is exported or internal. Pin it.
- specs/rate-solver-verification/spec.md:R4: 🔵 nit: violation messages currently interpolate raw numbers (`${constraint.min}` factory.ts:1321-1339) while conflicting-goals uses `displayNum`; "MAY be formatted with `displayNum`" plus "matches the current wording skeletons" leaves numeric formatting untestable per variant. Pin which variants use `displayNum`.

## Pass 2 — 2026-07-05

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass

- 🟡 rate-solver-verification R2.S1 (undeclared notification change): resolved — R2 adds a "Notification consolidation (declared behavior change)" paragraph (`_applyRates` loses its internal `update()`, each wrapper notifies exactly once); proposal declares it under What Changes.
- 🟡 recipe-optimizer R1.S1 (`_applyRates` internal notify contradiction): resolved — R1 adds a notification paragraph cross-referencing rate-solver-verification R2; `optimizeRecipes` notifies exactly once as its final step, declared behavior change.
- 🟡 rate-solver R3 (truthy `equal` guard hidden): resolved — R3 spells out the intermediate-part rule verbatim including the truthy guard (`equal: 0` NOT skipped) and scopes the `!== undefined` fix to `verify.ts` only; new scenario R3.S3 covers `{ equal: 0 }`, `{ min: 5 }`, `{ equal: 10 }` cases, matching factory.ts:1187-1194.
- 🟡 rate-solver R3 (direct `min = 0` overwrite of stricter mins): resolved — same paragraph states direct assignment overwrites an existing stricter `min` (factory-constraint `min: 5` → `min: 0`), verified by R3.S3.
- 🟡 recipe-optimizer R2 (missing supply `{ min: 0 }` merge): resolved — supply-overlay bullet now includes `mergeConstraint` of `{ min: 0 }` onto each overlaid part's constraint, matching factory.ts:464/476.
- 🔵 recipe-optimizer R2 (gap-fill threshold): resolved — targets bullet states maximize targets add unconditionally, fixed targets only when `outputRate > RATE_EPSILON`, matching factory.ts:353-355.
- 🔵 recipe-optimizer R2 (dropped zero/undefined-rate targets): resolved — targets bullet states a declared target with `maximize` false and `rate` undefined or ≤ 0 is silently dropped, matching factory.ts:793-797.
- 🔵 SolverError/ConstraintViolation home unpinned: resolved — `app/models/solver/errors.ts` named in recipe-optimizer R4, rate-solver-verification R1, and the proposal.
- 🔵 factory-metrics R2 (phantom recursion guard): resolved — R2 states the function does not recurse, nested factories contribute via precomputed `footprintAreaPerInstance`, and the dead `depth` parameter is dropped in the move.
- 🔵 optimizer-suggestions R2 ("in place" wording): resolved — R2 states `enabledRecipes` is replaced with a filtered copy (array reassigned, config object mutated), matching factory.ts:836-839.
- 🔵 optimizer-suggestions R1 (deny helper export status): resolved — R1 pins the deny-recipes helper as module-internal (not exported).
- 🔵 rate-solver-verification R4 (displayNum ambiguity): resolved — all numerics in all variants use `displayNum`, with the constraint-violation raw-number change declared as a minor display change.

### Findings

- specs/recipe-optimizer/spec.md:R1.S1: 🔵 nit: WHEN says "`solveRecipeSelection` runs against a snapshot" but THEN asserts "exactly one `update()` notification occurs, at the wrapper's final step" — a direct pure-solve call (per R1.S2) produces zero notifications, so the scenario only holds when invoked via `Factory.optimizeRecipes`. Reword WHEN to "`Factory.optimizeRecipes` runs" or split the purity and notification assertions.

## Pass 3 — 2026-07-06

**Source: Implementation note (apply phase)**

**Status: APPROVED** (no change to approval; recording a spec amendment)

### Amendment
`rate-solver-verification` R3 amended during apply: the blanket `!== undefined` min check false-positived on supply-augmented parts — a part with a `_raw_<slug>` sibling constraint carries the raw-supply variable in its LP balance row, which `rateLookup` cannot observe, so every raw-consuming factory flagged `min: 0` as violated (caught by 9 existing tests). R3 now excepts the `min` bound for supply-augmented parts; scenario R3.S4 added; design.md D7 records the finding. The pre-M2 truthy guard had been accidentally load-bearing for this case.
