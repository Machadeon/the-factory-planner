# Satisfactory Planner — Architecture Roadmap

Planned major changes, with notes on how each fits the existing domain model
(`Factory → ProductionLine → AssemblyLine → Recipe`) and state model (all state in `FactoryComponent`, mutations
committed via `factory.update()`).

---

## Smaller backlog

### Features to implement

- expand/collapse all button for assembly lines
- auto-production-line filler based on customizable aspects
  - raw resource availability
  - default/custom point scores (based on part cost + power usage + space/buildings required + tech limits)

### Bugs to fix

- _(none recorded yet)_

---

## 1. Save / load factories

Let users persist factories and switch between them, plus export/import.

### Storage

- Primary store: **`localStorage`** (not cookies). It's the modern standard for client-only persisted state: ~5MB per
  origin, simple synchronous string API, and unlike cookies it isn't sent to a server on every request. Cookies cap at
  ~4KB _per cookie_ and are the wrong tool for app state.
- A single factory is small (a list of `{recipeSlug, rate, slooped, speed, shards}` ≈ ~80 bytes/line, so a typical
  factory ≈ 1–2.5KB), so it would usually fit a cookie — but the saved-_library_ of many factories blows past 4KB
  easily, which is the other reason to prefer `localStorage`.
- Serialize each `Factory` to a plain JSON shape — the live model holds non-serializable bits (`update` callback, lookup
  indices, resolved `Part` / `Recipe` / `Building` object references), so we need an explicit serialize/deserialize
  layer rather than `JSON.stringify(factory)`.

### Serialization format

- Store only stable identifiers, not resolved objects:
  - production lines → `part.slug`, `rate`, `outputRate`, flags
  - assembly lines → `recipe.slug`, `rate`, `slooped`, plus the new §3 fields `machineSpeed` and `powerShards`
- On load, rehydrate by looking slugs back up through `library.tsx` (`partSlugLookup`, `recipeLookup`). Unknown slugs
  (e.g. game data changes) should fail gracefully per-line rather than dropping the whole factory.
- Version the format (`schemaVersion`) so future model changes can migrate old saves.

### Export / import

- Export: download serialized JSON (single factory and/or whole library).
- Import: file picker / paste, validated against `schemaVersion`, with slug-resolution errors surfaced to the user.

### UI

- A factory switcher (list of saved factories with the existing `icon`).
- Save / rename / delete / duplicate actions.
- Export / import buttons.

---

## 2. Nested factories (factory-as-recipe)

Allow a saved factory to stand in where a single recipe normally would, so a factory's net inputs→outputs behave like a
composite recipe.

### Model

- Introduce a `Recipe`-like adapter that wraps a `Factory` and exposes its net external inputs/outputs as
  `ingredients`/`products`. The factory's net balance (`allInputs()` / `allOutputs()`) already computes exactly this.
- `AssemblyLine` currently holds `readonly recipe: Recipe`. To reuse assembly lines, either:
  - make the wrapper conform to the `Recipe` interface (duck-typed `ingredients`, `products`, `getProduct`,
    `getIngredient`, `building`, `processingTime`), or
  - introduce a shared interface both `Recipe` and `FactoryRecipe` implement. The latter is cleaner given how many call
    sites read `assemblyLine.recipe.*`.

### Rate scaling

- A nested factory needs a scale factor (how many copies / what throughput). `AssemblyLine.rate` (completions/min) maps
  to "how many instances of the nested factory," with net part rates scaled accordingly.

### Open problems

- **Cycles**: a factory must not contain itself (directly or transitively). Need cycle detection at insert time.
- **LP solver** (`autoCalculateRates`): variables are keyed by `recipe.slug` with coefficient maps of net part rates. A
  factory-recipe slots in naturally as one more variable whose coefficients are the factory's net rates — as long as
  intermediate parts internal to the nested factory are _not_ exposed as constraints. Confirm the net-rate adapter hides
  internals.
- **Power / machine counts** (§3, §4) should aggregate up from the nested factory rather than treat it as a single
  machine.

---

## 3. Machine count + machine speed per assembly line

Display machines required, and make machine speed (clock) a per-assembly-line setting that fully determines machine
count.

### Model: a bank of identical machines + one remainder

