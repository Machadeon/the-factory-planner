<!-- Append-only. Each review pass adds a new ## Pass N section. Never delete or edit previous passes. -->

## Pass 1 — 2026-07-12

**Source: Reviewer**

**Status: APPROVED**

Reviewed `git diff main` scoped to the four in-scope files (`app/models/factory.ts`, `app/components/ProductionLineComponent.tsx`, `tests/unit/models/factory-mutation-methods.test.ts`, `tests/unit/mutation-contract.test.ts`) against the approved `design.md` and `specs/factory-mutation-methods/spec.md`. Implementation matches design/spec exactly — all five new `Factory` methods (`splitRecipeRates`, `rejectLine`, `rejectAssembly`, `rejectLineChoice`, `rejectAssemblyChoice`) are byte-for-byte the code shown in design.md's Decision 1/2/3 snippets. Verified specific claims directly:

- `factory.ts:22-25` import block extended in one edit (`applyRejectChoice`, `applyRejectSilent`, `lineRecipeSlugs` added to the existing `from "./suggestions"` statement) — no duplicate import statement, matches tasks 2.2's instruction exactly.
- `rejectAssembly(recipe: AnyRecipe)` / `rejectAssemblyChoice(recipe, choice)` correctly omit `pl` — matches the corrected R5.S9/S10 signatures and Decision 2's semantic justification.
- Ordering constraint (R5.S9/S10's "recompute completes before deletion" clause) verified in the actual diff: `rejectLine()` → `factory.rejectLine(productionLine); props.onDeleteClicked();`, `rejectAssembly()` → `factory.rejectAssembly(recipe); removeAssemblyLine(recipe);`, and both `onRejectChoice()` branches preserve the same next-statement position for the deletion call. No reordering occurred.
- Component cleanup is complete: old inline `const slugs = recipe.isFactoryRecipe ? [] : [recipe.slug];` locals removed from both `rejectAssembly()` and `onRejectChoice()`'s assembly branch (slug computation moved into the `Factory` methods, per design); unused imports (`applyRejectChoice`, `applyRejectSilent`, `lineRecipeSlugs`) removed from the component, `shouldPromptReject` correctly retained (still called directly, it's a read not a mutation). Grepped for leftover references — none found.
- `ProductionLine.splitRecipeRates()` correctly left in place in `production-line.ts` (not deleted), now reachable only through `Factory.splitRecipeRates` — matches Decision 1's stated trade-off exactly.
- Regression tests use concrete state assertions (`factory.rateLookup["iron-ingot"].productionRate`, `factory.optimizer.enabledRecipes`, `factory.optimizer.rejectPrompt`) as the load-bearing checks, with `_updateRates` spies only as a secondary signal — matches Decision 4's stated approach, not the weaker spy-only pattern flagged in design-review Pass 1.
- R5.S7 test correctly uses `assemblyLine.getPartProductionRate()` rather than raw `.rate` for the production-rate assertion, per AGENTS.md's domain-model convention.
- R5.S9's 2×2 matrix (rejectLine/rejectAssembly × always/ask) and R5.S10's 4-value + partial-cross-check coverage are both present exactly as tasks.md specified — verified `askFactory`/`askAssemblyFactory` cases correctly rely on the default `rejectPrompt: "ask"` (confirmed in `optimizer-config.ts:98`) to exercise the non-"always" branch, and `denyRecipes`'s filter-based removal (`optimizer-config.ts`/`suggestions.ts:43-45`) matches the `not.toContain`/`toEqual(enabledBefore)` assertions used.
- Widened `tests/unit/mutation-contract.test.ts` regexes (`R4.S3`, `R4.S4`) are literal token bans exactly as designed, scoped to `app/components`/`app/hooks` via the existing `globs`, which excludes `app/models` — confirmed the new `Factory` methods calling `applyRejectSilent(`/`applyRejectChoice(` internally do not self-trigger the ban.

No bugs, regressions, dead code, or missed cleanup found in the diff.

### Findings
(none)
