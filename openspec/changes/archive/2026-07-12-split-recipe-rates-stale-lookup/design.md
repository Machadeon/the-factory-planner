## Context

Issue #23 / plan-order.md B2.5. `ProductionLineComponent.splitRecipes()` calls `productionLine.splitRecipeRates()` directly — a rate-affecting mutation with no recompute — and `ProductionLineComponent.rejectLine()`/`rejectAssembly()` call `applyRejectSilent(factory.optimizer, …)` directly, same gap. `tests/unit/mutation-contract.test.ts` only regexes `factory.*` writes, so neither pattern is caught. Fix per AGENTS.md bug process (regression test first) plus the mutation contract (`factory-mutation-methods` R2/R4/R5, per the approved delta spec).

While reading the actual component (`app/components/ProductionLineComponent.tsx:120-166`) to place the fix, found the identical gap at two more call sites — `onRejectChoice()` at lines 152 and 162, using the sibling helper `applyRejectChoice` instead of `applyRejectSilent`. Design-review Pass 1 flagged deferring this as "the same escape class the widened test is meant to close, left open a second time in the same review cycle" — correct. Scope now includes converting all four call sites (`rejectLine`, `rejectAssembly`, and both branches of `onRejectChoice`), since the fix is the same shape and the same file, and leaving one variant unconverted would mean the widened mutation-contract test still passes while the prompted-reject path leaves `rateLookup` stale — the exact bug this change exists to close, just reachable through a different helper name.

## Goals / Non-Goals

**Goals:**
- `Factory.splitRecipeRates(pl)` mutator, ending in `_updateRates()`.
- `Factory.rejectLine(pl)` / `Factory.rejectAssembly(recipe)` wrapping the silent-reject path (`applyRejectSilent`, `ProductionLineComponent.tsx:130,144`).
- `Factory.rejectLineChoice(pl, choice)` / `Factory.rejectAssemblyChoice(recipe, choice)` wrapping the prompted-choice path (`applyRejectChoice`, `ProductionLineComponent.tsx:152,162`).
- Widen `tests/unit/mutation-contract.test.ts` to ban all three literal patterns this bug's shape covers: `productionLine.splitRecipeRates(`, `applyRejectSilent(`, `applyRejectChoice(` appearing directly in `app/components`/`app/hooks`.
- Regression tests proving `factory.rateLookup` / `factory.optimizer.enabledRecipes` stay consistent after each new mutator.

**Non-Goals:**
- Any change to the n/(n+1) rescale math, or to `applyRejectSilent`/`applyRejectChoice`'s own logic — behavior preserved verbatim, only *where* it's called from moves.
- Any change to deletion behavior (`onDeleteClicked()` / `removeAssemblyLine()`) — stays a separate, unchanged, caller-side step in all four reject variants.

## Decisions

**1. Keep `ProductionLine.splitRecipeRates()` as a pure rescale method; add a thin `Factory` wrapper rather than inlining the loop into `factory.ts`.**
`tests/unit/models/production-line.test.ts:101-119` already unit-tests the pure math on `ProductionLine` directly (no factory involved). Inlining the loop into `Factory.splitRecipeRates` and deleting the `ProductionLine` method would break that test for no behavioral gain, and moving the test to go through `Factory` instead would make it a heavier integration-style test for a piece of pure arithmetic that has nothing to do with the factory graph.
```ts
// factory.ts
splitRecipeRates(pl: ProductionLine) {
  pl.splitRecipeRates();
  this._updateRates();
}
```
Trade-off accepted: `ProductionLine.splitRecipeRates()` becomes reachable only through the new `Factory` method or the existing unit test — no other Factory mutator in this file delegates to a child-model computation method this way (`removeAssemblyLine` inlines its splice directly). This is a one-off, justified by the pre-existing test, not a new general pattern. The widened `R4.S3` regex is what actually prevents recurrence (a component calling `productionLine.splitRecipeRates()` again), not a code comment, so no doc-string guard is added — the enforcement lives in the test, consistent with how `R4.S1`/`S2` already work.

**2. `Factory.rejectAssembly(recipe)` and `Factory.rejectAssemblyChoice(recipe, choice)` take no `pl` param — semantic reason, not a lint dodge.**
Reject state lives entirely in the global `optimizer.enabledRecipes`/`rejectPrompt`, keyed by recipe slug — there is no per-`ProductionLine` state to locate. Contrast `acceptAssembly(pl, recipe)` (factory.ts:643-646), which scans `pl.assemblyLines` to find one specific `AssemblyLine.autoCreated` flag to flip; that method genuinely needs `pl` to disambiguate which assembly line. `rejectLine(pl)` / `rejectLineChoice(pl, choice)` do need `pl` — `lineRecipeSlugs(pl)` enumerates every recipe slug in that line. The asymmetry is: **line-scoped reject needs `pl` to enumerate slugs; assembly-scoped reject already has its one slug from `recipe` directly.** This corrects proposal.md, which is now updated to the accurate one-arg signature for the assembly variants.

**3. Regex additions are literal token bans, not semantic ones (per spec-review Pass 1/2 outcome), and cover all three escape-hatch call patterns.**
Add to `tests/unit/mutation-contract.test.ts`, same `describe("R4 — components mutate only through model methods")` block:
```ts
it("R4.S3 — no direct productionLine.splitRecipeRates() calls", () => {
  const banned = /\bproductionLine\.splitRecipeRates\s*\(/;
  const offenders = sourceLines(globs).filter((l) => banned.test(l.line));
  expect(offenders.map((o) => `${o.file}: ${o.line}`)).toEqual([]);
});

it("R4.S4 — no direct applyRejectSilent()/applyRejectChoice() calls", () => {
  const banned = /\bapplyReject(Silent|Choice)\s*\(/;
  const offenders = sourceLines(globs).filter((l) => banned.test(l.line));
  expect(offenders.map((o) => `${o.file}: ${o.line}`)).toEqual([]);
});
```
`globs` already excludes `app/models`, so the new `Factory` methods calling these helpers internally do not self-trigger the ban.

**4. Regression tests assert concrete state, not just that a recompute ran.**
Design-review Pass 1 correctly flagged that a spy on `_updateRates` proves the recompute was *called*, not that derived state is *consistent* — weaker than R7's stated preference for concrete-value assertions. Final approach, added to `tests/unit/models/factory-mutation-methods.test.ts`:
- `splitRecipeRates`: fixture production line with 2+ assembly lines, call `factory.splitRecipeRates(pl)`, assert `factory.rateLookup[<part>].productionRate` equals the concrete post-rescale sum.
- `rejectLine`/`rejectAssembly`/`rejectLineChoice`/`rejectAssemblyChoice`: assert `factory.optimizer.enabledRecipes` directly reflects the expected slug removal/addition (concrete, observable state — no spy needed, since `enabledRecipes` is itself the mutation's visible effect). A `_updateRates` spy is added *in addition*, matching the existing `R5.S1`-style pattern, but the state assertion is the load-bearing check, not the spy.

## Risks / Trade-offs

- [Test only checks three literal function/method names] → If a fourth helper with the same "mutate the object you were handed" shape appears later, the regex won't catch it. Mitigation: none needed now — this mirrors the existing R4.S1 style (explicit field/name allowlist, not a general heuristic), consistent with the codebase's existing enforcement approach.

## Migration Plan

None — no data/schema change, pure code-path + test change. No rollback beyond reverting the commit.

## Open Questions

None outstanding — the `onRejectChoice` gap raised in an earlier draft of this design is now in scope (Goals, Decision 2/3) rather than deferred.
