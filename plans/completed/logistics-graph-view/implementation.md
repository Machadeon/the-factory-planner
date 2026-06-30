# Implementation Plan — Logistics Graph View

Ordered, independently verifiable steps. Each step lists files, reuse, and its
validating ACs. Commit at the end of each step (tests green before moving on).

## Step 0 — Dependency

- `npm i @xyflow/react` (v12; supports React 19 / Next 16). Client-only.
- Import its CSS once in the graph view (`@xyflow/react/dist/style.css`).

## Step 1 — R9: integer factory-recipe instances (model; commit FIRST, isolated)

Files: `app/models/factory.tsx`, the factory-recipe rate-entry component
(`app/components/NestedFactoryRow.tsx` / `AssemblyLineControls.tsx` — locate the input
that writes a factory-recipe `al.rate`).

- In `createBaseModel`, while building `variables`, collect the slugs of any recipe with
  `isFactoryRecipe` (slug starts `factory:`) and set `model.ints[slug] = 1`. Carries
  through `structuredClone` in `optimizeRecipes` (max model + final model) automatically.
- `autoCalculateRates` uses `createBaseModel`, so it inherits the `ints`. Verify the
  two-phase recipe optimizer still works (max clone then equal-constraint solve).
- UI: when the user types a rate for a factory-recipe line, round/clamp to a
  non-negative integer before `setPartProductionRate`/`factory.update()`.
- Expected: MILP. A fixed `equal` target unreachable with whole instances returns
  `feasible=false` → existing `solverError = "No feasible solution"` (synchronous). No
  new UI.

Verifies: AC3, AC5 (now pass), AC4 (still passes). Risk: MILP slower / possible freeze
on large factories (pre-existing backlog) — only factory-recipe vars are integer, so
bounded.

## Step 2 — R7: stable id, rows, graphLayout, schema 5 (model + storage)

Files: `app/models/assembly-line.tsx`, `app/models/factory.tsx`,
`app/models/factory-storage.ts`, `app/models/production-line.tsx` (no change needed if
ctor stays back-compatible).

- `AssemblyLine`: add `id: string` as an **optional last constructor param** defaulting
  to `crypto.randomUUID()` (existing call sites unchanged); add field `rows = 1`
  (settable; clamp 1..machineCount in the rows UI, not in the model).
- `Factory`: add `graphLayout: { [nodeId: string]: { x: number; y: number } } = {}`;
  copy it in `constructor(oldFactory)`; it is plain data, untouched by `_updateRates`.
- `factory-storage.ts`:
  - `CURRENT_SCHEMA_VERSION = 5`.
  - `SerializedAssemblyLine`: add `id?: string`, `rows?: number`.
  - `SerializedFactory`: add `graphLayout?: Record<string, {x,y}>`.
  - `serializeFactory`: emit `al.id`, `al.rows` (omit when 1), `factory.graphLayout`
    (omit when empty). Factory-recipe branch also emits `id`/`rows`.
  - `deserializeFactory` + `deserializeFactoryStub`: pass stored `id` (or generate),
    set `al.rows = alData.rows ?? 1`, set `factory.graphLayout = data.graphLayout ?? {}`.
  - `migrateAssemblyLineRaw`: default `rows` to 1 (id generated at deserialize).

Verifies: AC1, AC6, AC7.

## Step 3 — R2.6: FactoryRecipe footprint

File: `app/models/factory-recipe.ts`.

- Add `footprintAreaPerInstance: number`. In the constructor compute via a helper
  `factoryFloorArea(factory, depth = 0)` (depth-capped): sum over each production line's
  assembly lines — for a normal recipe, `machineCount × building.size.width ×
  building.size.length` (machineCount from `al.getMachineCount()`); for a nested
  factory-recipe line, `al.rate × nested.footprintAreaPerInstance` (or recurse). The in-
  memory nested `factory` is acyclic (`deserialize` stubs cycles), but cap depth anyway.

Verifies: AC2.

## Step 4 — Pure graph helpers (R4.2, R4.4, R8.1)

New file: `app/components/logistics/graph-layout.ts` (matches the test import path):

- `MIN_EDGE_WIDTH`, `MAX_EDGE_WIDTH`, `edgeWidth(rate)` =
  `clamp(MIN, MAX, A + B * Math.log(rate + 1))`.
- `buildPartEdges({ producers, consumers })`: 1×1 → single edge of the shared rate;
  multiple producers → each consumer's demand split evenly across producers (P×C edges,
  rate = consumerRate / producers.length). No crash on empty sides.
- `assignColumns({ nodes, edges })`: longest-path column index from sources; sources
  forced leftmost, sinks rightmost; visited-set + depth cap so cycles terminate.

New file: `app/components/logistics/graph-model.ts`:

