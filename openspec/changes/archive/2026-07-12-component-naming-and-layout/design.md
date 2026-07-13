## Context

This is the final sweep phase closing both `plans/model-refactor.md` and `plans/component-refactor.md`. Everything here is mechanical (moves, renames, dead-code deletion) except one deliberately-scoped, regression-tested behavior-preserving type fix (`factory-storage.ts:226`). Scope, file mapping, and the two spec changes needed (`component-structure`, `optimizer-config`, `recipe-type-model` note trim) are settled in `spec-review.md` (APPROVED, Pass 3). This document is the file-by-file execution plan.

## Goals / Non-Goals

**Goals:**
- Every file under `app/components/` lives in its feature directory; zero `Component`-suffixed filenames; hook-only files live in `app/hooks/`.
- `npm run knip` exits 0 with `exports`/`types` at `error` severity.
- `AGENTS.md` matches reality (state pattern, schema version, directory map).
- The five §6.2 vestigial items and the `factory-storage.ts` cast are closed.
- `make verify` and the full e2e suite stay green throughout; aria-labels/`data-testid`s unchanged.

**Non-Goals:**
- No further component decomposition (e.g. `ProductionLineComponent.tsx` moves verbatim, it is not split further even though it's a good candidate — that's Phase 4b territory, already closed).
- No behavior change beyond the one documented `factory-storage.ts` fix.
- No `partLookup`/`buildingLookup` barrel removal (spec-pinned, out of scope — see `game-data` R2).

## Decisions

### D1 — Move order: leaves before roots, one git mv per file
Move files in dependency order (files with no in-repo importers of *other flat files* first) so intermediate states still typecheck where practical, but since TypeScript path resolution doesn't care about directory depth (all imports are relative or `@/` absolute), order mainly matters for keeping diffs reviewable, not for correctness. Practical order: (1) `ui/`-bound primitives (`Dividers.tsx`, `PartSelector.tsx`, `TextCalculatorField.tsx`) — leaf files, no in-app-components importers of each other; (2) `app/hooks/useFactoryPageFlows.ts`; (3) small leaf display components (`ClockDisplay.tsx`, `MachineCountDisplay.tsx`, `FactoryHeader.tsx`, `FactoryIconPicker.tsx`, `StorageConsentDialog.tsx`, `NestedFactoryRow.tsx`, `RecipeRejectDialog.tsx`, `SuggestedActions.tsx`, `RecipeOverrideRow.tsx`, `ConstraintsPanel.tsx`, `ProductionTargetsBar.tsx`, `FactoryPickerDialog.tsx`, `LogisticsSection.tsx`); (4) the three verbatim `Component`-suffix renames — real chain (verified): `RecipeComponent.tsx` is imported by `AssemblyLineComponent.tsx` and by `planning/RecipePicker.tsx`; `AssemblyLineComponent.tsx` is imported by `planning/ProductionLineDetails.tsx`; `ProductionLineComponent.tsx` imports neither of the other two (it composes `ProductionLineRow.tsx`/`ProductionLineDetails.tsx` instead) — do `RecipeComponent.tsx` → `Recipe.tsx` first, then `AssemblyLineComponent.tsx` → `AssemblyLine.tsx` (updates its own `RecipeComponent` import), then `ProductionLineComponent.tsx` → `ProductionLine.tsx`; order is for reviewability, not correctness, since none of the three moves depend on each other for `tsc` to pass; (5) the two section composers (`OptimizationSection.tsx`, `PlanningSection.tsx`) last, since they're the widest importers. Each move is its own commit-sized unit in tasks.md so a broken import surfaces immediately (build runs after every batch, not just at the end).

Alternative considered: one big-bang move of all 22 files in a single step. Rejected — a single `tsc` failure across 22 simultaneous moves is much harder to bisect than failures surfacing per small batch.

