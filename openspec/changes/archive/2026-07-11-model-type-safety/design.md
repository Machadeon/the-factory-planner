## Context

Phase M3 of `plans/model-refactor.md`. The model layer's shared recipe abstraction (`RecipeLike` interface) is too thin to narrow, forcing `as unknown as` casts to reach `FactoryRecipe`-only capabilities. Three related type hazards ride along: a 10-positional-arg `AssemblyLine` constructor, an undiscriminated `MachineCount` union probed by property presence, and a `ProductionLine` constructor side effect that callers fight. Both concrete recipe classes already carry a literal-typed `isFactoryRecipe` discriminant, so a proper union is a pure type-system win with no runtime shape change. This is a compile-time-safety refactor: no algorithm, storage-format, or (except the inert `rows` unification) behavioral change.

## Goals / Non-Goals

**Goals:**
- Replace `RecipeLike` with `type AnyRecipe = Recipe | FactoryRecipe`; delete every recipe-capability `as unknown as` cast via `isFactoryRecipe` narrowing.
- `AssemblyLine` options-object constructor with named defaults; unify the `rows` deserialize default to `0`.
- `MachineCount` discriminated union tagged by `kind`; probe sites narrow on `kind`.
- Move sole-recipe auto-add from the `ProductionLine` constructor into `Factory.addProductionLine`, gated by the existing `suppressAutoRecipe` parameter.

**Non-Goals:**
- No LP/solver algorithm change.
- No hardening of the `undefined recipeLookup[part.slug]` latent case (separate change).
- No change to the `rows` `0 = auto` sentinel semantics, serialization format, or storage schema.
- No touching React Flow `data as unknown as …` casts (unrelated to recipe capabilities).

## Decisions

**D1 — Delete `RecipeLike`; `AnyRecipe` is the only recipe type.**
`recipe-like.ts` stops exporting the interface and exports `type AnyRecipe = Recipe | FactoryRecipe` (import-type of both concrete classes). `AssemblyLine.recipe: AnyRecipe`. All 8 `RecipeLike` reference sites swap to `AnyRecipe`. Narrowing on `recipe.isFactoryRecipe` (already `true as const` / `false as const`) yields the concrete type with no cast.
- *Alternative considered:* keep `RecipeLike` as a structural base and add `AnyRecipe` alongside. Rejected (user decision): two overlapping abstractions; the union alone is cleaner and the narrowing already covers every shared-surface access.
- *Import-cycle note:* `recipe-like.ts` uses `import type` for `Recipe`/`FactoryRecipe`, so the union introduces no runtime import edge — types erase at compile time. `assembly-line.ts` already imports `Recipe` as a type; `FactoryRecipe` likewise import-type only.

**D2 — Options-object constructor.**
`new AssemblyLine({ recipe, rate, sloopedSlots?, machineSpeed?, powerShards?, allowRemainder?, autoCreated?, id?, rows?, rowSpacing? })`. `recipe` + `rate` required; defaults (`0 / 100 / 0 / true / false / crypto.randomUUID() / 0 / DEFAULT_ROW_SPACING`) applied in-body. Existing normalization (`rows` floor+clamp, `rowSpacing` clamp) preserved. Every call site (models, components, ~30 test sites) migrates in the same change so no positional overload lingers.
- *Alternative:* builder pattern or partial-with-defaults helper. Rejected: options object is idiomatic here and matches the plan.

**D3 — `rows` deserialize default → `0` everywhere.**
The nested-factory branch's `rows ?? 1` is replaced by the constructor default (`0`). Inert because `effectiveRows` returns `1` for `isFactoryRecipe` lines before reading `rows` (`node-size.ts:25`). Net: all three deserialize sites agree, the `?? 1` divergence disappears, zero rendered change.

**D4 — `MachineCount` discriminated union.**
```ts
type MachineCount =
  | { kind: "remainder"; fullMachines: number; remainderClock: number }
  | { kind: "uniform"; machineCount: number; uniformClock: number };
```
`getMachineCount()` sets `kind` on both real paths and the FactoryRecipe early return (`{ kind: "remainder", fullMachines: 0, remainderClock: 0 }`). The `"fullMachines" in count` probes switch to `count.kind === "remainder"`. Exactly four probe sites exist, all in two files: `assembly-line.ts` ×3 (`totalMachines` L15, `getTotalShards` L200, `getPowerConsumption` L228) and `MachineCountDisplay.tsx` L16. `factory-metrics` and `AssemblyLineControls` call `getMachineCount()`/`totalMachines()` but do **not** probe the shape, so they need no change.
- *Alternative:* keep structural probing. Rejected: `"x" in obj` is exactly the un-narrowable seam the plan targets.

**D5 — Auto-recipe ownership → `Factory.addProductionLine`, gated by `suppressAutoRecipe`.**
The `ProductionLine` constructor loses its `suppressAutoRecipe` param and the auto-add block; `assemblyLines` initializes empty. `Factory.addProductionLine(part, autoCreated?, suppressAutoRecipe?)` keeps its signature and, after constructing the line, runs the relocated auto-add block guarded by `!suppressAutoRecipe && recipes.length === 1`. This preserves the `useFactoryPageFlows.ts:97` suppression path (skip auto-add when another library factory exports the part). `factory-storage` no longer needs `pl.assemblyLines = []` (constructor already yields empty); both reset sites (`factory-storage.ts:258` and `:384`) are removed for clarity.
- *Alternative:* leave the side effect and only re-type. Rejected: the plan's structural goal is to kill the constructor side effect that callers fight.

## Risks / Trade-offs

- **Wide mechanical diff (~30 construction call sites, 8 `RecipeLike` sites).** → Each is a mechanical signature swap; `tsc` + the full unit/integration/e2e suites catch any miss. No site changes runtime values.
- **A missed cast or probe compiles via `any` leakage.** → Spec scenarios R3.S1 (cast sweep) and R4.S2 (probe sweep) are grep-based acceptance checks; run them as verification, not just types.
- **`production-line.test.ts` auto-add assertions move to `addProductionLine`.** → Tests are rewritten to the new owner; the behavior asserted is identical (sole-recipe part → one line; multi-recipe → none; suppressed → none).
- **Silent behavior drift on the `rows` change.** → Covered by R3.S2 (`effectiveRows` invariance) proving the unification is inert.

## Migration Plan

Single change, no runtime/data migration. Order: (1) `recipe-like.ts` union + sweep `RecipeLike`→`AnyRecipe`; (2) `AssemblyLine` options ctor + migrate all call sites; (3) `MachineCount` `kind` + probes; (4) `ProductionLine`/`Factory.addProductionLine` auto-recipe move + `factory-storage` cleanup + `rows` unify; (5) delete casts as each narrowing lands. Gates: `npm run test:run`, `npm run test:e2e`, `npm run build`, plus the two grep sweeps. Rollback = revert the branch; no persisted state touched.

## Open Questions

None — the four decisions and the `rows`/`suppressAutoRecipe` semantics were resolved during the grill and spec-review.
