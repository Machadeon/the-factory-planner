<!-- Append-only. Each review pass adds a new ## Pass N section. Never delete or edit previous passes. -->

## Pass 1 — 2026-07-11

**Source: Reviewer**
**Status: APPROVED**

### Resolved from Previous Pass
(first pass)

### Findings

app/components/optimization/OptimizerRecipeFilters.tsx:97,110,119,132,159 (as originally written): 🔴 bug (fixed before this pass closed): phase/category/building `onChange` handlers passed the render-captured `config` const into `updatePhase`/`toggleCategory`/`toggleBuilding` instead of reading `factory.optimizer` fresh at call time. The original `RecipeOptimizerPanel.tsx` deliberately read `factory.optimizer` fresh inside each of these three mutators (not the outer `config`) to avoid operating on a stale snapshot across rapid successive calls within the same render. Fix applied: all five call sites now pass `factory.optimizer` instead of `config` to the three cascade functions. Re-ran `npm run test:run` (511 passed) and the optimizer-facing e2e specs (`configure-auto-fill.spec.ts`, `no-substantive-modals.spec.ts`, `custom-point-values/*`, 8/8 passed) after the fix — no regressions.

No other CRITICAL/HIGH findings. Checked: import correctness across all 6 new/moved files, `commit`/`update` duplication (matches design Decision 2, intentional), `AvailablePartsEditor`/`SourceFactoriesEditor` read `config.*` (render-captured) for their patch values the same way the original file did — pre-existing pattern, not a regression, out of scope for this pure-refactor change to alter. `npm run build`, `npm run lint-fix`, full `test:run` (511 passed) and full `test:e2e` (93 passed, 1 pre-existing skip) all green after the fix.

MED/LOW (left open, not blocking):
- tests/unit/models/optimizer-config.test.ts: describe blocks reuse requirement IDs like "(R1.S1)" for two different capability specs in the same file (the pre-existing `optimizer-config` capability from `split-factory-god-class` and the new `optimizer-panel-structure` capability from this change) — labeled distinctly as "(optimizer-panel-structure R1.S1)" etc. to disambiguate, but a reader skimming test names could still momentarily conflate them with the file's earlier "(R1.S1)"-style labels. No action needed now; worth a naming convention note if this pattern recurs in future specs.
