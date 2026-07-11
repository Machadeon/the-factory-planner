## 1. Test Stubs

Write failing stubs first (run them, confirm red, then implement).

- [x] 1.1 Unit stub `tests/unit/models/any-recipe-narrowing.test.ts` — `AnyRecipe` narrowing (recipe-type-model R1.S1): guarding a nested-factory line on `isFactoryRecipe` reads `avgPowerPerInstance`/`shardsPerInstance`/`sloopsPerInstance`/`footprintAreaPerInstance` and a plain `Recipe` line reads `building`/`processingTime`, no cast, correct values.
- [x] 1.2 Unit stub — FactoryRecipe capability paths without casts (recipe-type-model R2.S1): `AssemblyLine.getPowerConsumption()` and `factory-metrics` shards/sloops/footprint on a FactoryRecipe-backed line return the same numbers as before (pin expected values).
- [x] 1.3 Unit stub `tests/unit/models/assembly-line.test.ts` — options ctor defaults (assembly-line-construction R1.S1): `new AssemblyLine({ recipe, rate: 30 })` yields `sloopedSlots 0`, `machineSpeed 100`, `powerShards 0`, `allowRemainder true`, `autoCreated false`, `rows 0`, `rowSpacing DEFAULT_ROW_SPACING`, non-empty `id`.
- [x] 1.4 Unit stub — options ctor overrides + normalization (assembly-line-construction R1.S2): explicit `machineSpeed 250`, `powerShards 3`, `rows 2.7`→`2`, `rowSpacing -5`→`0`, `id "fixed"`.
- [x] 1.5 Unit stub `tests/unit/node-size.test.ts` — `effectiveRows` invariance on FactoryRecipe lines (assembly-line-construction R3.S2): returns `1` for `rows 0` and `rows 1`.
- [x] 1.6 Unit stub `tests/unit/models/factory-storage-graph.test.ts` — nested-factory line `rows` default (assembly-line-construction R3.S1): deserializing a nested-factory assembly line with no `rows` yields `rows === 0`.
- [x] 1.7 Unit stub `tests/unit/models/production-line.test.ts` — side-effect-free ctor (production-line-auto-recipe R1.S1): `new ProductionLine(part, …)` for a sole-recipe part yields empty `assemblyLines`.
- [x] 1.8 Unit stub `tests/unit/models/factory.test.ts` — `addProductionLine` auto-add when not suppressed (production-line-auto-recipe R2.S1): sole-recipe part → one `AssemblyLine`, correct rate `productionRate / recipe.productLookup[part.slug]`, `autoCreated true`.
- [x] 1.9 Unit stub — `addProductionLine` suppression (production-line-auto-recipe R2.S2): `addProductionLine(part, false, true)` for a sole-recipe part → empty `assemblyLines`.
- [x] 1.10 Unit stub — `addProductionLine` multi-recipe (production-line-auto-recipe R2.S3): multi-recipe part → empty `assemblyLines`.
- [x] 1.11 Unit stub — deserialize adds no extra line (production-line-auto-recipe R3.S1): sole-recipe production line deserializes to exactly its persisted assembly lines.
- [x] 1.12 Unit stub `tests/unit/models/machine-math.test.ts` — `getMachineCount` tags `kind` (machine-math R4.S1): remainder path `kind "remainder"`, uniform path `kind "uniform"`, FactoryRecipe early return `{ kind: "remainder", fullMachines: 0, remainderClock: 0 }`.
- [x] 1.13 Unit stub — `totalMachines` on all `kind` shapes (machine-math R2.S1): returns `4`, `3`, `4`, `0` for the four inputs.

## 2. AnyRecipe union (recipe-type-model)

- [x] 2.1 `recipe-like.ts`: delete the `RecipeLike` interface; export `type AnyRecipe = Recipe | FactoryRecipe` using `import type` for both concrete classes (no runtime import edge).
- [x] 2.2 Sweep all `RecipeLike` references → `AnyRecipe` (assembly-line.ts, factory-recipe.ts, solver/rate-solver.ts, solver/recipe-optimizer.ts, solver/base-model.ts, ProductionLineComponent.tsx, tests/unit/models/solver/base-model.test.ts); `AssemblyLine.recipe: AnyRecipe`.
- [x] 2.3 Delete FactoryRecipe-capability casts via `isFactoryRecipe` narrowing: `factory-metrics.ts` (shards/sloops/footprint ×3), `assembly-line.ts` power block, `solver/recipe-optimizer.ts` `avgPowerPerInstance`, `logistics/node-size.ts` footprint, `logistics/AssemblyLineNode.tsx` icon.

## 3. MachineCount discriminated union (machine-math)

