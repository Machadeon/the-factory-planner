<!-- Append-only. Each review pass adds a new ## Pass N section. Never delete or edit previous passes. -->

## Pass 1 — 2026-07-10

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass
(leave empty, this is pass 1)

### Findings
[Decision 1] — design never mentions `useFactoryUpdateSubscription()`, which `OptimizationSection.tsx:30` currently calls once to establish the subtree-level re-render subscription documented in `FactoryContext.tsx` ("Subtree-level reactivity for panels that render broadly-derived model data... the optimizer..."); design should state explicitly that the four new components rely on this existing parent-level subscription (React re-render propagation) and don't each need their own, rather than leaving that inference unstated.
[Decision 1 / architecture conflict] — every new component calling `useFactory()` (the mutable proxy) directly for rendering reads is consistent with *every other component in the codebase today* (verified: no component anywhere uses `useFactorySnapshot()`), but it does not match `plans/component-refactor.md`'s own stated target convention ("Components call `useSnapshot(factory)` for anything they render... Reads-from-snapshot, writes-to-proxy is the single convention to enforce in review"). Design.md should acknowledge it is knowingly preserving today's pre-Phase-3-completion pattern rather than silently doing so — the plan flags snapshot-scoping as arriving "as Phases 3–4 push `useSnapshot` down the tree," and this change is itself one of the Phase 4 items, so a reviewer could reasonably ask why this split doesn't adopt per-component `useSnapshot` now that the components are small enough to scope it.
[Decision 2] — "Four tiny (2-statement) local closures" undercounts the actual duplication: `commit`/`update` plus the effectively-duplicated field-specific setters (e.g. `addAvailablePart`/`updateAvailablePartRate`/`removeAvailablePart` all calling `update()`) will be re-declared per component that needs them; design only justifies the `commit`/`update` pair, not the full set of handler functions each of the four files will locally redeclare, several of which (e.g. `update`) are identical closures repeated verbatim across files.
[Risks/Trade-offs] — no rollback consideration beyond "git revert the merge commit"; doesn't address the case where the PR lands in multiple incremental commits before merge (per the 6-step extraction order in Decisions) and something in steps 3-5 needs reverting independently mid-flight, e.g. if `AvailablePartsEditor.tsx` ships with a bug caught after `OptimizerRecipeFilters.tsx` has already landed on top of it.
[Migration Plan] — "no runtime state depends on file layout" is true for the file split itself, but doesn't address whether any e2e test golden files, coverage thresholds, or CI path-based caching keys reference the old `RecipeOptimizerPanel.tsx` path (only source-in-app and one unit test's hardcoded string were checked per the design's own risk note — CI config wasn't).
[Decision 3] — asserts "no state is shared across the four new components" but `showPointValues` (kept in `OptimizerPanel`) gates rendering of `PointValuesPanel`, which needs `factory`/`library`/`updatePartPointOverrides` passed as props from `OptimizerPanel` (per current `PointValuesPanel.tsx` signature, confirmed unchanged) — this is prop-passing from a parent into a moved-but-not-split child, which is a form of the "prop drilling" Decision 1 says the split avoids; not called out as an exception.

## Pass 2 — 2026-07-10

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass
[Decision 1 — missing `useFactoryUpdateSubscription()` mention] — new "Re-render mechanism (unchanged)" paragraph in Decision 1 explicitly names `useFactoryUpdateSubscription()` and confirms `OptimizationSection.tsx` (unchanged) is the sole caller the four new components continue to depend on. Verified against `OptimizationSection.tsx:30` — matches.
[Decision 1 — architecture conflict with plan's snapshot-scoping convention] — same paragraph now explicitly states this design "knowingly preserves the pre-`useSnapshot`-scoping pattern," citing AGENTS.md's "no mixed changes" rule and the plan's own phased rollout of `useSnapshot` scoping as ongoing work rather than a per-split requirement. This is a reasonable, well-cited justification, not just an acknowledgment.
[Decision 2 — undercounted duplication] — Decision 2 now separates the `commit`/`update` pair (genuinely duplicated, ~4 lines ×4) from field-specific setters (relocated, not duplicated, each owned by exactly one component) — a more precise and accurate claim than the original blanket "four tiny closures" framing.
[Risks — no mid-extraction rollback plan] — new risk entry addresses steps 3-5 specifically, correctly reasoning that steps 1-4 are additive/independent (no later step edits an earlier step's file) so any intermediate commit reverts in isolation; only step 6 is order-dependent and is itself a single small commit.
[Migration Plan — CI/config references unchecked] — Migration Plan now states a repo-wide grep of `.github/` and `*.yml`/`*.yaml`/`*.json` was run with no hits beyond the two already-tracked references. Independently re-ran the same grep — confirms no hits.
[Decision 3 — unacknowledged prop-passing to PointValuesPanel] — both Decision 1 and Decision 3 now explicitly name `PointValuesPanel`'s prop-based signature as a deliberate, carried-over exception, not new prop drilling.

### Findings
None.
