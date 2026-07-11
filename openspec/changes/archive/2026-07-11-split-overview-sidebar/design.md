## Context

`FactoryOverviewComponent.tsx` (343 lines) renders six sections of the factory overview sidebar from a single file, with an inline `deriveConsumers`-equivalent computation duplicated against `app/components/logistics/graph-model.ts`'s exported `deriveConsumers`. This is Phase 4 item 4 of `plans/component-refactor.md`'s target architecture (§3 `overview/` directory). Phases 1–3 (UI primitives, hooks, `FactoryContext`/`LibraryContext`/`NavigationContext`) and model M1 (`assembly-line.ts`) have already landed, so `OverviewSidebar` and its sections can read factory/library/navigation state from context exactly as `FactoryOverviewComponent` does today (`useFactory`, `useFactoryUpdateSubscription`, `useLibraryContext`, `useNavigation`).

## Goals / Non-Goals

**Goals:**
- One file, one purpose for each of the six overview sections.
- Single implementation of `deriveConsumers`, shared by the logistics graph and the overview.
- Single implementation of the power-consumption row, shared by the overview and `AssemblyLineControls`.
- Zero behavior change: same DOM output, same rate math, same aria-labels/testids.

**Non-Goals:**
- No valtio/context changes — this phase only consumes existing seams.
- No change to `logistics/graph-model.ts`'s node/edge construction beyond swapping its `deriveConsumers` export for an import.
- No visual redesign.
- Power Shards / Somersloop total rows are NOT folded into `PowerSummary` — proposal and specs scope `PowerSummary` to the power-consumption row only (see spec `overview-sidebar-structure` R3).

## Decisions

**1. `consumer-links.ts` lives in `app/models/`, not `app/components/logistics/`.**
It's pure derivation logic over `Factory`/`StorageLibrary` with zero rendering, matching the convention of other `app/models/*.ts` service files (`factory-metrics.ts`). `graph-model.ts` already imports models from `../../models/*`; making it import `deriveConsumers` from `../../models/consumer-links` instead of defining it locally is a straight cut-and-paste-import move, no behavior change. Alternative considered: keep it in `logistics/` since that's `deriveConsumers`'s current home — rejected because the overview section importing from `logistics/` would be a backwards layering (UI section reaching into a sibling feature's implementation detail rather than a shared model).

