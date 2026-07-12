# factory-session

## MODIFIED Requirements

### Requirement: R2 — root snapshot as re-render trigger
`FactoryPage` SHALL call `useSnapshot` once on the proxy container as a re-render trigger only; children SHALL receive the proxy (`store.factory` and objects reached through it), not snapshot objects, so reads and model-method mutations work unchanged. All mutations SHALL go through model methods on the proxy; the enforceable mutation contract (no direct field writes, no direct `update`/`autoCalculateRates`/`optimizeRecipes` calls) is owned by the `factory-mutation-methods` capability (R4), which this requirement defers to. Reads SHALL come from snapshots; writes SHALL target the proxy.

#### Scenario: R2.S1 — mutation re-renders the page
- **WHEN** a model mutation occurs on the proxy (e.g. a production line rate changes)
- **THEN** `FactoryPage` re-renders and children receive updated data, with no call to a manual version counter

## REMOVED Requirements

### Requirement: R3 — transitional recompute-only update shim
**Reason**: M4 internalizes derived-state recompute into the model mutators, so the `Factory.update` field and its transitional shim are deleted. Render notification is now pure valtio proxy behavior.

**Migration**: `useFactorySession` no longer assigns `factory.update`; the `update` field is removed from `Factory`. Every former `factory.update()` caller (model-internal and component) is replaced: model mutators end with their own recompute (`_updateRates` / re-solve), and components call named model mutators (`factory-mutation-methods` R4/R5). The dead `rebuild()` swap in `useFactorySession` and the `new Factory(oldFactory)` copy constructor it depended on are deleted; the copy-construction path's absence is verified by `factory-mutation-methods` R1.S2, so no reference-aliasing between a swapped-out and swapped-in factory can occur by construction.
