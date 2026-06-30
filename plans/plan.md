# Satisfactory Planner — Roadmap

Planned major changes, with notes on how each fits the existing domain model (`Factory → ProductionLine → AssemblyLine → Recipe`) and state model (all state in `FactoryComponent`, mutations committed via `factory.update()`).

## Backlog

### Features

- auto-generate new factory names based on bank of adjectives and nouns (see @app/models/factory-names.ts).
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

### Optimizations

- Why is deserializeFactory being called in a render thread? (Discovered in Task 5)
- prevent occasional freeze for some optimization runs (run solver on background thread, time out, display error)
- make everything client-side