- `buildGraphModel(factory, { library, currentFactoryId })` → `{ nodes, edges }`.
  Node kinds + id scheme: assembly (`al.id`), source (`_src_<slug>` from
  `factory.allInputs()` minus supplier-covered), sink (`_sink_<slug>` from
  `factory.allOutputs()` minus consumer-covered), supplier (`_supplier_<id>` from
  `factory.supplierFactories`), consumer (`_consumer_<id>` derived exactly like
  `FactoryOverviewComponent`: library factories whose `supplierIds` include
  `currentFactoryId`, deserialized, net-consuming an output). Edges per part via
  `buildPartEdges`, tagged belt/pipe by `part.fluid || part.gas`, width via `edgeWidth`.

Reuse: `factory._assemblyLineLookup`, `getPartProductionRate/Consumption`,
`allInputs/allOutputs`, `deserializeFactory`.

Verifies: AC17, AC18, AC23.

## Step 5 — Custom node/edge components (R2, R3)

New files under `app/components/logistics/`:

- `constants.ts`: `SCALE` (px/m), `MIN_NODE_W/H`, grid size.
- `PartPort.tsx`: a React Flow `Handle` + part `Icon`; rounded square for solids, circle
  for `fluid||gas`; rate label; byproduct variant (distinct color/border).
- `AssemblyLineNode.tsx`: header (building icon, recipe name, machine count from
  `getMachineCount()`), body sized `(cols×w)×(rows×l)×SCALE` clamped to MIN; input ports
  left, output ports right; rows control (number input/stepper, 1..machineCount) → sets
  `al.rows` + `factory.update()`. Factory-recipe variant: title is a link
  (`onNavigateToFactory(nestedId)`), body sized from `footprintAreaPerInstance × rate`,
  factory-icon/border marker.
- `TerminalNode.tsx`: source/sink node (part icon, rate, lighter style).
- `FactoryLinkNode.tsx`: supplier/consumer node (factory icon + name, link affordance,
  `onNavigateToFactory(id)`), visually distinct from raw terminals.
- `LogisticEdge.tsx`: custom edge; `strokeWidth = edgeWidth(rate)`; belt vs pipe style
  (pipe uses fluid color / distinct dash).

Reuse: `Icon.tsx`.

Verifies (integration, jsdom — mock `@xyflow/react` where canvas render is unneeded;
assert on the React subtree we own: ports, markers, link handlers): AC9, AC10, AC11,
AC12, AC13, AC14, AC15, AC16.

## Step 6 — LogisticsSection rewrite + wiring (R1, R5, R6)

Files: `app/components/LogisticsSection.tsx` (rewrite),
`app/components/FactoryComponent.tsx` (pass new props).

- Props: `{ factory, library, currentFactoryId, onNavigateToFactory }`.
- `"use client"`. Render `<ReactFlow nodeTypes edgeTypes snapToGrid snapGrid=[GRID,GRID]>`
  with `<Controls/> <MiniMap/> <Background/>`. Build nodes/edges from `buildGraphModel`;
  positions from `factory.graphLayout`, falling back to `assignColumns` for any missing
  node — write computed positions back into `factory.graphLayout` once (don't clobber
  user moves).
- `onNodeDragStop`: write snapped position to `factory.graphLayout[id]`, call
  `factory.update()` (persists via existing autosave).
- Maximize: toggle a `fixed inset-0 z-50` full-viewport container (Esc / button to
  restore); graph interactive in both states.
- Empty factory (no production lines): render `data-testid="logistics-empty"` empty-state.
- `FactoryComponent`: `<LogisticsSection factory library currentFactoryId
  onNavigateToFactory={handleNavigateToFactory} />`.

Verifies: AC8; enable AC19–AC22 e2e (remove `fixme`).

## Step 7 — Full verification

- `npm run lint-fix`, `npm run test:run`, `npm run test:e2e` (dev server up).
- `lighthouse_audit` on the Logistics tab (UI changed). Visual check: belt/pipe styles
  (R4.3), source/sink lighter styling (R3.3), edge→port handles (R4.5).

## Change order / independence

1. Step 1 (R9) — standalone model change, own commit (R9.6).
2. Step 2 (schema) — standalone, own commit; unblocks persistence tests.
3. Step 3 (footprint) — standalone, own commit.
4. Steps 4–6 — graph view; commit per step where green.
5. Step 7 — final suite + audit.

## Schema / data-format changes

- `CURRENT_SCHEMA_VERSION` 4 → 5. Additive + back-compatible: missing `id` generated,
  `rows` defaults 1, `graphLayout` defaults `{}`. No destructive migration. Export/import
  bundles carry the new fields through the existing remap path unchanged.

## Known risks / side effects

- MILP (Step 1) can be slower and can flip a previously-feasible fixed target to
  infeasible (surfaced via `solverError`; intended).
- React Flow is client-only — `LogisticsSection` already `"use client"`; ensure no SSR
  of the canvas. jsdom can't lay out the canvas; integration tests mock `@xyflow/react`.
- Large factories: many nodes/edges; rely on zoom/minimap, not optimized this iteration.
- Adding `id` to `AssemblyLine` touches serialization equality — confirm round-trip and
  that autosave diffing isn't churned (ids are stable once assigned).
