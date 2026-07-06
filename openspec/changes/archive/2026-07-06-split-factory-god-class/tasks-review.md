## Pass 1 — 2026-07-05

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass
(none — first pass)

### Findings

- L7+L57: 🟡 risk: preamble claims optimizer-config R2–R4 are "covered by porting existing tests in Group 8", and 8.2 ports them "from wherever they live in `factory.test.ts`/`recipe-optimizer.test.ts`" — grep shows zero references to `defaultRecipeOptimizerConfig`/`setRecipesEnabled`/`recipeMatchesFilters`/`isRecipeEnabled` anywhere in `tests/`; there is nothing to port. Add a Group 1 stub `tests/unit/models/optimizer-config.test.ts` (R2.S1 defaults, R3.S1 cascade, R4.S1 filter precedence) and reword 8.2.
- L7: 🔵 nit: preamble also says suggestions R2 / metrics R2 are covered by Group-8 porting, but 1.7/1.8 stub exactly those scenarios (and no existing tests reference those functions either). Drop the false porting claim; the stubs are the coverage.
- L13: 🔵 nit: "recipe-optimizer R1.S3" doesn't exist — spec has only R1.S1/R1.S2; the notify-once contract lives in the R1 body and R1.S1. Fix the reference (same phantom ref appears in design D8; harmless there, but tasks drive implementation).
- L52: 🔵 nit: 7.2 grep gates omit the spec'd import-direction checks — `optimizer-config.ts` and `suggestions.ts` contain no import from `./factory` (optimizer-config R1.S1, suggestions R1.S1) and `factory.ts` does not import `factory-metrics.ts` (metrics R1). Add three greps.
- L30+L47: 🔵 nit: 3.3 flips `solverError` to `SolverError | null` while `optimizeRecipes` still assigns strings (until 4.3) and `FactoryComponent` still renders the raw value (until 6.2) — typecheck and app are red across Groups 3–6. Acceptable inside one change, but note the expected red window (or defer the type flip to 4.3) so an implementer doesn't "fix" it with a shim.

## Pass 2 — 2026-07-05

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass

- 🟡 optimizer-config R2–R4 unstubbed / port-from-nowhere: resolved — new stub 1.9 (`tests/unit/models/optimizer-config.test.ts`) covers R1.S1/R2.S1/R3.S1/R4.S1; run-stubs renumbered to 1.10; 8.2 rewritten from a test-logic port to an orphaned-import sweep, which is accurate given zero existing direct coverage.
- 🔵 preamble false porting claim: resolved — preamble now states grep-verified zero existing direct coverage of the moved config/suggestions/metrics functions, with existing suites positioned as the regression net only.
- 🔵 phantom "recipe-optimizer R1.S3": rebuttal accepted — verified `#### Scenario: R1.S3 Wrapper notifies exactly once` exists at specs/recipe-optimizer/spec.md:20 (added during spec-review pass 2, after this reviewer's cold-read; R1.S1 simultaneously narrowed to "no notification occurs", removing the WHEN/THEN conflation). 1.5's reference is valid; finding withdrawn as stale, not fixed.
- 🔵 missing import-direction greps: resolved — 7.2 now gates no `./factory` import in `optimizer-config.ts`/`suggestions.ts`, no `factory-metrics` import in `factory.ts`, and solver/* type-only imports from factory.ts.
- 🔵 3.3 red-window shim risk: resolved — 3.3 carries an explicit note that typecheck and the Alert render stay red until Groups 4–6 and forbids bridging with a temporary string field or re-export shim.

### Findings

none
