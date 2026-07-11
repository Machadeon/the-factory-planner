# consumer-links

## ADDED Requirements

### Requirement: R1 — single deriveConsumers implementation
`deriveConsumers` — mapping a factory's output part slugs to the list of library factories that net-consume them (`{ id, name, rate }[]`) — SHALL have exactly one implementation, exported from `app/models/consumer-links.ts`, with signature `deriveConsumers(factory: Factory, opts: { library?: StorageLibrary; currentFactoryId?: string | null }): Map<string, { id: string; name: string; rate: number }[]>`. It lives under `app/models/` (not `app/components/logistics/`) because it is pure factory-derivation logic with no rendering concerns, consistent with AGENTS.md's model-layer convention for kebab-case service files exporting related pure functions (e.g. `factory-metrics.ts`). `app/components/logistics/graph-model.ts` and the overview's `ConsumersSection.tsx` SHALL both import it from there rather than each maintaining their own copy. The unified implementation iterates `factory.allOutputs()` (`Part[]`, keyed by `.slug`) — the same source `graph-model.ts` already uses today; `ConsumersSection` (replacing `FactoryOverviewComponent`'s inline version, which iterated `getOutputInfo()`'s `FactoryOutput[]` keyed by `.part.slug`) looks up entries in the returned map by `output.part.slug`, which is equivalent since `getOutputInfo()` is built from `allOutputs()`.

#### Scenario: R1.S1 — graph-model uses hoisted implementation
- **WHEN** `buildGraphModel` needs `consumersByPart` and none was passed via `opts.consumersByPart`
- **THEN** it calls `deriveConsumers` imported from `app/models/consumer-links.ts`, producing the same node/edge wiring as before the hoist

#### Scenario: R1.S2 — overview uses hoisted implementation
- **WHEN** `ConsumersSection` computes which library factories consume this factory's outputs
- **THEN** it calls the same `deriveConsumers` from `app/models/consumer-links.ts` (no inline re-derivation in the component), indexing the returned map by `output.part.slug` for each entry in `factoryOutputs`

### Requirement: R2 — derivation semantics unchanged
`deriveConsumers(factory, { library, currentFactoryId })` SHALL return an empty map when `library` is falsy or `currentFactoryId` is falsy (matching the existing guard `if (!library || !currentFactoryId) return map;` — this includes `null`, `undefined`, and `""`, not only `null`/`undefined`). For each library factory whose `supplierIds` includes `currentFactoryId`, it SHALL deserialize that factory and, for each of the source factory's outputs, include the library factory as a consumer only when its net consumption of that part (`consumptionRate - productionRate`) is strictly greater than `RATE_EPSILON` — a net exactly equal to `RATE_EPSILON` is excluded (matches source: `if (net <= RATE_EPSILON) continue;`).

#### Scenario: R2.S1 — falsy library or id
- **WHEN** `deriveConsumers` is called with `library` as `undefined` or `currentFactoryId` as `null`, `undefined`, or `""`
- **THEN** it returns an empty `Map`

#### Scenario: R2.S2 — net consumption boundary
- **WHEN** a candidate consumer factory's net consumption of an output part equals exactly `RATE_EPSILON`
- **THEN** that factory is excluded from the returned list for that part (boundary is exclusive: only `net > RATE_EPSILON` qualifies)

### Requirement: R3 — behavior freeze
This change SHALL NOT alter observable behavior of either call site: the logistics graph and the overview Consumers section render identical node/edge data and allocation-bar figures before and after the hoist. The full unit, integration, and e2e suites pass; `npm run build` is clean. A unit test file `tests/unit/models/consumer-links.test.ts` SHALL exist covering R2's empty-map and boundary scenarios (no such standalone test exists today — this is net-new coverage).

#### Scenario: R3.S1 — suites green
- **WHEN** `npm run test:run` and `npm run test:e2e` run after the change
- **THEN** all tests pass without modifying any e2e selector

#### Scenario: R3.S2 — new unit coverage
- **WHEN** `tests/unit/models/consumer-links.test.ts` runs
- **THEN** it asserts R2.S1 (falsy `library`/`currentFactoryId` → empty map) and R2.S2 (net exactly at `RATE_EPSILON` → excluded; net just above `RATE_EPSILON` → included)