### D2 — `ProductionLineComponent.tsx`/`RecipeComponent.tsx`/`AssemblyLineComponent.tsx` move verbatim, no re-split
`planning/` already has `ProductionLineRow.tsx`/`ProductionLineDetails.tsx` (children of the old `ProductionLineComponent.tsx`, created by the earlier `split-production-line` change) and `RecipePicker.tsx`/`FactoryRecipeCard.tsx`. The three flat files are the *composing parents* of those children — real, non-trivial logic (state, handlers), not dead scaffolding. Renamed only: `ProductionLine.tsx`, `Recipe.tsx`, `AssemblyLine.tsx`. Their internal logic is untouched.

Alternative considered: inline `ProductionLineComponent.tsx`'s body into `PlanningSection.tsx` directly (eliminating the wrapper), matching a literal reading of the original target tree sketch. Rejected — that's a structural decomposition change (behavior-neutral but architecturally a Phase 4 concern), out of scope per spec R1's "verbatim move" carve-out agreed in spec-review.

### D3 — `factory-storage.ts:226` fix: type the raw input honestly, don't delete the cast
Current code (`normalizeRecipeOptimizer`, lines 219-234):
```ts
const rawParts = (raw.availableParts ?? []) as unknown as (string | AvailablePart)[];
```
`raw: RecipeOptimizerConfig | undefined` — the parameter itself is already mistyped for its job (it represents untrusted deserialized JSON, not a guaranteed-valid `RecipeOptimizerConfig`). Fix: change the parameter type to accept the loosely-typed raw shape directly, so the union type is honest at the boundary instead of asserted through `unknown`:
```ts
function normalizeRecipeOptimizer(
  raw: (Omit<RecipeOptimizerConfig, "availableParts"> & {
    availableParts?: (string | AvailablePart)[];
  }) | undefined,
): RecipeOptimizerConfig {
  const base = defaultRecipeOptimizerConfig();
  if (!raw) return base;
  const availableParts = (raw.availableParts ?? []).map((p) =>
    typeof p === "string" ? { partSlug: p, rate: 0 } : p,
  );
  return { ...base, ...raw, availableParts };
}
```
The call site (`data.optimizer` from `SerializedFactory`) needs no change: `SerializedFactory.optimizer` stays typed as the strict `RecipeOptimizerConfig` (it's also the *serialize*-output type at `factory-storage.ts:170`, where the strict shape is correct — loosening it there would be a regression, not a fix). Only `normalizeRecipeOptimizer`'s own parameter type widens; `AvailablePart[]` is assignable to `(string | AvailablePart)[]`, so the existing strict call site passes through cleanly with no cast on either side. No `as unknown as` anywhere in the new code; the `typeof p === "string"` branch is a normal narrowing check, not a cast. Runtime behavior identical: string → `{ partSlug, rate: 0 }`, object passes through. The trailing `return { ...base, ...raw, availableParts }` still type-checks: `raw`'s spread injects the widened `availableParts?: (string|AvailablePart)[]`, but the explicit trailing `availableParts` (the `.map` result, `AvailablePart[]`) overrides it, satisfying the strict `RecipeOptimizerConfig` return type.

Alternative considered: keep `raw: RecipeOptimizerConfig` and just narrow `raw.availableParts` with a single-level `as (string | AvailablePart)[]` (no `unknown` hop). Rejected — TypeScript wouldn't accept a direct cast from `AvailablePart[]` to `(string | AvailablePart)[]` without complaint-suppression anyway in strict mode for a widening-then-narrowing cast in some configurations, and it still misrepresents the trusted/untrusted boundary; the honest fix is cheap here since this function has exactly one caller.

### D4 — Dead-code deletion list (knip, captured at design time)
`npm run knip` output as of this design (may drift slightly by implementation time — tasks.md re-runs knip fresh before deleting):

Unused exports (25 flagged; 19 deleted here + `powerPart` deleted via the proposal's separate barrel-trim bullet = 20 code removals; 5 kept, see below): `VerticalDivider` (Dividers.tsx — **note**: this file is also being moved to `ui/` in the same change; delete the export, not the file, since other exports in Dividers.tsx are used), `interactiveBaseClass`/`interactiveHoverClass`/`interactiveWarningClass`/`interactiveDangerClass`/`buttonResetClass`/`focusVisibleClass` (ui/interactive-styles.ts), `AUTOSAVE_DEBOUNCE_MS` (hooks/useAutosave.ts), `functions`/`functionsKeys`/`operators`/`operatorsKeys`/`evalReversePolishNotation`/`shuntingYard`/`tokenize` (lib/expression/index.ts — re-exports of the calculator internals, unused outside the module itself), `syntheticSinkPoints` (game-data/constants.ts), `combiners`/`filters` (models/point-values.ts), `AppProviders` (tests/helpers/render-with-providers.tsx).

**`MIN_EDGE_WIDTH`/`MAX_EDGE_WIDTH` (logistics/graph-layout.ts) are a knip false positive, discovered during implementation — kept, not deleted.** `tests/unit/graph-layout.test.ts` consumes them via `await import(MODULE)` with a computed module-path variable; knip's static analysis can't follow that and reports them unused. Confirmed by running the test suite after the initial (incorrect) deletion — `edgeWidth (AC17)` failed with `NaN`. Marked `/** @public ... */` with a comment explaining the dynamic-import consumer, same suppression mechanism as the two spec-pinned game-data exports below.

**Two flagged exports are kept, not deleted**, despite knip flagging them: `powerPart` (game-data/index.ts barrel) — handled separately per the proposal's barrel-trim bullet, and `partLookup` (game-data/load.ts) — this is *not* the spec-pinned barrel re-export (that's a separate finding at `index.ts:7:3`, also kept per `game-data` R2); this is `load.ts`'s own module-level export, which `index.ts` re-exports from. Since the barrel export must stay (R2), `load.ts`'s definition must stay exported too — deleting it would break the re-export. Both `partLookup` findings (index.ts and load.ts) are false positives for deletion purposes; keep both, no code change to either.

Unused exported types (8): `NodeKind`, `GraphNodeData`, `GraphEdge` (logistics), `ConfirmSeverity` (ui/ConfirmDialog.tsx), `SerializedAssemblyLine`, `SerializedProductionLine` (factory-storage.ts), `RejectPrompt` (optimizer-config.ts), `PossibleValue` (point-values.ts).

For each: default action is delete. `buildingLookup`/`partLookup` (both the `load.ts` declarations and the `index.ts` barrel re-exports) are kept per the `game-data` R2 spec pin, marked with a `/** @public ... */` JSDoc tag — knip's built-in convention for suppressing an unused-export finding at a specific declaration/re-export site without disabling the rule project-wide, verified empirically (tag on the `load.ts` declaration alone was insufficient; the `index.ts` re-export needed its own tag since it's a separate export site).

