# factory-page-structure

## MODIFIED Requirements

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
