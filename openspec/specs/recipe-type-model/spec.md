# recipe-type-model Specification

## Purpose
TBD - created by archiving change model-type-safety. Update Purpose after archive.
## Requirements
### Requirement: R1 — AnyRecipe discriminated union is the single recipe type
`recipe-like.ts` SHALL export `type AnyRecipe = Recipe | FactoryRecipe` and SHALL NOT export a `RecipeLike` interface. Both `Recipe` and `FactoryRecipe` already carry a literal-typed `isFactoryRecipe` discriminant (`false as const` / `true as const`), so `AnyRecipe` narrows structurally: guarding on `recipe.isFactoryRecipe` MUST narrow to `FactoryRecipe` (true branch) or `Recipe` (false branch) with no cast.

#### Scenario: R1.S1 — Narrowing yields the concrete type
- **WHEN** a value of type `AnyRecipe` is guarded with `if (recipe.isFactoryRecipe)`
- **THEN** the true branch has type `FactoryRecipe` (exposing `avgPowerPerInstance`, `shardsPerInstance`, `sloopsPerInstance`, `footprintAreaPerInstance`, `icon`) and the false branch has type `Recipe` (exposing `building`, `processingTime`), each accessed without `as` casts

#### Scenario: R1.S2 — RecipeLike no longer exists
- **WHEN** `app/` and `tests/` are searched for the identifier `RecipeLike`
- **THEN** there are zero occurrences; every prior `RecipeLike` reference (`assembly-line.ts`, `factory-recipe.ts`, `solver/rate-solver.ts`, `solver/recipe-optimizer.ts`, `solver/base-model.ts`, `ProductionLineComponent.tsx`, and `base-model.test.ts`) now uses `AnyRecipe`

### Requirement: R2 — AssemblyLine.recipe is AnyRecipe
`AssemblyLine.recipe` SHALL be typed `AnyRecipe`. All members that read `FactoryRecipe`-only capabilities SHALL obtain the concrete type by narrowing on `isFactoryRecipe`, not by casting.

#### Scenario: R2.S1 — Power/shards/sloops/footprint read without casts
- **WHEN** `AssemblyLine.getPowerConsumption()` and the `factory-metrics` shards/sloops/footprint accumulators run against a `FactoryRecipe`-backed line
- **THEN** they read `avgPowerPerInstance`/`minPowerPerInstance`/`maxPowerPerInstance`/`shardsPerInstance`/`sloopsPerInstance`/`footprintAreaPerInstance` after an `isFactoryRecipe` narrowing, producing the same numeric results as before the change

### Requirement: R3 — No FactoryRecipe capability is reached by cast
No `as unknown as` (or equivalent) cast SHALL be used to read a `FactoryRecipe` capability from a recipe reference anywhere in `app/models` or `app/components`.

#### Scenario: R3.S1 — Cast sweep is clean
- **WHEN** `app/models` and `app/components` are searched for `as unknown as` casts whose target names a `FactoryRecipe` member (`avgPowerPerInstance`, `minPowerPerInstance`, `maxPowerPerInstance`, `shardsPerInstance`, `sloopsPerInstance`, `footprintAreaPerInstance`, `icon`)
- **THEN** none remain — specifically the casts previously at `factory-metrics.ts` (×3), `assembly-line.ts` (power block), `solver/recipe-optimizer.ts`, `logistics/node-size.ts`, and `logistics/AssemblyLineNode.tsx` are gone

> Note: React Flow `data as unknown as …` casts in the logistics components are unrelated to recipe capabilities and are out of scope — R3 never covered them, since R3 only concerns casts reading a `FactoryRecipe` capability. The `factory-storage` serialized-parts cast was likewise never in scope for R3 (it doesn't read a `FactoryRecipe` capability); this note previously flagged it as a known, deliberately-deferred `as unknown as` survivor elsewhere in the codebase. That cast is now removed independently by the `optimizer-config` capability's R5, so it is no longer a survivor worth flagging here.