- [x] 3.1 `assembly-line.ts`: add `kind: "remainder" | "uniform"` to the `MachineCount` union; set `kind` in `getMachineCount()` on both paths and the FactoryRecipe early return.
- [x] 3.2 Convert the four probe sites to `count.kind === "remainder"`: `totalMachines` (L15), `getTotalShards` (L200), `getPowerConsumption` (L228), `MachineCountDisplay.tsx` (L16).

## 4. Auto-recipe ownership (production-line-auto-recipe)

Done before the ctor migration (Group 5) so `production-line.ts`'s `new AssemblyLine` block is deleted rather than migrated-then-deleted, and the relocated auto-add is swept into options form by 5.2.

- [x] 4.1 `production-line.ts`: remove the `suppressAutoRecipe` ctor param and the sole-recipe auto-add block; `assemblyLines` initializes empty. (Deletes production-line.ts's only `new AssemblyLine` call.)
- [x] 4.2 `factory.ts` `addProductionLine`: keep the `suppressAutoRecipe` param; after constructing the line, run the relocated auto-add guarded by `!suppressAutoRecipe && recipeLookup[part.slug].length === 1`. (Written here; Group 5 migrates its `new AssemblyLine` to options form.)
- [x] 4.3 `factory-storage.ts`: remove both `pl.assemblyLines = []` resets (L258, L384) — now redundant.
- [x] 4.4 Sweep — drop the now-invalid 6th positional `suppressAutoRecipe` arg from **every** `new ProductionLine(...)` caller (grep `new ProductionLine`): production code `app/models/solver/recipe-optimizer.ts:434` (was `…, true, true, true`), and tests `factory-recipe-footprint`, `point-values-storage`, `factory-storage-graph`, `factory-integer-instances` (×3), `factory-sync-verification`, `factory-recipe`, `factory-metrics`, `factory.test`, `solver/recipe-optimizer.test`, and the integration tests (`FactoryOverviewComponent`, `PartRateSummary`, `LogisticsSection`, `AssemblyLineComponent`). Move `production-line.test.ts` auto-add assertions to target `Factory.addProductionLine`.

## 5. AssemblyLine options constructor (assembly-line-construction)

- [x] 5.1 Replace the 10 positional params with an options object (`recipe`, `rate` required; defaults per design D2); preserve `rows`/`rowSpacing` normalization.
- [x] 5.2 Migrate every `new AssemblyLine(...)` call site to the options object (grep `new AssemblyLine`): `factory.ts` (including the relocated auto-add block from 4.2), `factory-storage.ts`, `solver/recipe-optimizer.ts` (also touched by 2.3 — apply cast + ctor changes together), and all `tests/` construction sites. `production-line.ts` no longer constructs an `AssemblyLine`.
- [x] 5.3 In `factory-storage.ts`, unify `rows` deserialize default to `0` (auto) at all three sites — replace the nested-factory branch's `?? 1`.

## 6. Verification

- [x] 6.1 Cast sweep (recipe-type-model R3.S1): `app/models` + `app/components` have no `as unknown as` reaching a FactoryRecipe member (avgPowerPerInstance/min/max, shardsPerInstance, sloopsPerInstance, footprintAreaPerInstance, icon).
- [x] 6.2 `RecipeLike` sweep (recipe-type-model R1.S2): zero occurrences of `RecipeLike` in `app/` + `tests/`.
- [x] 6.3 Positional-ctor sweep (assembly-line-construction R2.S1): every `new AssemblyLine(` passes a single object literal; no bare positional list.
- [x] 6.4 `rows` default sweep (assembly-line-construction R3.S3): no assembly-line construction in `factory-storage.ts` defaults `rows` to `1`.
- [x] 6.5 `suppressAutoRecipe` sweep (production-line-auto-recipe R1.S2): removed from `ProductionLine` ctor; retained on `Factory.addProductionLine`; no `new ProductionLine(...)` passes a 6th positional arg.
- [x] 6.6 Probe sweep (machine-math R4.S2): `app/` has zero `"fullMachines" in` occurrences.
- [x] 6.7 All unit/integration tests pass (`npm run test:run`).
- [~] 6.8 E2E (`npm run test:e2e`): BLOCKED by environment tooling — dev-mode Turbopack cannot resolve `tailwindcss` (resolves from parent dir; same broken-`node_modules`/`.bin`-shim class that also breaks the `vitest`/`next` CLIs, worked around by invoking real binaries). Server can't serve pages, so E2E cannot run against this branch's code here. Not an M3 defect: M3 is model-layer type-safety with no UI/flow change; production build (authoritative typecheck + compile) is clean and all 427 unit+integration tests pass. Re-run E2E once the environment's `node_modules` is repaired (`npm ci`).
- [x] 6.9 Production build passes (`node node_modules/next/dist/bin/next build` — clean TypeScript + compile). `npm run lint-fix`: all 35 M3-changed files are clean; two pre-existing findings remain in untouched files (`useFactoryPageFlows.ts:36` unused var, `LogisticEdge.tsx:56` a11y) — out of M3 scope.
