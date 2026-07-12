# Satisfactory Planner — Roadmap

Planned major changes

## Backlog

### Features

- enable the user to create "worlds/saves" which are effectively folders of factories
- add the ability to set default constraints for a folder/world/save
- support custom game modes such as randomized resource nodes, recipe cost, power usage, etc.
- add map view tab where user can select which nodes to use for a factory/place the factory on the map
  - model update: raw resources come from available nodes, determine maximum rates from available miners, calculate power consumption
- enable the user to adjust where assembly line inputs are on the node, define factory boundaries, and where sources/sinks are on factory boundaries
  - truck depots/roads, train stations/rails, drone ports
- enable the user to lay out their factories in 3 dimensions

### Improvements

- Logistics auto-layout is still bad. Need an algorithm that minimizes crossing edges and keeps edges from going behind nodes.
- When a node has too many buildings to render all of them, just render the buildings on the border
- Audit all model interfaces and how their fields and methods are used. Ensure proper interfaces (e.g. no protected member access). Applies to **every** model in the repo — `Factory`, `ProductionLine`, `AssemblyLine`, `Recipe`/`FactoryRecipe`, `Part`, `Building` — not just `Factory`. *(Tracked as **D2** in [plan-order.md](./plan-order.md) — 2026-07-12 backlog consolidation.)*
  - **Problem:** components reach into protected/underscore-prefixed fields directly. Known offenders on `Factory`: `rateLookup` (FactoryContext, Suppliers/Intermediates/Inputs sections, logistics `graph-model`), `_assemblyLineLookup` (`PartRateSummary`), `_mainOutputParts` (`graph-model`). Others (`_productionLineLookup`, `_partsConsumed`, `_partsProduced`) are currently model-internal but unprotected by convention only.
  - **Fix:** expose intent-revealing public read accessors (e.g. `getPartRate(slug)`, `getAssemblyLinesFor(slug)`, `isMainOutput(part)`) and route all component reads through them; keep the underscore fields as private backing store. Writes stay behind mutation methods (the M4 mutation contract) — this item is the read-side counterpart.
  - **valtio caveat (why this is safe):** read methods do **not** break reactivity. valtio preserves the class prototype on snapshots, and property gets inside a method called on the snapshot are tracked exactly like direct field reads — the established pattern is `AssemblyLine.getPartProductionRate()`. Requirement: render-path read methods must be called on the **snapshot**, mutators on the **proxy** (reads-from-snapshot / writes-to-proxy). Backing fields that a public read accessor touches must stay tracked (never `ref()`-exempt).

### Optimizations

- Why is deserializeFactory being called in a render thread? (Discovered in Task 5) *(= codebase-improvements #8 deserialization caching — tracked as E3; don't fix twice)*
- prevent occasional freeze for some optimization runs (run solver on background thread, time out, display error) *(= codebase-improvements #6 — tracked as E2)*
