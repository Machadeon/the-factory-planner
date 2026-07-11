## Context

`RecipeOptimizerPanel.tsx` (611 lines) is the last unsplit "big four" component still living as a single file (Phase 4c of `plans/component-refactor.md`). Its dependencies are all already in place: `FactoryContext`/`LibraryContext` (Phase 3), `ui/` primitives (`ActionRow`, `AddItemControl`, `IconButton`, `Icon`, `HorizontalDivider`, `TextCalculatorField`), and `app/models/optimizer-config.ts` (model change M2), which already owns `RecipeOptimizerConfig`, `recipeMatchesFilters`, and `setRecipesEnabled`. The panel currently reads `factory.optimizer` and `library`/`currentFactoryId` directly via `useFactory()`/`useLibraryContext()` — there is no prop drilling into it (`OptimizationSection.tsx` renders it with no props), so the split does not need to solve a prop-threading problem, only a decomposition-and-placement one.

## Goals / Non-Goals

**Goals:**
- Decompose the single file into the four components + two moved files named in the proposal, each in `app/components/optimization/`.
- Extract `updatePhase`/`toggleCategory`/`toggleBuilding` into pure, independently-testable functions on `optimizer-config.ts`.
- Preserve every observable behavior: DOM per section, aria-labels/testids, config-mutation semantics (`factory.optimizer = next; factory.update()`).

