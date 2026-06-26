# Satisfactory Planner — Roadmap

Planned major changes, with notes on how each fits the existing domain model
(`Factory → ProductionLine → AssemblyLine → Recipe`) and state model (all state in `FactoryComponent`, mutations
committed via `factory.update()`).

---

## Backlog

### Features to implement

- auto-production-line filler based on customizable aspects
  - raw resource availability
  - default/custom point scores (based on part cost + power usage + space/buildings required + tech limits)
- Graphical view of factories and factory groups (with nodes being assembly lines and edges being logistics links, i.e.
  belts and pipes)
- add the ability to set constraints such as maximum throughput of a part, resource limits, etc.
- add the ability to maximize a given part's output rate
- adjust a factory to be a list of output parts and recipes rather than a list of production lines/assembly lines.
  Alternatively this could be a completely separate factory builder UI, called "auto mode" or "lazy mode". Current is
  called "manual mode".

### Bugs to fix

- expand/collapse all is slow for large factories
