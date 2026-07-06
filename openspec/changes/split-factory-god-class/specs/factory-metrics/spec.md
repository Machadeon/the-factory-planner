## ADDED Requirements

### Requirement: R1 Metrics module home
`app/models/factory-metrics.ts` SHALL export factory-wide aggregation queries as functions taking the factory as a parameter: `getTotalPower(factory)`, `getTotalShards(factory)`, `getTotalSloops(factory)`, `factoryFloorArea(factory)`, and `availableOutputsFrom(source)`. The corresponding `Factory` methods (`getTotalPower`, `getTotalShards`, `getTotalSloops`, `availableOutputsFrom`) SHALL be deleted with no delegating facade, and the private `factoryFloorArea` in `factory-recipe.ts` SHALL move here as the single floor-area implementation. All call sites (`FactoryOverviewComponent`, `FactoryRecipe` constructor, and any others) SHALL import from `factory-metrics.ts`. `factory.ts` SHALL NOT import `factory-metrics.ts` (dependency points metrics → factory, type-only, keeping the graph acyclic).

#### Scenario: R1.S1 Functions exported, methods gone
- **WHEN** `factory-metrics.ts` is imported and `factory.ts` is searched for the four deleted method names
- **THEN** the five functions exist in `factory-metrics.ts`, none of the methods remain on `Factory`, and no re-export shim exists

#### Scenario: R1.S2 Single floor-area implementation
- **WHEN** `app/models/` is searched for the floor-area summation logic
- **THEN** it exists only in `factory-metrics.ts`; `factory-recipe.ts` imports `factoryFloorArea` from there

### Requirement: R2 Aggregation behavior preserved
The moved functions SHALL preserve current behavior exactly:
- `getTotalPower` sums `getPowerConsumption()` per assembly line into `{ avg, min, max }`.
- `getTotalShards` sums `rate × shardsPerInstance` for factory-recipe lines and `getTotalShards()` for machine lines.
- `getTotalSloops` sums `rate × sloopsPerInstance` for factory-recipe lines and `sloopedSlots × totalMachines(getMachineCount())` for machine lines.
- `factoryFloorArea` sums `machines × building.size.width × building.size.length` for machine lines and `rate × footprintAreaPerInstance` for factory-recipe lines, skipping buildings without size. It does not recurse — nested factories contribute via their precomputed `footprintAreaPerInstance`; the current implementation's `depth` parameter is dead code and SHALL be dropped in the move.
- `availableOutputsFrom` returns the source factory's outputs with net rate (`productionRate − consumptionRate`) above `RATE_EPSILON`.

#### Scenario: R2.S1 Totals match pre-move values
- **WHEN** the existing unit coverage for power/shards/sloops totals and factory-recipe footprint (`factory.test.ts`, `factory-recipe.test.ts`, `factory-recipe-footprint.test.ts`) runs against the moved functions
- **THEN** all assertions hold with unchanged expected values

#### Scenario: R2.S2 Mixed machine and factory-recipe lines
- **WHEN** a factory contains one machine-backed assembly line and one factory-recipe-backed assembly line
- **THEN** each metric combines both branches per the formulas above
