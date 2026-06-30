# Spec Review — Logistics Graph View

Reviewer note: the separate-agent reviewer could not run (session limit). Review done
inline against the actual code (`factory.tsx`, `assembly-line.tsx`, `factory-recipe.ts`,
`factory-storage.ts`, `FactoryComponent.tsx`, `FactoryOverviewComponent.tsx`). Re-run a
cold agent review when capacity returns.

## Concerns & resolutions

1. **[blocking → resolved] R9 + fixed `equal` targets can be infeasible.** Integer
   sub-factory instances may make a previously-feasible fixed output target unreachable
   (e.g. needs 1.5 instances). Resolved: R9.4 now states expected behavior — surfaced
   via existing `solverError` / post-solve verification, no new UI.

2. **[blocking → resolved] R9 blast radius.** Touches both LP solvers and every
   `FactoryRecipe` rate factory-wide. Resolved: R9.6 makes it its own implemented +
   tested + committed step, sequenced before graph node sizing.

3. **[non-blocking → resolved] R3.5 feasibility.** Confirmed: consumer factories are
   derivable exactly as `FactoryOverviewComponent` does it (library factories whose
   `supplierIds` include `currentFactoryId`, deserialize, net `rateLookup` consumption).
   Resolved: R1.1 documents the derivation + the expanded `LogisticsSection` props
   (`library`, `currentFactoryId`, `onNavigateToFactory`).

4. **[non-blocking → resolved] AssemblyLine `id` adds a field used at many construction
   sites** (`production-line.tsx`, `factory.tsx` materialize, storage). Resolved: R7.2
   auto-generates `id` in the constructor as an optional last param — existing call
   sites unchanged.

5. **[non-blocking] MILP performance.** `javascript-lp-solver` supports `ints`, but
   branch-and-bound is slower and there is a pre-existing "occasional solver freeze"
   backlog item. Accept for this iteration; flag in implementation risks. Only
   factory-recipe variables are integer (typically few), so impact is bounded.

6. **[non-blocking] FactoryRecipe footprint recursion.** Footprint-per-instance recurses
   over nested assembly lines that may themselves be `FactoryRecipe`s. `deserializeFactory`
   already breaks cycles (stub), so the in-memory nested `factory` is acyclic; recursion
   terminates. Implementation should still guard depth defensively.

7. **[non-blocking] Auto-layout (R8) underspecified.** Acceptable as an implementation
   detail; recommend a simple longest-path column assignment with a depth cap for cycles.

8. **[non-blocking] Large physical nodes.** A big machine bank (footprint × count) yields
   a large node. SCALE constant + min size + zoom/minimap handle it; not optimized
   further this iteration (matches non-functional scope).

## Verdict

No remaining blocking concerns after the resolutions above. Spec is clear enough for
validation drafting. R9 to be built and verified as its own step (R9.6).