### D5 — Vestigial carryovers, concrete fixes
- **`SourceFactoriesEditor.tsx:46,62`**: `useLibraryContext()`'s `library` field is typed `StorageLibrary` (non-optional, always a real object — confirmed in `LibraryContext.tsx`). The `if (!library) return []` guards at both `useMemo`s are unreachable; delete them (`sourceFactories`/`factoryOptions` computations lose the guard, logic unchanged since `library` is always truthy).
- **`GraphProps` optionality (`LogisticsSection.tsx:41-42`)**: `library?: StorageLibrary; currentFactoryId?: string | null;` → make both required (`library: StorageLibrary; currentFactoryId: string | null;`). The only call site (`LogisticsSection.tsx:324-327`) already always passes both from `useLibraryContext()`. This file also moves to `logistics/LogisticsSection.tsx` in the same change — do the prop-optionality fix in the same commit as the move to avoid a second touch.
- **`factory.ts` double factory-recipe import**: lines 4-5, `import type FactoryRecipe from "./factory-recipe"; import { factoryRecipeSlug } from "./factory-recipe";` → merge into `import FactoryRecipe, { factoryRecipeSlug } from "./factory-recipe";` (drop the redundant `type`-only import; `FactoryRecipe` the class is already usable as both type and value).
- **`ProductionLineDetails.tsx` reveal-block duplication (lines 112-154)**: the two `{!showPicker && ...}` blocks differ only in whether the "Add Recipe" `ActionRow` renders. Merge into one block, gate the "Add Recipe" row on `hasMoreRecipes` inside it:
  ```tsx
  {!showPicker && (
    <div className="flex flex-row items-center gap-x-2">
      {hasMoreRecipes && (
        <ActionRow onClick={onSplitRecipes} className="flex flex-row items-center p-1">
          <AddIcon />
          Add Recipe
        </ActionRow>
      )}
      <ActionRow onClick={onOpenFactoryPicker} className="flex flex-row items-center p-1">
        <AddIcon />
        Use Factory as Recipe
      </ActionRow>
      <ActionRow onClick={onOpenSupplyPicker} className="flex flex-row items-center p-1">
        <AddIcon />
        Supply from Factory
      </ActionRow>
    </div>
  )}
  ```
  Identical rendered output for every combination of `showPicker`/`hasMoreRecipes` (verified by hand: old code rendered exactly this given the two mutually-exclusive `!showPicker && hasMoreRecipes` / `!showPicker && !hasMoreRecipes` branches).
