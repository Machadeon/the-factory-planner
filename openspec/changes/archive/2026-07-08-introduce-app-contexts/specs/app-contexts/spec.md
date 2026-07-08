# app-contexts

React context seams that replace prop drilling of the factory proxy, library state, and navigation callback, and the render-scoping guarantee that follows from pushing `useSnapshot` to the leaves.

## ADDED Requirements

### Requirement: R1 — FactoryContext distributes the stable container proxy
`app/contexts/FactoryContext.tsx` SHALL provide the valtio store container (`proxy({ factory })`) as its context value — the stable ref created once in `useFactorySession`, never the churning nested `store.factory` ref. Two hooks SHALL be exported: `useFactory()` returns the mutable factory proxy (`store.factory`) for writes and model-method calls; `useFactorySnapshot()` returns `useSnapshot(store).factory` for render-time reads. The container shape (`store.factory`) SHALL NOT be exposed to call sites — components use only the two hooks.

#### Scenario: R1.S1 — swap-safe factory identity
- **WHEN** the session swaps the factory (`store.factory = loaded` during load/new/clear)
- **THEN** consumers reading via `useFactorySnapshot()` re-render with the new factory's fields, and no consumer holds a dead reference to the previous proxy

#### Scenario: R1.S2 — reads from snapshot, writes to proxy
- **WHEN** a leaf renders a factory field and later mutates it
- **THEN** the rendered value comes from `useFactorySnapshot()` and the mutation is applied to the proxy returned by `useFactory()` (never to a snapshot)

#### Scenario: R1.S3 — hook used outside a provider
- **WHEN** `useFactory()` or `useFactorySnapshot()` is called with no `FactoryContext.Provider` above it
- **THEN** it throws a clear developer error (fail-fast) rather than returning `undefined` and deferring the crash to a downstream property access