**2. Extraction order: models first, then leaf sections, then the composition root, then the cross-file `PowerSummary` swap.**
1. Create `app/models/consumer-links.ts` with `deriveConsumers` moved verbatim from `graph-model.ts`. Update `graph-model.ts` to import it. Run unit tests for `logistics/` — must stay green with zero code change to its own logic.
2. Create `app/components/overview/PartRateSummary.tsx` (move, no logic change) and update its one caller.
3. Create each leaf section (`OutputsSection`, `InputsSection`, `IntermediatesSection`, `SuppliersSection`) by lifting the corresponding JSX block out of `FactoryOverviewComponent.tsx` verbatim, wiring each to `useFactorySnapshot`/`useLibraryContext`/`useNavigation` directly (same context reads the parent used) rather than threading props. `SuppliersSection` additionally calls `useFactory()` for its one write site (`factory.removeSupplier(...)`). Create `ConsumersSection` the same way EXCEPT its `consumersByPartSlug` memo body is not verbatim — per Decision 4, the memo's inline consumer-derivation loop is replaced with a call to the hoisted `deriveConsumers` from `app/models/consumer-links.ts` (created in step 1); the JSX rendering the allocation bars is verbatim.
4. Create `app/components/overview/PowerSummary.tsx` (the avg/min-max row from `FactoryOverviewComponent`'s Power & Modules block). Wire it into the new `OverviewSidebar`'s Power & Modules block (Shards/Somersloop rows stay inline there) and into `AssemblyLineControls.tsx` (replacing its inline block, lines 179-200).
5. Create `app/components/overview/OverviewSidebar.tsx` composing the five sections plus the Power & Modules block, in the original order.
6. Update `app/components/factory/FactorySidebar.tsx` to import `OverviewSidebar`, drop the `onRebuild` prop; update `app/components/factory/FactoryPage.tsx` to drop the `onRebuild={session.rebuild}` call.
7. Delete `app/components/FactoryOverviewComponent.tsx`.
8. Rename `tests/integration/FactoryOverviewComponent.test.tsx` → `tests/integration/overview/OverviewSidebar.test.tsx`, updating its render target; add `tests/unit/models/consumer-links.test.ts`.

This order keeps every intermediate commit buildable and testable — each step either moves code with a single updated import, or adds a new file wired into the still-existing parent, until the final swap-and-delete step.

**3. Sections read context directly; no new prop interfaces.**
Every section (`OutputsSection`, `ConsumersSection`, etc.) takes no props — each calls `useFactorySnapshot()`/`useLibraryContext()`/`useNavigation()` itself, mirroring how `FactoryOverviewComponent` already reads all its state from context rather than props. No `XxxSectionProps` interfaces are scaffolded for these zero-prop components (no unused/empty interface left out of habit). Alternative considered: pass `factory`/`consumersByPartSlug` etc. as props from `OverviewSidebar` — rejected as unnecessary prop-plumbing for a single-level parent→child relationship where context is already the established pattern (AGENTS.md's contexts section exists precisely to avoid this).

**Reactivity wiring (resolves design-review Pass 1's `useFactory()` finding):** `OverviewSidebar` is the single subtree-level subscriber — it calls `useFactoryUpdateSubscription()` once at its root, matching today's `FactoryOverviewComponent`. This differs slightly from `PlanningSection`/`LogisticsSection`/`OptimizationSection`, which each pair `useFactory()` (mutable proxy) with `useFactoryUpdateSubscription()` at their own root and pass the proxy down; this design instead has leaf sections call `useFactorySnapshot()` directly for their own reads, the alternative pattern `FactoryContext.tsx`'s own comment explicitly sanctions ("Leaf-level scoping uses `useSnapshot(subObject)` directly instead"). `OverviewSidebar`'s root-level `useFactoryUpdateSubscription()` call is not made redundant by the leaves' own snapshot reads: it subscribes specifically to `rateLookup`, guaranteeing the whole overview subtree re-renders on any rate-affecting mutation (including ones a given leaf's own snapshot fields might not directly touch, e.g. a sibling's assembly-line edit changing this leaf's displayed rate), while each leaf's `useFactorySnapshot()` scopes *which* of its own fields trigger that leaf's re-render once the subtree is already re-rendering. `SuppliersSection` additionally calls `useFactory()` for its one write site (`factory.removeSupplier(...)`), which needs the mutable proxy, not a frozen snapshot — mirroring `AssemblyLineControls`'s existing pattern of taking the proxy for writes.

**4. `ConsumersSection` keeps its own `useMemo` for `consumersByPartSlug`.**
The memo (keyed on `library`, `currentFactoryId`, and an `outputSlugKey` signature) stays local to `ConsumersSection` since it's the only consumer of that derived value; it now calls the hoisted `deriveConsumers` from `app/models/consumer-links.ts` inside the memo body instead of the inline loop.

**5. Testability trade-off: five section files each need the same provider wrapper `FactoryOverviewComponent` needed once.**
Splitting into `OutputsSection`/`ConsumersSection`/`InputsSection`/`IntermediatesSection`/`SuppliersSection` means any integration test that renders one leaf directly (rather than through `OverviewSidebar`) must still wrap it in `FactoryProvider`/`LibraryProvider`/`NavigationProvider` — the same setup cost `FactoryOverviewComponent.test.tsx` already pays once, now potentially paid per file. This phase does not add per-section test files (spec `overview-sidebar-structure` R4.S1 only renames the one existing integration test to render `OverviewSidebar`, exercising all five sections through the composition root); a shared test-provider wrapper helper is out of scope here and left for whichever future test adds per-section coverage.

**6. `PowerSummary` renders no wrapping box of its own.**
`PowerSummary` returns a React fragment containing an `Icon` plus one or two `<span>` text elements (matching today's DOM: single span when not variable, two spans when variable) — it does not render an outer `<div>`. This lets it drop into `AssemblyLineControls`'s `flex flex-row gap-x-1` container (source line 184) and the overview's `flex flex-row items-center gap-x-2 mb-1` container (source line 226) unchanged: each call site's own flex/gap styling continues to apply directly to `PowerSummary`'s children, since there's no extra box between them.

## Risks / Trade-offs

- **[Risk]** Six-way file split increases surface for import-path mistakes (e.g. an old `../FactoryOverviewComponent` import surviving somewhere). → **Mitigation**: `grep -rn "FactoryOverviewComponent"` across `app/` and `tests/` as a final check before deleting the old file (step 7 only runs after this returns clean).
- **[Risk]** `PowerSummary` extraction touches `AssemblyLineControls.tsx`, a file outside this phase's primary target — risk of accidentally changing its layout (it's a `280px` fixed-width sidebar column, denser than the overview's block). → **Mitigation**: `PowerSummary` takes only `{ power: { avg, min, max } }`-shaped data and renders just the `Icon` + text row; surrounding layout (flex container, gaps) stays owned by each call site, unchanged from today's structure.
- **[Risk]** Moving `deriveConsumers` could silently change `graph-model.ts`'s behavior if the moved function isn't byte-identical. → **Mitigation**: step 1 is a pure cut (no edits) plus an import swap; existing `logistics/` tests (if any reference `deriveConsumers`) gate this step before proceeding.

## Migration Plan

Single-PR, in-repo refactor delivered as one commit per step (steps 1–8 above), landing as one PR. Per-step commits give the implementer a bisectable trail during development (each step's own test run gates moving to the next), but the *merge* is a single PR — there is no partial-rollout or partial-revert of a merged PR; a post-merge issue is fixed forward or the whole PR is reverted with `git revert <merge-commit>`, not reverted step-by-step. No feature flag or staged rollout: this is an internal-tool structural refactor with no user-facing behavior change (per the R4/R3 behavior-freeze requirements), so `npm run test:run` + `npm run test:e2e` + `npm run build` passing pre-merge is the deploy gate. The reactivity wiring in Decision 3 (single `useFactoryUpdateSubscription()` at `OverviewSidebar`, `useFactorySnapshot()` in leaves) is the one area where a subtle regression (stale render on a mutation a leaf reads but the root's `rateLookup` subscription doesn't cover) could slip past `npm run build` and existing tests, since no current test asserts cross-leaf re-render timing; step 8's `OverviewSidebar.test.tsx` should include at least one assertion that mutating a field a specific leaf reads (e.g. toggling a supplier) re-renders that leaf's output, closing this gap before merge rather than relying on post-merge detection.

## Open Questions

None — proposal and specs (post spec-review Pass 3, APPROVED) fully pin down scope, file boundaries, and the dead `onRebuild` prop-chain removal.