**Non-Goals:**
- No new UI primitive, no new context, no new dependency.
- No change to `RecipeOptimizerConfig`'s shape or the solver.
- No `targets`/goal-rate editor — out of scope per spec R3 (doesn't exist in the current panel).
- No cross-file abstraction beyond what's named in the proposal (see Decisions below on why the `commit`/`update` closures are *not* centralized).

## Decisions

**1. Each new component reads context directly; no prop drilling introduced.**
`OptimizerPanel`, `OptimizerRecipeFilters`, `AvailablePartsEditor`, and `SourceFactoriesEditor` each call `useFactory()` (and `useLibraryContext()` where needed — only `SourceFactoriesEditor` and the `PointValuesPanel` mount need `library`/`currentFactoryId`) instead of receiving `factory`/`config` as props. Alternative considered: pass `config` and a single `commit` callback down from `OptimizerPanel` as props. Rejected — it reintroduces exactly the prop-threading pattern Phase 3 eliminated, for no benefit, since every one of these components is only ever mounted in this one tree position.

One exception: `PointValuesPanel` (moved, unchanged) keeps its existing signature — it receives `factory`/`library`/`onUpdateLibrary` as props from `OptimizerPanel`, exactly as it does from `RecipeOptimizerPanel` today. This is not new prop drilling introduced by the split; it's the pre-existing contract of an unmodified child component, carried over verbatim.

**Re-render mechanism (unchanged):** all four new components read off `useFactory()` — the mutable proxy — for render, not `useFactorySnapshot()`. `FactoryContext.tsx` documents `useFactory()` as "never render off this" in isolation, but `OptimizationSection.tsx` already calls `useFactoryUpdateSubscription()` once (subscribing to `rateLookup`, which every `factory.update()` rebuilds) to force the entire optimizer subtree to re-render on any model change. That call is outside the scope of this split (it lives in the unchanged parent) and the four new components continue to depend on it, exactly as the single `RecipeOptimizerPanel` does today — no new subscription is added or removed.

This knowingly preserves the pre-`useSnapshot`-scoping pattern rather than adopting per-component `useSnapshot(factory)` now that the sections are small enough to scope individually. Per-component snapshot scoping is a render-scoping *behavior* change (observable via the render-count tests Phase 3 introduced) and `plans/component-refactor.md` explicitly assigns that migration to "Phases 3–4 push `useSnapshot` down the tree" as ongoing work, not a one-shot requirement of every Phase 4 split. Folding it into this change would violate the project's "no mixed changes" rule (AGENTS.md: "a refactor commit never alters behavior") by combining a pure file-decomposition with a reactivity-scoping change in one PR. Adopting `useSnapshot` per-section here is a reasonable follow-up but is out of scope for this change.

**2. `commit`/`update` config-write helpers, and each component's own field-specific setters, stay local — not centralized.**
Each of the four components needs its own `commit(next)` = `factory.optimizer = next; factory.update()` and `update(patch)` = `commit({...factory.optimizer, ...patch})`, plus whatever field-specific setters it uses those for (e.g. `AvailablePartsEditor` keeps `addAvailablePart`/`updateAvailablePartRate`/`updateAvailablePartHardLimit`/`removeAvailablePart`, each a one-line call into its own local `update`; `SourceFactoriesEditor` keeps `addSourceFactory`/`removeSourceFactory` the same way). The duplicated surface is larger than just the two-statement `commit`/`update` pair — every component re-declares its own copy of the identical `commit`/`update` closures (verbatim, ~4 lines total), plus its own field-specific setters (which are *not* duplicated across files — each setter is only ever needed in the one component that owns that slice of the config, e.g. `addAvailablePart` exists only in `AvailablePartsEditor`). So the real duplication is narrowly the `commit`/`update` pair, repeated 4 times; the field-specific setters are not duplicated, just relocated.

Alternative considered: add `commitOptimizerConfig(factory, next)` / `updateOptimizerConfig(factory, patch)` to `optimizer-config.ts`. Rejected for two reasons: (a) `optimizer-config.ts` is constrained to not import `Factory` (established by model change M2's spec), and typing the parameter structurally (`{ optimizer: RecipeOptimizerConfig; update(): void }`) to route around that would be a workaround for saving ~4 lines ×4 files; (b) the approved spec (R1) only scopes `updatePhase`/`toggleCategory`/`toggleBuilding` as new `optimizer-config.ts` exports — adding more exports now would exceed reviewed scope. Four tiny (2-statement) local closures is the "three similar lines" case the project's anti-premature-abstraction guidance calls out directly.

**3. Local UI state is colocated with the JSX that reads it, not lifted.**
`showPointValues` (toggles the point-values panel next to the objective radio group) stays in `OptimizerPanel`. `showRecipeList` (toggles the "manage recipes" reveal) moves into `OptimizerRecipeFilters`, since that's the only place it's read. `sourceFactories`/`factoryOptions` memos move into `SourceFactoriesEditor`; `partExclusions` moves into `AvailablePartsEditor`. No *state* is shared across the four new components. The one exception is data, not state: `showPointValues` gates whether `OptimizerPanel` mounts the moved-unchanged `PointValuesPanel`, which — per Decision 1's exception note — still takes `factory`/`library`/`onUpdateLibrary` as props from `OptimizerPanel`, since it isn't being split or converted to read context. That single prop hand-off is the only cross-component data passing in this design; nothing else is lifted or shared.

**4. Building-grouping derivation moves to `OptimizerRecipeFilters.tsx` as module-level consts.**
`recipeBuildings`, `GROUP_ORDER`, `GROUP_LABEL`, `recipeBuildingGroups` are computed once at module load today; they move verbatim to the one file that renders them (per proposal). No behavior change — same eager module-level computation, same values.

**5. `PointValuesPanel.tsx` and `RecipeListPanel.tsx` move via `git mv`, zero logic changes.**
Preserves file history/blame, consistent with how the rest of the refactor plan treats pure relocations (Phase 5 sweep uses the same approach for the final naming pass).

**6. Extraction order: leaves first, composition root last, deletion of the old file only after the new tree is wired.**
1. Add `updatePhase`/`toggleCategory`/`toggleBuilding` + unit tests to `optimizer-config.ts` (no component touched yet — additive, buildable).
2. `git mv` `PointValuesPanel.tsx`/`RecipeListPanel.tsx` into `app/components/optimization/`, fix their own internal imports.
3. Create `AvailablePartsEditor.tsx` and `SourceFactoriesEditor.tsx` by lifting the corresponding JSX + handlers + local memos out of `RecipeOptimizerPanel.tsx` (old file still exists and still works, now importing these two).
4. Create `OptimizerRecipeFilters.tsx`, lifting phase/category/building JSX + the building-grouping consts + `showRecipeList`, wired to the new `optimizer-config.ts` exports.
5. Create `OptimizerPanel.tsx` as the new composition root (run-mode/objective/overwrite + mounts the three sections above); update `OptimizationSection.tsx`'s import.
6. Delete `RecipeOptimizerPanel.tsx`; update `tests/unit/contexts/prop-contract.test.ts`'s `COMPONENTS` entry to the new path.
This keeps the app buildable after every step and isolates the one genuinely risky step (deleting the old file + updating its one call site + the one test that hardcodes its path) to the very end, after everything else is already verified working.

## Risks / Trade-offs

- **[Risk] Missing the prop-contract test's hardcoded path** when deleting the old file → silent test failure at a location easy to overlook. **Mitigation:** `grep -rn "RecipeOptimizerPanel"` across the whole repo (not just `app/`/`tests/`) before deleting — already run once during spec drafting across `app/`, `tests/`, and CI/config files (`.github/`, `*.yml`/`*.yaml`/`*.json`); only `OptimizationSection.tsx` and `prop-contract.test.ts` reference the path, and no CI config or caching key references it. Re-run the same repo-wide grep as the last step before deleting, per tasks.md.
- **[Risk] A bug lands mid-extraction (steps 3-5 of the Decisions ordering) after a later step has already built on it** — e.g. `AvailablePartsEditor.tsx` (step 3) ships a bug that's only caught after `OptimizerRecipeFilters.tsx` (step 4) has landed on top. **Mitigation:** each of the 6 steps is its own commit (per tasks.md), and steps 1-4 are additive/parallel (they don't depend on each other's correctness, only on the old `RecipeOptimizerPanel.tsx` still existing and working) — reverting any single intermediate commit is a plain `git revert <commit>` that doesn't disturb the others, since no later step edits an earlier step's new file. Only step 6 (delete old file + flip the one call site + update the one test) is order-dependent on steps 3-5 being complete, and it's a single small commit, so its own rollback is also a single revert.
- **[Risk] State-colocation mistakes** (e.g. `showRecipeList` ending up in the wrong file) could cause a build error or a dead prop, not a silent behavior change, since TS/lint will catch an unused or undefined reference. **Mitigation:** none needed beyond normal build/lint gates — the failure mode is loud, not silent.
- **[Trade-off] Four small duplicated `commit`/`update` closures** instead of one shared helper (Decision 2). Accepted: the duplicated surface is narrowly the `commit`/`update` pair (~4 lines, repeated 4 times); each component's field-specific setters are relocated, not duplicated. The alternative either violates the `optimizer-config.ts` Factory-import boundary or exceeds the approved spec's scope.
- **[Trade-off] Render-scoping stays coarse (subtree-level via `useFactoryUpdateSubscription()`), not scoped per new component** (see Decision 1's re-render note). Accepted for this change: adopting per-component `useSnapshot` now would mix a behavior change into a pure-refactor commit; deferred to a future Phase 3/4 render-scoping pass per the parent plan.

## Migration Plan

Pure code refactor, no data/schema migration, no feature flag. Deploy is a normal merge to `main` after `npm run test:run`, `npm run test:e2e`, and `npm run build` are green (per AGENTS.md phase gates). Rollback is a plain `git revert` of the merge commit — no runtime state depends on file layout. Checked (during spec drafting) that no CI config, path-based cache key, or golden/snapshot file references the old `app/components/RecipeOptimizerPanel.tsx` path: `grep -rn "RecipeOptimizerPanel"` across `.github/` and all `*.yml`/`*.yaml`/`*.json` in the repo returns nothing beyond the two app/test references already tracked in tasks.md.

## Open Questions

None blocking. (No `targets` editor exists today, so none is added — confirmed by reading `RecipeOptimizerPanel.tsx` in full during proposal drafting.)
