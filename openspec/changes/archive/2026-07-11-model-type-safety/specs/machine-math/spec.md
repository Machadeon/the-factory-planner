## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: R2 — totalMachines exported
`assembly-line.ts` SHALL export `totalMachines(count: MachineCount): number` returning `fullMachines + (remainderClock > 0 ? 1 : 0)` for the `kind: "remainder"` shape and `machineCount` for the `kind: "uniform"` shape. It SHALL discriminate on `count.kind`.

#### Scenario: R2.S1 — All shapes
- **WHEN** `totalMachines` receives `{ kind: "remainder", fullMachines: 3, remainderClock: 50 }`, `{ kind: "remainder", fullMachines: 3, remainderClock: 0 }`, `{ kind: "uniform", machineCount: 4, uniformClock: 75 }`, and the factory-recipe shape `{ kind: "remainder", fullMachines: 0, remainderClock: 0 }`
- **THEN** it returns `4`, `3`, `4`, and `0` respectively
