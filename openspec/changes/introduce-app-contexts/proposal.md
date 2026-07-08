## Why

Four values — the valtio `factory` proxy, the `StorageLibrary`, `currentFactoryId`, and `onNavigateToFactory` — are drilled through up to five component levels (`FactoryPage → FactorySections/FactorySidebar → PlanningSection → ProductionLineComponent → AssemblyLineComponent → NestedFactoryRow/PartRateSummary → FactoryPickerDialog`). Every intermediate component restates these in its props interface and forwards them, coupling unrelated layers and forcing the whole subtree to re-render on any change. Phase 3 of `plans/component-refactor.md` replaces the drilling with React contexts and pushes `useSnapshot` down to the leaves, so a single-field edit re-renders one row instead of the page.

## What Changes

- Add `app/contexts/FactoryContext.tsx` distributing the valtio **store container** (`proxy({ factory })`, the stable ref from `useFactorySession` — survives factory swaps without ref churn). Two hooks: `useFactory()` returns the mutable `store.factory` proxy for writes/model-method calls; `useFactorySnapshot()` returns `useSnapshot(store).factory` for render reads. The container shape stays internal to the context module — leaves never touch `store.factory` directly.
- Add `app/contexts/LibraryContext.tsx` distributing `{ library, currentFactoryId }` plus the library mutators already owned by `useLibrary` (e.g. `updatePartPointOverrides`), with a `useLibraryContext()` hook.
- Add `app/contexts/NavigationContext.tsx` distributing `{ navigateToFactory }`, with a `useNavigation()` hook.
- `FactoryPage` mounts the three providers around its layout; `FactorySections`/`FactorySidebar` and every downstream consumer stop declaring and forwarding the four drilled props and read from context instead. Props that genuinely vary per instance (`part`, `assemblyLine`, `productionLine`, `rate`, `forceExpanded`, …) remain props.
- Each migrated consumer takes its own `useSnapshot` of the factory (or of the specific sub-object it renders, e.g. `useSnapshot(assemblyLine)`), and `FactoryPage` drops its root `rateLookup` whole-tree trigger — instead scope-snapshotting only the fields its own JSX renders — so a component re-renders only when a snapshot field it read changed (not "one row per edit": the LP solver's global recompute legitimately re-renders every row whose rate changed).
- Provider `value`s are referentially stable (`useMemo` + stabilized callbacks/mutators) so a `FactoryPage` re-render does not fan out to every context consumer — the render-scoping win this phase exists to deliver.
- `useFactory()` resolves the **nearest** provider's factory (the current/top factory today). Nested-factory and other-library-factory rendering keeps that foreign factory on an explicit prop/local and never renders it through `useFactory()`-reading leaves.
- Remove the dead compatibility props `ProductionTargetsBar` accepts (`library`/`currentFactoryId` passthrough) now that context supplies them where actually needed.
- Align the existing `logistics/context.ts` `onNavigateToFactory` usage with the new `NavigationContext` (single navigation seam).
- Add a render-count integration test proving "edit one rate field" re-renders that row only, not sibling rows or the overview sidebar.

No observable behavior change: aria-labels, `data-testid`s, storage keys/formats, and URL formats are unchanged; unit + integration + e2e suites and `npm run build` stay green.

## Capabilities

### New Capabilities
- `app-contexts`: React context seams (`FactoryContext` distributing the stable store container via a `useFactory()`/`useFactorySnapshot()` hook pair, `LibraryContext`, `NavigationContext`) that distribute the factory proxy, library state + mutators, and the navigation callback; the reads-from-snapshot/writes-to-proxy convention; referentially-stable provider values; nearest-provider factory resolution; and the render-scoping guarantee (a component re-renders only for the snapshot fields it reads, root `rateLookup` trigger removed).

### Modified Capabilities
- `factory-page-structure`: R7's behavior-freeze pins child prop contracts as unchanged. This change intentionally removes the four drilled props (`factory`, `library`, `currentFactoryId`, `onNavigateToFactory`) from intermediate/leaf component contracts in favor of context, so R7 is relaxed to freeze observable behavior (aria/testid/storage/URL/suites) while permitting the context migration of those specific props.

## Impact

- New: `app/contexts/FactoryContext.tsx`, `app/contexts/LibraryContext.tsx`, `app/contexts/NavigationContext.tsx`; a render-count integration test under `tests/integration/`.
- Modified: `FactoryPage`, `FactorySections`, `FactorySidebar`, `PlanningSection`, `ProductionLineComponent`, `AssemblyLineComponent`, `NestedFactoryRow`, `PartRateSummary`, `FactoryPickerDialog`, `FactoryOverviewComponent`, `OptimizationSection`, `LogisticsSection`, `ProductionTargetsBar`, `RecipeOptimizerPanel`, and `logistics/context.ts` / logistics nodes that read navigation.
- No new runtime dependency (`valtio` already present from Phase 2; React context is built-in).
- Contract change: intermediate components no longer accept the four drilled props — a compile-time surface change internal to the app, not a public API.
