## MODIFIED Requirements

### Requirement: R3 — No FactoryRecipe capability is reached by cast
No `as unknown as` (or equivalent) cast SHALL be used to read a `FactoryRecipe` capability from a recipe reference anywhere in `app/models` or `app/components`.

#### Scenario: R3.S1 — Cast sweep is clean
- **WHEN** `app/models` and `app/components` are searched for `as unknown as` casts whose target names a `FactoryRecipe` member (`avgPowerPerInstance`, `minPowerPerInstance`, `maxPowerPerInstance`, `shardsPerInstance`, `sloopsPerInstance`, `footprintAreaPerInstance`, `icon`)
- **THEN** none remain — specifically the casts previously at `factory-metrics.ts` (×3), `assembly-line.ts` (power block), `solver/recipe-optimizer.ts`, `logistics/node-size.ts`, and `logistics/AssemblyLineNode.tsx` are gone

> Note: React Flow `data as unknown as …` casts in the logistics components are unrelated to recipe capabilities and are out of scope — R3 never covered them, since R3 only concerns casts reading a `FactoryRecipe` capability. The `factory-storage` serialized-parts cast was likewise never in scope for R3 (it doesn't read a `FactoryRecipe` capability); this note previously flagged it as a known, deliberately-deferred `as unknown as` survivor elsewhere in the codebase. That cast is now removed independently by the `optimizer-config` capability's R5, so it is no longer a survivor worth flagging here.
