## Pass 1 — 2026-07-07

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass
(none — first pass)

### Findings
- [production-line-auto-recipe R2 / R1.S2] — `suppressAutoRecipe` is load-bearing, not dead. `useFactoryPageFlows.ts:97` calls `factory.addProductionLine(part, false, libraryProducesIt)` to suppress sole-recipe auto-add when another library factory already produces the part. R2 makes `addProductionLine` auto-add for *every* sole-recipe part with no suppression path, and R1.S2 demands zero `suppressAutoRecipe` occurrences app-wide — together these silently drop the library-produces-it suppression, a behavior change that contradicts the proposal's "no intended behavior change" goal. Spec must state how this suppression is preserved (e.g. an `addProductionLine` option or caller-side guard) and add a scenario covering it.
- [production-line-auto-recipe R2] — "exactly one recipe" is untestable at the boundary because `recipeLookup[part.slug]` can be `undefined` (proposal marks the `undefined` case out of scope), yet R2 relocates `recipes.length === 1` verbatim which would throw on `undefined`. Scope is defensible, but R2 should state the precondition (part has a defined recipe list) so the requirement is not read as covering the undefined case.
- [assembly-line-construction R3.S1] — scenario asserts "rendered graph node footprint is identical" but the spec has no way to test rendering from a model-layer unit; the observable claim should be reduced to `rows === 0` plus `effectiveRows() === 1` for the FactoryRecipe line, or the rendering assertion moved to an integration/e2e scenario.
- [machine-math R2 — MODIFIED] — proposal's "What Changes" lists only R4 (`kind` tag) under Modified Capabilities for `machine-math`; the spec also MODIFIES R2 (`totalMachines` discriminating on `count.kind`). The R2 modification is in-scope by implication but is not called out in the proposal's capability list — reconcile so the proposal names the `totalMachines` change.

## Pass 2 — 2026-07-08

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass
- [production-line-auto-recipe R2 / R1.S2 — suppressAutoRecipe load-bearing] — RESOLVED. `production-line-auto-recipe` R2 now retains `suppressAutoRecipe` on `Factory.addProductionLine` and auto-adds only when `suppressAutoRecipe` is falsy AND the part has exactly one recipe; R1 removes the flag only from the `ProductionLine` constructor. New R2.S2 covers the `useFactoryPageFlows` suppression path (`addProductionLine(part, false, true)` → empty `assemblyLines`). Verified `Factory.addProductionLine` keeps the `suppressAutoRecipe` param (`factory.ts:329`) and `useFactoryPageFlows.ts:97` still supplies `libraryProducesIt`. Proposal "What Changes" and Impact updated to match. Behavior preserved.
- [production-line-auto-recipe R2 — undefined recipeLookup precondition] — RESOLVED. R2 now states the precondition `recipeLookup[part.slug].length === 1` and explicitly marks the `undefined recipeLookup[part.slug]` (part with no recipes) case as retaining today's behavior and out of scope.
- [assembly-line-construction R3.S1 — untestable rendered assertion] — RESOLVED. R3.S1 now asserts only `AssemblyLine.rows === 0` (model fact). New R3.S2 asserts `effectiveRows` returns `1` for a FactoryRecipe line at `rows === 0` and `rows === 1` — verified against `node-size.ts:25` (`if (al.recipe.isFactoryRecipe) return 1`), a genuine testable invariant. Old sweep renumbered R3.S3.
- [machine-math R2 — proposal capability list] — RESOLVED. Proposal Modified Capabilities now reads "the exported `totalMachines(count)` (R2) and all `"fullMachines" in count` probe sites narrow on `kind`", naming the `totalMachines` change.

### Findings
(none — APPROVED)