- **Logging cleanup (#14)**: verified — `grep -rn "// .*console\." app/` finds zero commented-out console lines. No action needed; note this as "verified clean" in tasks.md rather than a no-op task.

### D6 — AGENTS.md updates
Three specific edits, not a rewrite:
1. Line 79 (`Factory` bullet): delete "`Factory.update()` injected by `FactoryComponent` at mount" clause — replace with a short note that `FactoryPage.tsx` (formerly `FactoryComponent`) mounts the valtio proxy via `useFactorySession`; no `update()` field exists post-M4.
2. Line 114 (storage layer paragraph): "`StorageLibrary` holds `folders`, `factories` at `schemaVersion` 2" → "at `schemaVersion` 1 (`CURRENT_SCHEMA_VERSION`, defined in `factory-storage.ts`)"; note migration logic (`migrateLibrary`, `mergeLibrary`, `remapImportedLibrary`) lives in `app/models/migrations.ts` — a separate module from where the constant is defined (verified: `CURRENT_SCHEMA_VERSION` is declared in `factory-storage.ts:83` and imported by `migrations.ts`; factory-storage.ts still owns serialize/deserialize, migrations.ts owns the version-upgrade path).
3. Directory-map/component section: replace any flat-file component list with the final feature-directory tree (mechanical, derived from the R1.S4 table).
4. `game-data` module description (near line 130): drop `syntheticSinkPoints` from the `constants.ts` export list — it's deleted in D4 (0 consumers, not spec-pinned, unlike `partLookup`/`buildingLookup`).

## Risks / Trade-offs

[Renaming `ProductionLineComponent.tsx`/`RecipeComponent.tsx`/`AssemblyLineComponent.tsx` while their children already live in `planning/` could tempt an implementer to "clean up" further mid-move] → Spec R1's note and this design's D2 explicitly forbid it; tasks.md stub/review gates catch scope creep before it merges.

[`factory-storage.ts:226` fix touches deserialization, the single highest-risk surface for silent data loss] → Regression test (spec `optimizer-config` R5.S2/S3) required before the fix lands; existing round-trip tests must stay green; this is the one task in the group that gets a dedicated before/after fixture diff in review.

[Knip list (D4) drifts between design time and implementation time as other work lands on `main`] → tasks.md re-runs `npm run knip` fresh as its first step in the dead-code group, uses that live output as the authoritative list, not this document's snapshot.

[22 file moves is a lot of surface for import-path mistakes] → Per-batch `tsc`/build checks (D1); e2e suite as final gate; `git mv` preserves history so `git blame`/diff review stays cheap.

## Migration Plan

Not applicable in the deploy/rollback sense — this is a single-repo refactor PR, not a service migration. Standard rollback is `git revert` if `make verify`/e2e fails post-merge; no data migration, no external state.

## Open Questions

None outstanding — spec-review (Pass 3, APPROVED) resolved the scope-boundary questions. `load.ts`'s own `partLookup` export (D4) needs a quick implementation-time check (internal consumers vs. barrel-only) before deleting; flagged as a note, not a blocker.
