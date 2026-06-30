# Spec: Logistics Graph View

## Goal

Replace the `LogisticsSection` placeholder with an interactive, graphical, top-down
view of the current factory. Assembly lines are nodes sized to their real physical
floor footprint; part flows between them are belts/pipes whose thickness scales
log-proportionally with throughput. Nodes are draggable, snap to a grid, and the
whole view can be maximized to fill the page.

## Scope

In scope:

- New graph view rendered in the existing **Logistics** tab (`LogisticsSection`).
- Built on **React Flow** (`@xyflow/react`) with custom node + edge types.
- Node positions persisted in the factory (serialized), surviving reload/export.
- Maximize-to-fullscreen toggle.

Out of scope (this iteration):

- Editing the factory from the graph (add/remove lines, change recipes/rates). The
  graph is **read-only for factory data**; only node positions are editable.
- Sub-factory (`FactoryRecipe`) internal expansion. A supplier/nested-factory
  assembly line renders as a single node like any other.
- Precise per-edge flow allocation when a part has multiple producers AND multiple
  consumers (see Edge rules below for the v1 approximation).

## Definitions

- **Assembly-line node**: one node per `AssemblyLine` across all production lines.
- **Source node**: one node per raw/imported input part the factory consumes but does
  not produce (`factory.allInputs()`).
- **Sink node**: one node per net output part (`factory.allOutputs()`).
- **Port**: a small icon on a node representing one recipe ingredient (input port,
  left edge of node) or product (output port, right edge of node).

## Requirements

### R1 — Tab content

R1.1 The Logistics tab renders the graph view instead of the placeholder text.
`LogisticsSection`'s props expand from `{ factory }` to also receive `library`,
`currentFactoryId`, and `onNavigateToFactory` (already available in `FactoryComponent`)
so supplier/consumer factory nodes (R3.4–R3.6) and node navigation can be wired.
Consumer factories are derived the same way the overview's Consumers section does:
library factories whose `supplierIds` include `currentFactoryId`, deserialized, with
net consumption of one of this factory's outputs.

R1.2 When the factory has zero production lines, the graph shows an empty-state
message (no nodes), not a crash.

### R2 — Assembly-line nodes

R2.1 One node per `AssemblyLine`. Node shows: building icon, recipe name, and machine
count (from `assemblyLine.getMachineCount()` — `fullMachines` + remainder, or
`machineCount`).

R2.2 **Physical size.** The node body represents the real floor footprint:
`building.size.width` × `building.size.length` (meters) per machine, tiled across the
machine count. The user picks how many **rows** of machines the bank occupies; the
bank is laid out as `rows` × `ceil(machineCount / rows)` machines. Body pixel size =
`(cols × width_m) × (rows × length_m) × SCALE`, where `SCALE` is a fixed px-per-meter
constant. A configurable per-node `rows` value (default 1) is stored on the assembly
line. A minimum body size guarantees ports/labels remain legible for tiny banks.

R2.3 **Rows control.** Each node exposes a control to set its `rows` (1..machineCount).
Changing it resizes the node and persists.

R2.4 **Ports.** Each recipe ingredient is an input port on the node's left edge; each
recipe product is an output port on the right edge. A port renders the part icon: a
**rounded square** for solid items, a **circle** for fluids/gases (`part.fluid ||
part.gas`). Port shows the part's flow rate for this line
(`getPartConsumptionRate` / `getPartProductionRate`).

R2.5 **Byproducts.** A product that is not the production line's primary part (i.e. any
recipe product beyond the one the line exists to make) is visually distinct from the
primary output port (e.g. distinct color/border + a "byproduct" affordance), so
byproducts are unmistakable at a glance.

R2.6 **Factory-as-recipe nodes.** An assembly line whose recipe is a `FactoryRecipe`
(a nested/sub-factory used as a recipe) renders as an assembly-line node like any
other, but:

- Its title is a **clickable link** navigating to that nested factory
  (`onNavigateToFactory`).
- Its physical size represents the nested factory's **total floor footprint**: the
  summed footprint area of every machine inside the nested factory, multiplied by the
  integer instance count (R9). The node body is sized from this area (e.g. a square of
  side `sqrt(totalArea) × SCALE`). `FactoryRecipe` exposes a footprint-area-per-instance
  value, computed recursively over its own (possibly nested) assembly lines.
- It is visually marked as a sub-factory (factory icon / distinct border) to separate
  it from a single-building machine node.

### R3 — Source & sink nodes

R3.1 One source node per part in `factory.allInputs()`, rendered as the part icon
(rounded square / circle by fluid) labeled with the input rate. It connects to the
input ports that consume that part.

R3.2 One sink node per part in `factory.allOutputs()`, rendered likewise, labeled with
net output rate. Output ports producing that part connect to it.

R3.3 Source/sink nodes are visually lighter than assembly-line nodes (they are
terminals, not machines).

R3.4 **Supplier factory nodes.** Each supplier in `factory.supplierFactories`
(`FactoryRecipe`) renders as a distinct source-type node — visually different from a
raw-resource source — feeding the parts it supplies into the consuming input ports.
It is a clickable link that navigates to that supplier factory
(via the existing `onNavigateToFactory` path).

R3.5 **Consumer factory nodes.** Each other library factory that pulls one of this
factory's outputs (the same set surfaced by the overview's Consumers section) renders
as a distinct sink-type node — visually different from a default net-output sink —
connected from the producing output ports. It is a clickable link navigating to that
consumer factory.