### Requirement: R2 — LibraryContext distributes library state and mutators
`app/contexts/LibraryContext.tsx` SHALL provide, via a `useLibraryContext()` hook: `library` (the current `StorageLibrary`), `currentFactoryId` (`string | null`), and `updatePartPointOverrides` (the one library mutator consumed downstream today, via `OptimizationSection`'s `onUpdateLibrary`). Any additional `useLibrary` mutator MAY be added to the value only when a migrated consumer needs it. Consumers that today receive `library` / `currentFactoryId` / `onUpdateLibrary` as drilled props SHALL read them from this context instead.

#### Scenario: R2.S1 — library consumers read context
- **WHEN** a component that previously received `library` and `currentFactoryId` as props renders
- **THEN** it obtains them from `useLibraryContext()` and no intermediate component forwards them as props

#### Scenario: R2.S2 — null currentFactoryId on fresh load
- **WHEN** no factory has been saved yet and `currentFactoryId` is `null`
- **THEN** `useLibraryContext().currentFactoryId` is `null` and consumers behave exactly as they do today when passed a `null` id prop

### Requirement: R3 — NavigationContext distributes the navigation callback
`app/contexts/NavigationContext.tsx` SHALL provide `{ navigateToFactory }` via a `useNavigation()` hook. Every component that today receives `onNavigateToFactory` as a drilled prop SHALL read it from this context. `logistics/context.ts` SHALL drop `onNavigateToFactory` from `LogisticsCallbacks` (retaining `actualSize`), and logistics nodes SHALL obtain navigation from `useNavigation()`.

#### Scenario: R3.S1 — single navigation seam
- **WHEN** a leaf (planning row or logistics node) triggers navigation to another factory
- **THEN** it calls `useNavigation().navigateToFactory` and no intermediate component declares or forwards `onNavigateToFactory`

#### Scenario: R3.S2 — logistics actualSize preserved
- **WHEN** logistics nodes render at minimum vs actual size
- **THEN** `actualSize` still flows through `LogisticsContext` unchanged and only `onNavigateToFactory` moved to `NavigationContext`

#### Scenario: R3.S3 — navigation target semantics unchanged
- **WHEN** `navigateToFactory` is invoked with an unknown or deleted factory id
- **THEN** the outcome is identical to today's drilled `onNavigateToFactory` (this change only relocates the callback source, it does not alter navigation resolution)

### Requirement: R4 — providers mounted at the composition root
`FactoryPage` SHALL mount `FactoryContext`, `LibraryContext`, and `NavigationContext` providers around its layout. The props named `library`, `currentFactoryId`, and `onNavigateToFactory` SHALL be removed from the props interfaces of these components: `FactorySections`, `FactorySidebar`, `PlanningSection`, `ProductionLineComponent`, `AssemblyLineComponent`, `NestedFactoryRow`, `PartRateSummary`, `FactoryPickerDialog`, `FactoryOverviewComponent`, `OptimizationSection`, `LogisticsSection`, `ProductionTargetsBar`, `RecipeOptimizerPanel`. A prop named `factory` SHALL be removed wherever it refers to the current/top factory (now from `useFactory()`); a `factory` prop that carries a nested or other-library factory (see R7) SHALL remain. All per-instance props (`part`, `assemblyLine`, `productionLine`, `rate`, `forceExpanded`, …) SHALL remain unchanged.

#### Scenario: R4.S1 — drilled props removed
- **WHEN** the props interfaces of the listed components are inspected after the change
- **THEN** none of them declares `library`, `currentFactoryId`, or `onNavigateToFactory`, and the only remaining `factory` props are those carrying a nested/other-library factory per R7

### Requirement: R5 — provider values are referentially stable
Each provider's `value` SHALL be wrapped in `useMemo` keyed on the **reference identity** of its inputs (equality is reference-equality, not deep-equality — `library` is already replaced by-reference by `useLibrary`, `currentFactoryId` is a primitive). The callbacks/mutators carried in provider values (`navigateToFactory` and any library mutator) SHALL be referentially stable (`useCallback` or ref-backed). Consequently, a FactoryPage re-render whose provider inputs keep the same references SHALL produce provider `value`s with unchanged identity, and a context consumer that reads only such a value SHALL NOT re-render.

#### Scenario: R5.S1 — stable value does not fan out
- **WHEN** FactoryPage re-renders while `library`, `currentFactoryId`, and the navigation callback keep the same references
- **THEN** a render-count probe shows each memoized provider value keeps the same identity and a consumer that reads only that context does not re-render

#### Scenario: R5.S2 — content change re-renders consumers
- **WHEN** `library` is replaced by-reference (e.g. after a point-override update)
- **THEN** the `LibraryContext` value identity changes and its consumers re-render, while `FactoryContext` / `NavigationContext` consumers that read neither do not

### Requirement: R6 — render scoping: components re-render only for fields they read
The root version-counter substitute SHALL be removed: `FactoryPage` SHALL NOT subscribe to `factory.rateLookup` as a whole-tree re-render trigger. Instead `FactoryPage` SHALL scope-snapshot only the fields its own JSX renders (`icon`, `solverError`, `productionLines.length`), and each migrated consumer SHALL take its own `useSnapshot` of the factory or the specific sub-object it renders (e.g. `useSnapshot(assemblyLine)`). The normative guarantee is: a component re-renders only when a snapshot field it actually read has changed — NOT that any particular edit re-renders exactly one component (solver recomputation legitimately changes and re-renders every row whose rate changed).

#### Scenario: R6.S1 — unaffected sibling does not re-render
- **WHEN** a user edits a field on one row that the solver leaves other rows' displayed values unchanged (a genuinely local edit)
- **THEN** the edited row re-renders and an unaffected sibling row and unaffected overview sections do not re-render

#### Scenario: R6.S2 — root trigger removed
- **WHEN** the change is complete
- **THEN** `FactoryPage` contains no `useSnapshot(...).factory.rateLookup` whole-tree trigger, and it still re-renders when `productionLines.length`, `solverError`, or `icon` change

#### Scenario: R6.S3 — solver-coupled edit re-renders affected rows (not a regression)
- **WHEN** a user edits a field that reruns the LP solver and changes computed rates on multiple rows
- **THEN** every row whose displayed rate actually changed re-renders (correct), and rows the solver left unchanged do not — the guarantee is field-scoped, never a fixed "one row" count

### Requirement: R7 — useFactory() resolves the nearest-provider factory only
`useFactory()` / `useFactorySnapshot()` SHALL resolve to the factory of the nearest `FactoryContext.Provider` (the current/top factory today). Rendering that operates on a nested factory or another library factory (`NestedFactoryRow`, `PartRateSummary`, `FactoryPickerDialog` candidates) SHALL keep that foreign factory on an explicit prop or local variable and SHALL NOT render it through components that read `useFactory()`. If a nested-factory subtree ever reuses `useFactory()`-reading leaves, it SHALL be wrapped in its own `FactoryContext.Provider` for that nested proxy.

#### Scenario: R7.S1 — foreign factory never inherited implicitly
- **WHEN** a component displays data from a nested or other-library factory
- **THEN** that factory comes from an explicit prop/local value, and no descendant reads the parent factory via `useFactory()` for that foreign data

#### Scenario: R7.S2 — FactoryPickerDialog candidates stay data-only
- **WHEN** `FactoryPickerDialog` lists candidate factories deserialized from the library
- **THEN** each candidate factory is used as local data (outputs check, `onPick` payload) and is never rendered through `useFactory()`-reading leaf components

### Requirement: R8 — behavior freeze and dead-prop removal
This change SHALL NOT alter observable behavior: all aria-labels and `data-testid`s are unchanged, storage keys/formats and URL formats are unchanged, and the full unit, integration, and e2e suites pass with `npm run build` clean and no e2e selector edits. The dead compatibility props on `ProductionTargetsBar` (`library` / `currentFactoryId` passthrough) SHALL be removed.

#### Scenario: R8.S1 — suites green, no selector change
- **WHEN** `npm run test:run` and `npm run test:e2e` run after the change
- **THEN** all tests pass and no e2e selector was modified

#### Scenario: R8.S2 — ProductionTargetsBar dead props gone
- **WHEN** `ProductionTargetsBar` is inspected after the change
- **THEN** it no longer declares `library` or `currentFactoryId` props that it does not use
