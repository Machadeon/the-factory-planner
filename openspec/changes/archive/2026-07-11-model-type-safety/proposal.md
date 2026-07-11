## Why

`app/models` reaches `FactoryRecipe`-only capabilities through `as unknown as { … }` casts because the shared `RecipeLike` interface is too thin to narrow on. The same thinness forces three other type hazards: a 10-positional-argument `AssemblyLine` constructor (unreadable call sites, and a `rows ?? 1` vs `rows ?? 0` divergence in `factory-storage`), an undiscriminated `MachineCount` union probed by `"fullMachines" in count` at five sites, and a `ProductionLine` constructor side effect (auto-adding a recipe) that callers actively fight with `assemblyLines = []` resets and a `suppressAutoRecipe` opt-out flag. This is Phase M3 of `plans/model-refactor.md` — a compile-time-safety pass with no intended behavior change.

## What Changes

- **`AnyRecipe = Recipe | FactoryRecipe` discriminated union** replaces the `RecipeLike` interface, which is **deleted**. `AssemblyLine.recipe` and every `RecipeLike` reference (8 files) become `AnyRecipe`; `isFactoryRecipe` narrows the union so all `as unknown as` casts that reach `FactoryRecipe` capabilities (`factory-metrics.ts`, `assembly-line.ts:211`, `solver/recipe-optimizer.ts:128`, `logistics/node-size.ts:50`, `logistics/AssemblyLineNode.tsx:52`) are deleted. **BREAKING** (internal): `RecipeLike` no longer exported.
- **`AssemblyLine` options-object constructor** — `new AssemblyLine({ recipe, rate, machineSpeed: 100, … })` with named defaults, replacing the 10 positional params. All call sites migrate. The `rows` deserialize default is unified to `0` (auto) across all three `factory-storage` sites; the pre-existing `?? 1` in the nested-factory branch was inert (`effectiveRows` short-circuits FactoryRecipe lines to `1` before reading `rows`), so this is a **no-op** — no rendered change. **BREAKING** (internal): positional constructor removed.
- **`MachineCount` discriminated union** — gains `kind: 'remainder' | 'uniform'`; the five `"fullMachines" in count` probes (`assembly-line.ts` ×2, `factory-metrics.ts`, `MachineCountDisplay.tsx`, `AssemblyLineControls.tsx`) narrow on `kind`.
- **`ProductionLine` auto-recipe side effect removed** — sole-recipe auto-add moves verbatim into `Factory.addProductionLine`, guarded by the existing `suppressAutoRecipe` parameter that `addProductionLine` already carries (used by `useFactoryPageFlows` to skip auto-add when another library factory already exports the part). The `ProductionLine` constructor becomes side-effect-free and its `suppressAutoRecipe` positional param is removed; `Factory.addProductionLine` keeps its `suppressAutoRecipe` param as the auto-add gate. `factory-storage` drops its `assemblyLines = []` reset. **BREAKING** (internal): `ProductionLine` constructor signature loses `suppressAutoRecipe`.

Explicit non-goals: no LP/algorithm change; no hardening of the `undefined recipeLookup[part.slug]` latent case (separate change per AGENTS.md); `MachineCount`'s `0 = auto` `rows` sentinel semantics untouched.

## Capabilities

### New Capabilities
- `recipe-type-model`: the `AnyRecipe = Recipe | FactoryRecipe` discriminated union as the single recipe type; `RecipeLike` deleted; no `as unknown as` cast reaches a `FactoryRecipe` capability from a recipe reference.
- `assembly-line-construction`: `AssemblyLine`'s options-object constructor with named defaults, and the resolved `rows` deserialize default (`0` = auto) across all serialization sites.
- `production-line-auto-recipe`: ownership of sole-recipe auto-add — `Factory.addProductionLine` performs it; the `ProductionLine` constructor never does; `suppressAutoRecipe` no longer exists.

### Modified Capabilities
- `machine-math`: `MachineCount` becomes a discriminated union tagged by `kind: 'remainder' | 'uniform'`; the exported `totalMachines(count)` (R2) and all `"fullMachines" in count` probe sites narrow on `kind` rather than property presence.

## Impact

- **Models:** `recipe-like.ts` (interface → `AnyRecipe` union export), `recipe.ts`, `factory-recipe.ts`, `assembly-line.ts` (ctor + `MachineCount` + casts), `production-line.ts` (side effect removed), `factory.ts` (`addProductionLine` owns auto-add), `factory-metrics.ts`, `factory-storage.ts` (ctor migration, `rows` unify, drop reset), `solver/recipe-optimizer.ts`, `solver/rate-solver.ts`, `solver/base-model.ts`.
- **Components:** `ProductionLineComponent.tsx` (`RecipeLike` ref), `MachineCountDisplay.tsx`, `AssemblyLineControls.tsx`, `logistics/node-size.ts`, `logistics/AssemblyLineNode.tsx`.
- **Tests:** all `new AssemblyLine(...)` / `new ProductionLine(...)` construction sites migrate to the new signatures (~30 sites, mostly `tests/`); `production-line.test.ts` auto-add assertions move to `Factory.addProductionLine`; new union-narrowing tests cover `FactoryRecipe` power/shards/sloops/footprint paths.
- **Dependencies / storage schema:** none — serialization format unchanged.