R3.6 Supplier/consumer factory nodes are visually distinguished from default
raw-source / net-output sink nodes (e.g. factory icon + link affordance) so the user
can tell a cross-factory flow from a raw input or final output.

### R4 — Edges (belts & pipes)

R4.1 For each part, draw edges from producing output ports to consuming input ports.
A producer here includes assembly-line output ports and source nodes; a consumer
includes assembly-line input ports and sink nodes.

R4.2 **Width.** Edge stroke width is log-proportional to the flow rate on that edge:
`width = clamp(MIN_W, MAX_W, A + B * log(rate + 1))`. Constants chosen so a 1/min belt
and a 1000/min belt are clearly different but both visible.

R4.3 **Belt vs pipe.** Solid-item edges (belts) and fluid/gas edges (pipes) are
visually distinguished (e.g. pipes use the fluid color / a distinct style).

R4.4 **Multi producer/consumer (v1 approximation).** When a part has one producer and
one consumer, a single edge carries the full shared rate. When there are multiple
producers and/or consumers, draw an edge per (producer, consumer) pair for that part;
each edge's rate is the consumer port's demand split evenly across the producers of
that part. Exact LP-accurate allocation is out of scope; this approximation must still
keep total widths visually sensible and must not crash on cycles.

R4.5 Edges connect to the correct port (handle) on each node, not just the node center.

### R5 — Interaction

R5.1 Nodes are draggable.

R5.2 Dragging snaps to a grid (React Flow `snapToGrid` / `snapGrid`).

R5.3 Pan and zoom are available (React Flow default + zoom controls).

R5.4 Moving a node persists its new position via `factory.update()`.

### R6 — Maximize

R6.1 A control toggles the graph between its in-tab size and a full-viewport overlay
covering the whole page (above the header/sidebar). A second toggle/Esc restores it.

R6.2 In both states the graph remains fully interactive.

### R7 — Persistence

R7.1 Node positions persist in the serialized factory and survive reload, save/load,
and export/import.

R7.2 Each `AssemblyLine` gains a stable `id` (generated UUID, auto-generated in the
constructor as an optional last param so existing call sites are unchanged) so layout
keys are unique even when two lines share a recipe slug. Source/sink layout keys are derived
from the part slug (`_src_<slug>`, `_sink_<slug>`); supplier/consumer factory node
keys are derived from the factory id (`_supplier_<id>`, `_consumer_<id>`).

R7.3 The serialized factory stores `graphLayout`: a map from node id (assembly-line
id, or `_src_/_sink_` key) to `{ x, y }`. The per-line `rows` value is stored on the
serialized assembly line.

R7.4 `CURRENT_SCHEMA_VERSION` is bumped (4 → 5). Migration: factories without
`graphLayout`/assembly-line `id`s/`rows` deserialize cleanly — assign fresh ids,
default `rows` = 1, and run **auto-layout** for any node lacking a saved position.

### R8 — Auto-layout

R8.1 Nodes without a stored position get an automatic layered left-to-right layout:
source nodes on the left, sinks on the right, assembly lines ordered by their depth in
the part-flow graph. Cycles must not hang or crash (depth capped).

R8.2 Auto-layout positions are written into `graphLayout` once computed so subsequent
loads are stable and the user's manual moves are never overwritten.

### R9 — Integer factory-recipe instances (model change)

R9.1 A `FactoryRecipe` assembly line's `rate` represents a count of whole nested-factory
instances and must be a **non-negative integer** everywhere — you cannot build a
fraction of a physical sub-factory.

R9.2 The LP solvers (`autoCalculateRates`, `optimizeRecipes`) must treat factory-recipe
variables as **integer** (MILP via the solver's `ints` support) so solved instance
counts are whole. Standard (building) recipes remain continuous.

R9.3 Any direct UI rate entry for a factory-recipe line rounds/clamps to a
non-negative integer.

R9.4 Risk/known impact: integer constraints make the model a MILP (slower, and can be
infeasible where a fractional solution existed). Concretely, a fixed `equal` output
target met partly by a sub-factory may have no whole-instance solution (e.g. 1.5
instances needed). **Expected behavior:** this surfaces through the existing
`solverError` path (the post-solve constraint verification already flags an unmet
equality) — no new UI. Rate balancing of parts a sub-factory consumes/produces is
computed from the integer instance count.

R9.6 **Separate verifiable task.** R9 has higher blast radius than the rest of the
feature (touches both LP solvers, every `FactoryRecipe` rate, all tabs). It is
implemented, tested, and committed as its **own step before** the graph node-sizing
that depends on integer instance counts, so it can be verified in isolation and the
graph work doesn't entangle the solver change.

R9.5 This applies factory-wide (not only in the graph view); existing tabs that show or
edit factory-recipe rates reflect integer instances after this change.

## Non-functional

- No regression to existing tabs; `LogisticsSection`'s prop contract may change but
  `FactoryComponent` wiring stays minimal.
- Runs client-side only (React Flow is a client component); no SSR of the graph.
- Reasonable performance for typical factories (≤ ~60 nodes). Very large factories may
  degrade gracefully (zoom/minimap) but are not optimized in this iteration.
- Follows repo conventions: one exported component per file, kebab-case models,
  PascalCase components, Biome clean, no comments unless non-obvious.

## Open questions (resolved)

- Renderer: **React Flow** custom nodes. ✔
- Position persistence: **serialized in factory**, schema bump. ✔
- Node size: **footprint × machine count, user-configurable rows**. ✔
- Source/sink: **dedicated source/sink nodes**, byproducts visibly distinct. ✔
