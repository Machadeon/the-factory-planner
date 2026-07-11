<!-- Append-only. Each review pass adds a new ## Pass N section. Never delete or edit previous passes. -->

## Pass 1 — 2026-07-10

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass
(leave empty, this is pass 1)

### Findings
[R1] — `updatePhase(config)` signature stated in R1 conflicts with R2's `updatePhase(config, phase)`; pick one, current code's closure form is `updatePhase(phase)` reading `factory.optimizer` implicitly, so both are already a departure worth spelling out precisely.
[R3] — `tests/unit/contexts/prop-contract.test.ts:56` hardcodes `app/components/RecipeOptimizerPanel.tsx` in its `COMPONENTS` list and reads the file directly; R3 deletes that file, so this test breaks. R4.S1 claims "existing e2e and integration coverage... pass unmodified" but this is a unit test, not covered by that scenario's wording, and no requirement here authorizes updating it — scope gap.
[R4.S1] — "pass unmodified" is only checked against e2e/integration by scenario wording; leaves the prop-contract unit test (see above) in an undefined bucket — neither explicitly in-scope to fix nor explicitly frozen.
[R3] — "one exported component per file" is asserted for the four new files but no scenario checks that `PointValuesPanel.tsx`/`RecipeListPanel.tsx`, which the proposal says are "moved... unchanged," actually land in `app/components/optimization/`; spec is silent on the move even though proposal impact section lists it as a file change. Untested requirement gap.
[R1] — "No definition of this cascade logic SHALL remain inline in any component file" (R1.S2) is checked by "app/components/ is searched" with no defined search method (grep for what pattern, AST match?) — vague/untestable as worded; a reviewer could reasonably disagree on what counts as "the cascade logic" vs. incidental similar code.
[R2] — R2's building-enable example (R2.S3) says "category master toggle... is off" implies the recipe wouldn't currently be in enabledRecipes, but doesn't state what happens if the building recipe fails the *phase* filter instead of category — scenario coverage is category-only when the prose covers phase/building/ore-conversion symmetrically; asymmetric scenario depth.
[R3] — Scope check: `AvailablePartsEditor.tsx` and `SourceFactoriesEditor.tsx` behavior boundaries (e.g. what happens to `Target`/goal-rate editing, since `Target` interface exists in optimizer-config.ts but isn't mentioned in R3's component list) are unaddressed — unclear if targets UI lives in one of the four named components or is missing from the split entirely.

## Pass 2 — 2026-07-10

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass
[R1 signature conflict] — R1 and R2 both now use `updatePhase(config, phase)`; R1 adds an explicit note that this replaces the old closure form (`updatePhase(phase)` reading `factory.optimizer`/calling `commit()`), matching what the current code actually does. Verified against `RecipeOptimizerPanel.tsx:135`.
[R3 missing test for RecipeOptimizerPanel.tsx deletion] — new Requirement R5 targets `tests/unit/contexts/prop-contract.test.ts:56` by name, requires the hardcoded path updated to `app/components/optimization/OptimizerPanel.tsx`, with scenario R5.S1. Verified the test's `baseName()`/`propsInterface()` helpers derive the component name from the path, so pointing at the new path is mechanically correct and the assertion still holds (OptimizerPanel won't declare the drilled props).
[R4.S1 undefined bucket for prop-contract test] — no longer undefined; R5 explicitly owns it, separate from R4's e2e/integration scope.
[R3 missing PointValuesPanel/RecipeListPanel move] — R3 now explicitly requires both files move to `app/components/optimization/`, with R3.S1 updated to check both new and old paths.
[R1.S2 vague search method] — narrowed to a concrete check: `OptimizerRecipeFilters.tsx`'s three handlers must call the named imports rather than define local equivalents; no more "search app/components/ for the logic" with undefined matching criteria.
[R2 asymmetric scenario coverage] — new R2.S4 covers building-enable under a failing phase filter, symmetric to R2.S3's category case. Verified against `recipeMatchesFilters` in `app/models/optimizer-config.ts:140-150`, which checks `recipe.unlockPhase > config.phase` — the scenario's premise is accurate to current filter composition.
[R3 targets/goal-rate scope] — R3 now explicitly states `targets` has no UI in the current component and is out of scope for the split; no component is required to add a targets editor.

### Findings
None.