An assembly line is a **bank of identical machines** running at a uniform clock, optionally plus a single **remainder
machine** at a reduced clock to cover the leftover. This matches how players actually build: either all machines at the
same clock (remainder absent), or N machines at a round clock + 1 underclocked.

Stored per `AssemblyLine`:

- `machineSpeed` — the clock the main bank runs at (the round value the user picks: 100 / 150 / 200 / 250%; default
  100%).
- `powerShards` — integer **0–3**. Each shard raises the max clock by 50%, so `maxSpeed = 100 + 50 * powerShards` (0
  shards → 100%, 3 shards → 250%). The 0–250% range is _gated_ by shards, not free. Shards apply **uniformly** to the
  whole bank.

Machine count and the remainder are **derived** from the target `rate`, not stored:

- Per-machine completions/min at clock `s` (fraction): `perMachine = (60 / recipe.processingTime) * s`.
- `fullMachines = floor(rate / perMachineAtSpeed)`.
- one remainder machine at whatever reduced clock covers the leftover throughput (its clock ≤ `machineSpeed`).

### Shard accounting

- Total shards = `fullMachines * powerShards` plus the remainder machine's requirement. The remainder runs at a _lower_
  clock, so it may need fewer shards than the bank — final shard count takes the remainder's clock into account and
  adjusts (e.g. remainder at ≤100% needs 0 shards even if the bank uses 3).

### Sloop interaction

- Somersloops already halve stored `rate` (see `setSlooped`). Machine-count math must use the _physical_ completion
  rate, not the sloop-adjusted one — careful to derive count from un-sloop-doubled throughput. Reconcile with
  `getPartProductionRate()` semantics.
- **Slooped lines auto-clock to 250%.** Somersloops are the only truly limited resource in the game, so a slooped line
  should always run its machines at max clock to minimize the machine (and thus sloop) count. Setting `slooped` should
  force `machineSpeed = 250` (and therefore `powerShards = 3`, since 250% requires 3 shards). This is a sensible default
  applied when slooping is enabled, but the user can always manually override the clock afterward (the line stays
  slooped at the lower clock).

### UI

- Per-assembly-line: machine-count display (e.g. "8 × 200% + 1 × 150%"), a speed input (validated against `maxSpeed`),
  and a power-shard selector (0–3).

---

## 4. Power tracking

Compute power from machine count, speed, and sloop state. Purely derived — no new stored state beyond §3.

### Inputs already available

- `Building.basePowerUsage`, and for variable-power buildings (`variablePowerUsage`, `minPowerUsage`, `maxPowerUsage`) —
  also mirrored on `Recipe` (`customPowerUsage`, `minPowerUsage`, `maxPowerUsage`).

### Formula

- Overclock power scales **non-linearly** in Satisfactory: `power = basePower * (speed ^ 1.321928)` per machine
  (exponent ≈ log2(2.5)). Confirm against current game patch before hardcoding.
- Somersloop amplification multiplies power (production amplifier draws far more power — typically `* (2 ^ 2)` style
  scaling for 2x output). Verify exact multiplier per current game data.
- Line power follows the §3 bank + remainder model: `fullMachines * powerAt(machineSpeed) + powerAt(remainderClock)`.
  The bank and the remainder machine run at different clocks, so they're priced separately rather than as a single
  `machineCount * perMachinePower`.

### Aggregation + UI

- Sum per assembly line → per production line → factory total.
- Surface in `FactoryOverviewComponent` (sidebar) alongside inputs/outputs.
- Nested factories (§2) contribute their aggregated power.

---

## Cross-cutting notes

- **Serialization (§1) must cover the new fields** from §3 (`machineSpeed`, `powerShards`) and any nested-factory
  references from §2.
- **`update()` discipline**: every new mutation path (load, speed change, nested insert) must funnel through
  `factory.update()` to trigger reconciliation.
- **Game-data constants** (overclock exponent, sloop power multiplier) should live alongside `library.tsx`/`data.json`
  parsing, not be scattered as magic numbers.
- **Suggested order**: §3 (machine speed/count) → §4 (power, builds on §3) → §1 (save/load) → §2 (nested factories, most
  invasive to the LP solver and `AssemblyLine`).
