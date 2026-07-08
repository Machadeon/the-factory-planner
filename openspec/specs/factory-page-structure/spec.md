# factory-page-structure

## Purpose

Structural contract for the decomposition: FactoryPage composition root, hooks directory, extracted dialogs/tabs, and behavior-freeze guarantees.
## Requirements
### Requirement: R1 — FactoryPage composition root
`app/components/factory/FactoryPage.tsx` SHALL replace `app/components/FactoryComponent.tsx` (old file deleted, `app/page.tsx` updated). FactoryPage SHALL be ≤150 lines and contain only: hook calls, handler wiring, and layout JSX. No debounce timers, no history API calls, no serialization logic, no id-remapping in the component body. Flow choreography MAY live in a colocated `useFactoryPageFlows` hook, and layout groups MAY be thin passthrough components under `app/components/factory/` (`FactoryPageDialogs`, `FactorySections`, `FactorySidebar`, `LibraryDrawerSlot`), provided child components keep their original prop contracts (R7).

#### Scenario: R1.S1 — replacement complete
- **WHEN** the change is complete
- **THEN** `FactoryComponent.tsx` does not exist, no import of it remains, and `FactoryPage.tsx` is ≤150 lines

### Requirement: R2 — six hooks own the extracted logic
`app/hooks/` SHALL contain `useConsentGate`, `useAutosave`, `useLibrary`, `useDragResize`, `useFactorySession`, and `useFactoryUrlSync`, each independently usable and unit-tested via `renderHook`. (Commit granularity is a tasks.md concern, not a spec requirement.)

#### Scenario: R2.S1 — hooks exist and are tested
- **WHEN** `tests/unit/hooks/` (or equivalent) runs
- **THEN** every hook has at least one renderHook-based test exercising its core behavior

### Requirement: R3 — useLibrary owns library state and persistence pairing
`useLibrary` SHALL own the `StorageLibrary` React state and provide mutators that pair state update with `saveLibrary` persistence (today's call sites: consent-allow reload, drawer open reload, popstate reload, save flows, import merges, global point-override update). Direct `setLibrary`+`saveLibrary` pairs SHALL NOT be hand-rolled in FactoryPage.

#### Scenario: R3.S1 — point-override update through hook
- **WHEN** global part-point overrides are updated
- **THEN** the library state updates and persists via a single `useLibrary` mutator call

### Requirement: R4 — useDragResize preserves sidebar behavior
`useDragResize` SHALL own the sidebar divider drag: width clamped to [200, 700], live updates during drag, width persisted (`setSidebarWidth` storage) once on mouseup, initial width read from storage on mount.

#### Scenario: R4.S1 — clamp and persist
- **WHEN** a drag would take the width to 900
- **THEN** the width clamps to 700 and is persisted exactly once when the mouse is released

### Requirement: R5 — FactoryJsonDialog extracted
The factory-JSON dialog SHALL be its own component `app/components/factory/FactoryJsonDialog.tsx` receiving the serialized factory (or a builder), rendering the pretty-printed JSON with the copy-to-clipboard button, preserving current behavior.

#### Scenario: R5.S1 — dialog behavior preserved
- **WHEN** the user opens the JSON view and clicks copy
- **THEN** the serialized factory JSON is displayed and copied, as today

### Requirement: R6 — SectionTabs extracted
The section tab bar plus the solver-error alert SHALL be extracted to `app/components/factory/SectionTabs.tsx` with the same tab labels/values and the same `formatSolverError` alert rendering.

#### Scenario: R6.S1 — tabs and alert preserved
- **WHEN** a solver error exists and the tabs render
- **THEN** the warning alert shows the formatted error and the three tabs behave as today

### Requirement: R7 — behavior freeze
This change SHALL NOT alter observable behavior: all aria-labels and `data-testid`s are unchanged; storage keys/formats and URL formats are unchanged; the full unit, integration, and e2e suites pass; `npm run build` is clean. Child component **prop contracts MAY change only** by removing the four drilled values (`factory`, `library`, `currentFactoryId`, `onNavigateToFactory`) in favor of the `app-contexts` seams (`FactoryContext`, `LibraryContext`, `NavigationContext`); all other props and all observable behavior remain frozen. No new runtime dependency is added (`valtio` is already present from the prior decompose-factory-page change).

#### Scenario: R7.S1 — suites green
- **WHEN** `npm run test:run` and `npm run test:e2e` run after the change
- **THEN** all tests pass without modifying any e2e selector

#### Scenario: R7.S2 — snapshot spike coverage
- **WHEN** class-method reads (`getMachineCount`, `getPartProductionRate`) are exercised through a valtio snapshot in a unit test
- **THEN** they return the same values as direct proxy reads (guards the snapshot-vs-class-instance risk)

#### Scenario: R7.S3 — prop-contract relaxation is scoped
- **WHEN** a child component's props interface is compared before and after this change
- **THEN** the only removed props are `factory`, `library`, `currentFactoryId`, and/or `onNavigateToFactory` (now sourced from context), and every per-instance prop (`part`, `assemblyLine`, `productionLine`, `rate`, …) is unchanged
