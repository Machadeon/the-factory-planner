# machine-math Specification

## Requirements

### Requirement: R1 — shardsForClock exported
`assembly-line.ts` SHALL export `shardsForClock(clock: number): number` returning `Math.max(0, Math.ceil((clock - 100) / 50))` — the power shards required for a machine clock percentage. The currently private function becomes the single implementation.

#### Scenario: R1.S1 — Shard boundaries
- **WHEN** `shardsForClock` receives `100`, `101`, `150`, `151`, `250`, and `50`
- **THEN** it returns `0`, `1`, `1`, `2`, `3`, and `0` respectively

### Requirement: R2 — totalMachines exported
`assembly-line.ts` SHALL export `totalMachines(count: ReturnType<AssemblyLine["getMachineCount"]>): number` returning `fullMachines + (remainderClock > 0 ? 1 : 0)` for the remainder shape and `machineCount` for the uniform shape.

#### Scenario: R2.S1 — All shapes
- **WHEN** `totalMachines` receives `{ fullMachines: 3, remainderClock: 50 }`, `{ fullMachines: 3, remainderClock: 0 }`, `{ machineCount: 4, uniformClock: 75 }`, and the factory-recipe shape `{ fullMachines: 0, remainderClock: 0 }`
- **THEN** it returns `4`, `3`, `4`, and `0` respectively

### Requirement: R3 — No inline copies remain
No inline duplicate of either expression SHALL remain in `app/`. Known sites to replace: shard formula — `factory-storage.ts` (×3: lines deserializing `machineSpeed`), `AssemblyLineControls.tsx` (×2); machine-count total — `factory.tsx`, `factory-recipe.ts`, `AssemblyLineControls.tsx`, `logistics/node-size.ts`. (`MachineCountDisplay.tsx` renders the per-shape breakdown, not the total, and keeps its field access.)

#### Scenario: R3.S1 — Sweep complete
- **WHEN** `app/` is searched with regexes `- 100\) / 50` (shard ceil expression) and `remainderClock > 0 \? 1 : 0` (remainder-total ternary) after migration
- **THEN** the only occurrences are inside `shardsForClock` and `totalMachines` in `assembly-line.ts`
