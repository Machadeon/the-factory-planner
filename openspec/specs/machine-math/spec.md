# machine-math Specification

## Purpose

Shared machine-count and power-shard math for assembly lines: the single implementations of `shardsForClock` and `totalMachines`, and the discriminated `MachineCount` shape they operate on, so the clock/shard/machine formulas are never duplicated inline across models and components.

## Requirements

### Requirement: R1 — shardsForClock exported
`assembly-line.ts` SHALL export `shardsForClock(clock: number): number` returning `Math.max(0, Math.ceil((clock - 100) / 50))` — the power shards required for a machine clock percentage. The currently private function becomes the single implementation.

#### Scenario: R1.S1 — Shard boundaries
- **WHEN** `shardsForClock` receives `100`, `101`, `150`, `151`, `250`, and `50`
- **THEN** it returns `0`, `1`, `1`, `2`, `3`, and `0` respectively

### Requirement: R2 — totalMachines exported
`assembly-line.ts` SHALL export `totalMachines(count: MachineCount): number` returning `fullMachines + (remainderClock > 0 ? 1 : 0)` for the `kind: "remainder"` shape and `machineCount` for the `kind: "uniform"` shape. It SHALL discriminate on `count.kind`.

#### Scenario: R2.S1 — All shapes
- **WHEN** `totalMachines` receives `{ kind: "remainder", fullMachines: 3, remainderClock: 50 }`, `{ kind: "remainder", fullMachines: 3, remainderClock: 0 }`, `{ kind: "uniform", machineCount: 4, uniformClock: 75 }`, and the factory-recipe shape `{ kind: "remainder", fullMachines: 0, remainderClock: 0 }`
- **THEN** it returns `4`, `3`, `4`, and `0` respectively

### Requirement: R3 — No inline copies remain
No inline duplicate of either expression SHALL remain in `app/`. Known sites to replace: shard formula — `factory-storage.ts` (×3: lines deserializing `machineSpeed`), `AssemblyLineControls.tsx` (×2); machine-count total — `factory.tsx`, `factory-recipe.ts`, `AssemblyLineControls.tsx`, `logistics/node-size.ts`. (`MachineCountDisplay.tsx` renders the per-shape breakdown, not the total, and keeps its field access.)

#### Scenario: R3.S1 — Sweep complete
- **WHEN** `app/` is searched with regexes `- 100\) / 50` (shard ceil expression) and `remainderClock > 0 \? 1 : 0` (remainder-total ternary) after migration
- **THEN** the only occurrences are inside `shardsForClock` and `totalMachines` in `assembly-line.ts`

### Requirement: R4 — MachineCount is a discriminated union
`assembly-line.ts` SHALL define `MachineCount` as a union tagged by a `kind` field:

```ts
type MachineCount =
  | { kind: "remainder"; fullMachines: number; remainderClock: number }
  | { kind: "uniform"; machineCount: number; uniformClock: number };
```

`getMachineCount()` SHALL set `kind: "remainder"` on the `allowRemainder` path (and on the FactoryRecipe early return `{ kind: "remainder", fullMachines: 0, remainderClock: 0 }`) and `kind: "uniform"` otherwise. Every consumer that distinguishes the two shapes SHALL narrow on `count.kind === "remainder"` rather than probing `"fullMachines" in count`.

#### Scenario: R4.S1 — getMachineCount tags each shape
- **WHEN** `getMachineCount()` runs with `allowRemainder === true` versus `allowRemainder === false`
- **THEN** the remainder path returns an object with `kind === "remainder"` carrying `fullMachines`/`remainderClock`, and the uniform path returns `kind === "uniform"` carrying `machineCount`/`uniformClock`; the FactoryRecipe early return is `{ kind: "remainder", fullMachines: 0, remainderClock: 0 }`

#### Scenario: R4.S2 — Probe sites narrow on kind
- **WHEN** `app/` is searched for `"fullMachines" in`
- **THEN** there are zero occurrences; the four probe sites — `assembly-line.ts` `totalMachines`, `getTotalShards`, and `getPowerConsumption`, plus `MachineCountDisplay.tsx` — all discriminate via `count.kind`. (`AssemblyLineControls.tsx` and `factory-metrics.ts` consume `getMachineCount()`/`totalMachines()` without probing the shape and are unchanged.)
