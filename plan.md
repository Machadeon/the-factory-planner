# Satisfactory Planner — Roadmap

Planned major changes, with notes on how each fits the existing domain model
(`Factory → ProductionLine → AssemblyLine → Recipe`) and state model (all state in `FactoryComponent`, mutations
committed via `factory.update()`).

---

## Backlog

### Features to implement

- manually set factory icon (instead of always deriving it from the first product)
- auto-production-line filler based on customizable aspects
  - raw resource availability
  - default/custom point scores (based on part cost + power usage + space/buildings required + tech limits)
- When an assembly line is slooped, the enclosing production line's output rate should be the slooped color
- When a new factory is created, disable autosave until the factory is saved manually
- Make other factory names links in the suppliers list to enable easy navigation between linked factories
- Graphical view of factories and factory groups (with nodes being assembly lines and edges being logistics links, i.e.
  belts and pipes)
- Properly handle partial slooping (Power multiplier = (1 + filled slots / total slots)^2)
- We want to enable factories to supply each other, i.e. cycles

### Bugs to fix

- Ensure nothing displays "negative zero" (`-0`). Current sample is in the consumers list in FactoryOverviewComponent.
- Increase indentation of parts lines within suppliers list - currently it's hard to tell the difference between a
  factory row and a part row.
- No padding in "Add Recipe", "Use Factory", and "Supply from Factory" buttons. Adjust to match other buttons
- Rename "Use Factory" button to "Use Factory as Recipe"

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

### Supply-only mode

A factory can act as a **supplier** to another factory without being listed as an explicit production line. In supply
mode, the upstream factory's net outputs are treated as available inputs to the downstream factory — contributing to
raw-resource accounting — but the upstream factory's own raw-resource requirements are _not_ surfaced in the downstream
factory's input list. The downstream factory sees only the supplied parts, not the chain of resources behind them.

This contrasts with the full nested-factory mode above, where the upstream factory _is_ a production line and its
raw-resource footprint folds in. Supply mode is the lighter-weight option: "I built a copper wire factory elsewhere;
just treat its output as free copper wire here."

Implementation sketch:

- Add a `suppliers: FactoryRef[]` list to `Factory`.
- When computing `allInputs()`, subtract any part quantities covered by a supplier's `allOutputs()`.
- Supplier raw-resource costs are intentionally omitted from the downstream factory's overview.

### Open problems

- **Cycles**: a factory must not contain itself (directly or transitively). Need cycle detection at insert time (applies
  to both full nesting and supply-only mode).
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
- `allowRemainder` — boolean (default `true`). When `false`, all machines run at a uniform clock and no remainder
  machine is used.

A per-assembly-line boolean `allowRemainder` (default `true`) controls whether a remainder machine is permitted:

- **`allowRemainder = true`**: the standard bank + remainder model. One remainder machine runs at a reduced clock to
  cover leftover throughput.
- **`allowRemainder = false`**: all machines run at the same clock. Machine count is `ceil(rate / perMachineAtSpeed)`,
  and the clock is back-solved so that exactly `machineCount` machines at that speed hit the target rate. This gives a
  clean uniform bank at the cost of a slightly higher clock (and thus more power per machine).

Machine count and the remainder are **derived** from the target `rate`, not stored:

- Per-machine completions/min at clock `s` (fraction): `perMachine = (60 / recipe.processingTime) * s`.
- `fullMachines = floor(rate / perMachineAtSpeed)`.
- If `allowRemainder`: one remainder machine at whatever reduced clock covers the leftover throughput (its clock ≤
  `machineSpeed`).
- If `!allowRemainder`: `machineCount = ceil(rate / perMachineAtSpeed)`; actual uniform clock =
  `rate / (machineCount * baseRate)` where `baseRate = 60 / recipe.processingTime`.

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

- Per-assembly-line: machine-count display (e.g. "8 × 200% + 1 × 150%"), a speed input (validated against `maxSpeed`), a
  power-shard selector (0–3), and a toggle for whether a remainder machine is allowed. When remainder is disabled, the
  display shows a single uniform count and clock (e.g. "9 × 167%").
- Each clock value (bank speed and remainder speed, when shown) has a **copy button** that writes the speed to the
  clipboard in the format `###.#####%` (e.g. `166.66667%`) so the user can paste it directly into the game's clock input
  field.

---

## 4. Power tracking

Compute power from machine count, speed, and sloop state. Purely derived — no new stored state beyond §3.

### Inputs already available

- `Building.basePowerUsage`, and for variable-power buildings (`variablePowerUsage`, `minPowerUsage`, `maxPowerUsage`) —
  also mirrored on `Recipe` (`customPowerUsage`, `minPowerUsage`, `maxPowerUsage`).

### Formula

- Overclock power scales **non-linearly** in Satisfactory: `power = basePower * (speed ^ 1.321928)` per machine
  (exponent ≈ log2(2.5)).
- Somersloop amplification multiplies power (production amplifier draws far more power — typically `* (2 ^ 2)` style
  scaling for 2x output).
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
