# consumer-links

## Purpose

Defines the single shared implementation of `deriveConsumers`: mapping a factory's output parts to the library factories that net-consume them, used by both the logistics graph model and the overview's Consumers section.

## Requirements

### Requirement: R1 — single deriveConsumers implementation
`deriveConsumers` SHALL have exactly one implementation, exported from `app/models/consumer-links.ts`, with signature `deriveConsumers(factory: Factory, opts: { library?: StorageLibrary; currentFactoryId?: string | null }): Map<string, { id: string; name: string; rate: number }[]>`. It lives under `app/models/` because it is pure factory-derivation logic with no rendering concerns, consistent with AGENTS.md's model-layer convention for kebab-case service files exporting related pure functions (e.g. `factory-metrics.ts`). `app/components/logistics/graph-model.ts` and `app/components/overview/ConsumersSection.tsx` SHALL both import it from there rather than each maintaining their own copy. The implementation iterates `factory.allOutputs()` (`Part[]`, keyed by `.slug`).

#### Scenario: R1.S1 — graph-model uses hoisted implementation
- **WHEN** `buildGraphModel` needs `consumersByPart` and none was passed via `opts.consumersByPart`
- **THEN** it calls `deriveConsumers` imported from `app/models/consumer-links.ts`

#### Scenario: R1.S2 — overview uses hoisted implementation
- **WHEN** `ConsumersSection` computes which library factories consume this factory's outputs
- **THEN** it calls the same `deriveConsumers` from `app/models/consumer-links.ts` (no inline re-derivation in the component)

### Requirement: R2 — derivation semantics
`deriveConsumers(factory, { library, currentFactoryId })` SHALL return an empty map when `library` is falsy or `currentFactoryId` is falsy (`null`, `undefined`, or `""`). For each library factory whose `supplierIds` includes `currentFactoryId`, it SHALL deserialize that factory and, for each of the source factory's outputs, include the library factory as a consumer only when its net consumption of that part (`consumptionRate - productionRate`) is strictly greater than `RATE_EPSILON`.

#### Scenario: R2.S1 — falsy library or id
- **WHEN** `deriveConsumers` is called with `library` as `undefined` or `currentFactoryId` as `null`, `undefined`, or `""`
- **THEN** it returns an empty `Map`

#### Scenario: R2.S2 — net consumption boundary
- **WHEN** a candidate consumer factory's net consumption of an output part equals exactly `RATE_EPSILON`
- **THEN** that factory is excluded from the returned list for that part (boundary is exclusive: only `net > RATE_EPSILON` qualifies)

### Requirement: R3 — single-implementation regression guard
The single-implementation claim of R1 SHALL be enforced by an automated structural check, not just behavioral tests, since two functionally-equivalent implementations could coexist without any behavioral test failing.

#### Scenario: R3.S1 — structural check
- **WHEN** `tests/unit/contexts/prop-contract.test.ts` runs
- **THEN** it asserts `app/components/logistics/graph-model.ts` does not define `deriveConsumers` locally and imports it from `app/models/consumer-links`, and that `app/components/overview/ConsumersSection.tsx` contains no inline consumer-derivation loop
