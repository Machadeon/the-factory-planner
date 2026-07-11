# assembly-line-construction Specification

## Purpose
TBD - created by archiving change model-type-safety. Update Purpose after archive.
## Requirements
### Requirement: R1 — Options-object constructor with named defaults
`AssemblyLine` SHALL be constructed from a single options object, replacing the 10 positional parameters. `recipe` and `rate` are required; all other fields have defaults applied inside the constructor:

| Option | Type | Default |
|---|---|---|
| `recipe` | `AnyRecipe` | — (required) |
| `rate` | `number` | — (required) |
| `sloopedSlots` | `number` | `0` |
| `machineSpeed` | `number` | `100` |
| `powerShards` | `number` | `0` |
| `allowRemainder` | `boolean` | `true` |
| `autoCreated` | `boolean` | `false` |
| `id` | `string` | `crypto.randomUUID()` |
| `rows` | `number` | `0` |
| `rowSpacing` | `number` | `DEFAULT_ROW_SPACING` |

The constructor SHALL preserve existing normalization: `rows` clamped via `Math.max(0, Math.floor(rows))` and `rowSpacing` via `Math.max(0, rowSpacing)`.

#### Scenario: R1.S1 — Defaults applied when options omitted
- **WHEN** `new AssemblyLine({ recipe, rate: 30 })` is constructed
- **THEN** the instance has `sloopedSlots === 0`, `machineSpeed === 100`, `powerShards === 0`, `allowRemainder === true`, `autoCreated === false`, `rows === 0`, `rowSpacing === DEFAULT_ROW_SPACING`, and a non-empty `id`

#### Scenario: R1.S2 — Explicit options override defaults and are normalized
- **WHEN** `new AssemblyLine({ recipe, rate: 30, machineSpeed: 250, powerShards: 3, rows: 2.7, rowSpacing: -5, id: "fixed" })` is constructed
- **THEN** `machineSpeed === 250`, `powerShards === 3`, `rows === 2` (floored), `rowSpacing === 0` (clamped), and `id === "fixed"`

### Requirement: R2 — All construction sites use the options object
No positional `new AssemblyLine(...)` call SHALL remain in `app/` or `tests/`. Every construction site (models, components, and tests) SHALL pass the options object.

#### Scenario: R2.S1 — No positional constructor calls remain
- **WHEN** `app/` and `tests/` are searched for `new AssemblyLine(` calls
- **THEN** every match passes a single object literal argument; none pass a bare positional `recipe, rate, …` list

### Requirement: R3 — rows deserialize default unified to auto
`factory-storage` deserialization SHALL default a missing persisted `rows` to `0` (the auto sentinel) at every assembly-line construction site, including the nested-factory (FactoryRecipe) branch. The prior `rows ?? 1` in the nested-factory branch is replaced by `rows ?? 0` (or equivalently omitting `rows` to take the constructor default).

#### Scenario: R3.S1 — Nested-factory line defaults to auto
- **WHEN** a serialized nested-factory assembly line with no `rows` field is deserialized
- **THEN** the resulting `AssemblyLine.rows === 0` (was `1` before this change)

#### Scenario: R3.S2 — effectiveRows is invariant to rows on FactoryRecipe lines
- **WHEN** `effectiveRows` (node-size) is evaluated for a FactoryRecipe-backed line with `rows === 0` and again with `rows === 1`
- **THEN** it returns `1` in both cases — confirming the `?? 1` → `?? 0` change is inert for nested lines (this is why R3.S1 causes no rendered change)

#### Scenario: R3.S3 — All deserialize sites agree
- **WHEN** `factory-storage.ts` is inspected
- **THEN** no assembly-line construction defaults `rows` to `1`; all use `0` (auto)
