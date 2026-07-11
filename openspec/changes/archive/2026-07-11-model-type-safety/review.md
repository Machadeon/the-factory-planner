## Pass 1 — 2026-07-10

**Source: Reviewer**
**Status: APPROVED**

### Resolved from Previous Pass
(none — first pass)

### Findings
(none)

### Verification Summary

**Type-safety refactor execution:**
- ✓ `RecipeLike` deleted; `type AnyRecipe = Recipe | FactoryRecipe` correctly replaces all 8 reference sites
- ✓ All recipe-capability `as unknown as` casts eliminated from app code (8 removed, 0 added)
- ✓ Narrowing on `recipe.isFactoryRecipe` correctly typed across 18 guard sites (assembly-line.ts ×8, node-size.ts ×4, factory-metrics.ts ×3, MachineCountDisplay.tsx ×1, AssemblyLineNode.tsx ×2)

**Constructor migration:**
- ✓ `AssemblyLine` options-object constructor correctly migrates all 30+ call sites
- ✓ All default values match old positional args: `sloopedSlots=0`, `machineSpeed=100`, `powerShards=0`, `allowRemainder=true`, `autoCreated=false`, `id=crypto.randomUUID()`, `rows=0`, `rowSpacing=DEFAULT_ROW_SPACING`
- ✓ No call site passes `allowRemainder: false` except tests (which explicitly specify it where intended)

**MachineCount discriminated union:**
- ✓ `kind` field consistently set on all return paths (3 in getMachineCount, 1 early return for FactoryRecipe)
- ✓ Probes correctly use `count.kind === "remainder"` / `"uniform"` (4 sites: assembly-line.ts ×3, MachineCountDisplay.tsx ×1)
- ✓ No `"fullMachines" in count` property-presence checks remain

**ProductionLine side-effect removal:**
- ✓ Constructor no longer auto-adds recipes; `assemblyLines` initializes empty
- ✓ Auto-add logic correctly relocated to `Factory.addProductionLine(part, autoCreated?, suppressAutoRecipe?)` with guard `!suppressAutoRecipe && recipes.length === 1`
- ✓ All ProductionLine ctor call sites (40+) drop the 6th param; no site relied on side effect
- ✓ New test file `factory-add-production-line.test.ts` comprehensively covers auto-add scenarios (R2.S1/S2/S3)
- ✓ Old production-line.test.ts updated: renamed to "constructor (side-effect-free)", no longer asserts auto-add

**Storage deserialization:**
- ✓ Both `deserializeFactoryStub` and `deserializeFactory` correctly migrate to options-object ctor
- ✓ `rows ?? 1` unification to `rows ?? 0` confirmed inert (effectiveRows returns 1 for FactoryRecipe before reading rows, guarded at node-size.ts:25)
- ✓ `pl.assemblyLines = []` reset lines removed from both paths (no longer needed; constructor starts empty)
- ✓ `powerShards: shardsForClock(alData.machineSpeed)` correctly uses stored machineSpeed, not powerShards (powerShards not persisted, computed at runtime — matches old behavior)

**Behavioral equivalence:**
- ✓ No algorithm change to rate computation, constraints, or solver
- ✓ No serialization format change (schema version unchanged)
- ✓ `isFactoryRecipe` discriminant already `true/false as const`, so narrowing has zero runtime cost
- ✓ Deserialization defaults and defaults in options ctor are identical to old positional defaults

**Test migration:**
- ✓ All test sites explicitly specify `allowRemainder` where needed (no reliance on new default)
- ✓ Constructor tests in production-line.test.ts correctly updated to assert side-effect-free behavior
- ✓ New factory-add-production-line.test.ts covers all auto-add scenarios
