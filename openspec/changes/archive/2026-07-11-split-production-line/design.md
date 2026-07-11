## Context

`ProductionLineComponent.tsx` (603 lines) is one of the "big four" oversized components in `plans/component-refactor.md`. It renders the whole production-line UI — a collapsible header row and an expanded body — while also owning suggestion accept/reject choreography, an inline factory-candidate card, three dialogs, pure production-line arithmetic (`splitRecipes`, `getProductionRateForRecipe`), a derived-state `useEffect`, and `var` declarations. Phase 3 (`introduce-app-contexts`) already landed, so the component reads the factory from `useFactory()` context rather than props; per-instance data (`productionLine`, `candidateFactories`, `forceExpanded`, `onToggle`, `onDeleteClicked`) still arrives as props from `PlanningSection`.

M2 (`split-factory-god-class`) created `app/models/suggestions.ts`, which today homes only the reject **policy** (`shouldPromptReject`, `applyRejectChoice`, `applyRejectSilent`). The accept-all / reject-all **mutation walk** still lives duplicated inside `OptimizationSection` and the per-line handlers in `ProductionLineComponent`. `ProductionLine` (`app/models/production-line.ts`) is currently a pure data class with no methods.

Constraints: pure refactor — no observable behavior change; aria-labels, `data-testid`s, storage, and URL formats frozen; unit + integration + e2e suites and `npm run build` stay green. The e2e suite is the safety net.

## Goals / Non-Goals

**Goals:**
- Decompose the production-line UI into `ProductionLineRow`, `ProductionLineDetails`, `RecipePicker`, `FactoryRecipeCard` under `app/components/planning/`, each single-responsibility and ≤300 lines.
- Move the suggestion mutation walk into `models/suggestions.ts` (`lineRecipeSlugs`, `acceptAllSuggestions`, `rejectAllSuggestions`), called by both `OptimizationSection` and the production-line handlers.
- Move `getProductionRateForRecipe` → `ProductionLine.recipeInstanceRate` and the `splitRecipes` rate rescale → `ProductionLine.splitRecipeRates`, unit-tested.
- Replace the `useEffect(needMoreProduction → setShowRecipes)` sync with derived visibility + an explicit `pickerManuallyOpened` intent flag.
- Add `mode: "recipe" | "supplier"` to `FactoryPickerDialog`.
- Remove `var`.

**Non-Goals:**
- No valtio/reactivity redesign (M4 territory), no changes to `AssemblyLine`/`RecipeComponent`/`SuggestedActions`/`RecipeRejectDialog` internals beyond import-path/prop wiring.
- No visual redesign; no new features; no relocation of `FactoryPickerDialog` or `AssemblyLineComponent` files (those belong to Phase 5's naming sweep).
- No divisor guard added to `recipeInstanceRate` (preserve former behavior verbatim).

## Decisions

### D1 — Component boundary: Row vs Details vs Picker vs Card
Split on the existing visual seam. The current JSX has two top-level blocks inside one wrapper `<div className="flex flex-col gap-y-2 grow">`: the header row (the `rowVisualClasses(mainStyle, ...)` block) and the expanded body (the `pl-12` block toggled by `isExpanded`). These become `ProductionLineRow` and `ProductionLineDetails`. Inside the body, the `recipeList.map(recipe => <RecipeComponent/>)` block and the `factoryCandidates.map(...)` block become `RecipePicker`, and the inline factory-candidate `ActionRow` inside `factoryCandidates.map` becomes `FactoryRecipeCard` (rendered by `RecipePicker`). (Extraction points are anchored to these symbols, not line numbers, since pre-extraction edits shift lines.)

The retained `ProductionLineComponent` (still the export `PlanningSection` imports) becomes a thin parent that owns the shared state and handlers and composes `<ProductionLineRow>` + `<ProductionLineDetails>`. Keeping the same export name/file avoids touching `PlanningSection` beyond nothing (import unchanged) — actually the file stays `ProductionLineComponent.tsx` as the composition parent; the four new files live in `planning/`.

**Alternative considered:** fully delete `ProductionLineComponent` and have `PlanningSection` compose Row+Details directly. Rejected — the shared state (expand, dialogs, intent flag, handlers) needs a single owner; a parent component is that owner, and keeping the existing filename minimizes churn and preserves git blame for the parent's remaining logic. (Phase 5 handles the rename/relocation.)

### D2 — State ownership stays in the parent; children are presentational
`expanded`, `showFactoryPicker`, `showSupplyPicker`, `rejectTarget`, and the new `pickerManuallyOpened` stay in the parent `ProductionLineComponent`. Row and Details receive the values plus callbacks as props. This keeps the children easy to unit/integration-test and avoids lifting state into context (out of scope).

**Single source for `actualProductionRate`.** The parent computes `actualProductionRate` and its dependents (`productionRateDiff`, `needMoreProduction`, `hasMoreRecipes`, `factoryCandidates`, the color/style classes) **once** and passes what each child needs down as props — no child recomputes `actualProductionRate` (the one value feeding both the header diff and the picker's sufficiency check), avoiding divergence under the mutable model. `ProductionLineRow` gets the header-specific derived strings (`actualProductionRate`, `productionRateDiffStr`, color class, `mainStyle`); `ProductionLineDetails`/`RecipePicker` get the picker-specific ones (`needMoreProduction`, `hasMoreRecipes`, `factoryCandidates`, `productionRateDiff` for the per-recipe rate). The pure model method `recipeInstanceRate` (D4) recomputing the sum internally is fine — it is a stateless call reading live fields, not a cached duplicate.

**Alternative:** push `useFactory()` and derivation into each child. Rejected — duplicates the derivation and risks divergence; single computation in the parent is clearer and the parent already calls `useFactory()`.

### D3 — Suggestion walk moves to `suggestions.ts`, callers keep `factory.update()`
`lineRecipeSlugs(productionLine)`, `acceptAllSuggestions(factory)`, `rejectAllSuggestions(factory)` become module functions operating on the mutable model graph. They do **not** call `factory.update()` — that stays the caller's responsibility (matching the existing policy functions, which also leave re-render/persist to callers, and matching M2's rule that `suggestions.ts` never imports the `Factory` class as a value). `rejectAllSuggestions` reproduces `OptimizationSection`'s current walk verbatim: reassign `factory.productionLines` to a filtered copy, reassign each surviving line's `assemblyLines`, collect non-factory slugs, then `applyRejectSilent(factory.optimizer, slugs)`.

`OptimizationSection.acceptAllSuggestions`/`rejectAllSuggestions` become one-liners delegating to the module (keeping their local `factory.update()` + dialog-close). The per-line `acceptLine`/`rejectLine`/`acceptAssembly`/`rejectAssembly` handlers reuse `lineRecipeSlugs` (replacing the local `lineRecipeSlugs()` closure) and the existing policy functions.

**Type-only Factory reference:** the module imports `type Factory` (M2 rule: no value import). `lineRecipeSlugs` takes a `ProductionLine`; `accept/rejectAllSuggestions` take a `Factory`.

**Update-ownership contract (per caller).** The helpers mutate the **same** `Factory` instance the caller holds — the proxy returned by `useFactory()` (Phase 3 context) — including reassigning `factory.productionLines` and each surviving line's `assemblyLines` to filtered copies. They deliberately do **not** call `factory.update()`; the caller owns the post-mutation trigger, exactly as today:
- `OptimizationSection.acceptAllSuggestions`/`rejectAllSuggestions` call the helper, then `factory.update()`, then close the dialog — its existing behavior; it already subscribes via `useFactoryUpdateSubscription()`, so the array swap is observed after `update()`.
- The per-line `acceptLine` calls (via the shared walk on a single line) then `factory.update()`. `rejectLine`/`rejectAssembly` collect slugs, apply the policy, then remove the line/assembly through the existing `onDeleteClicked`/`removeAssemblyLine` paths (which already call `updateProductionLine()`/`factory.update()`).

Because the helper reassigns arrays on the caller's proxy instance and the caller then calls `factory.update()`, the mutate-then-update ordering is identical to the current in-component walk; no valtio snapshot reads the arrays between the swap and the `update()`.

### D4 — `ProductionLine` math methods
Add two methods to the class:
- `recipeInstanceRate(recipe: Recipe): number` — computes `actualProductionRate` inline (sum of `assemblyLines[i].getPartProductionRate(this.part)`) and returns `(this.rate - actual) / recipe.productLookup[this.part.slug]`.
- `splitRecipeRates(): void` — `const ratio = n / (n + 1)` where `n = this.assemblyLines.length`; multiply each `assemblyLine.rate` by `ratio`.

`this.part` is always set (the constructor requires `part` and no code path unsets it), so `this.part.slug` is a safe read — the only precondition is R2's divisor one (caller passes a recipe that produces the part). These need `AssemblyLine` only as a type (already imported as type) and `Recipe` as a type. The component's `getProductionRateForRecipe` and the rate-rescale portion of `splitRecipes` are replaced by calls; the component keeps the picker-intent side of `splitRecipes` (now `setPickerManuallyOpened(true)`, see D5).

Note: the parent component still computes `actualProductionRate` once (D2) for the header readout and `needMoreProduction`; `recipeInstanceRate` recomputing it internally is acceptable because the method is a pure model helper with no shared-state divergence risk — it reads live field values at call time.

**Alternative:** a free function in `lib/`. Rejected — this is production-line domain arithmetic reading instance fields; a method is idiomatic (CLAUDE.md: classes for models with methods) and keeps `actualProductionRate` logic co-located with the data.

### D5 — Picker visibility without an effect

**Exact current behavior (verified against source).** `showRecipes` is a state; a `useEffect` on `[needMoreProduction]` sets `showRecipes = needMoreProduction` on every transition. The manual-open control (`splitRecipes`, rendered only when `!needMoreProduction`) sets `showRecipes = true`. `addAssemblyLine` explicitly sets `showRecipes = false`; `addFactoryAssemblyLine` and `addSupplierFactory` do **not** touch `showRecipes` — but the effect re-derives it from `needMoreProduction` on the render their mutation triggers. Net observable rule: **`showRecipes` tracks `needMoreProduction`, except it can be transiently forced `true` by manual-open, and returns to tracking on the next `needMoreProduction` transition.** So satisfying production by *any* means (add or a rate edit) that flips `needMoreProduction` false closes a manually-opened picker.

**Faithful replacement without an effect.** Introduce `pickerManuallyOpened` state (default `false`); visibility = `needMoreProduction || pickerManuallyOpened`. To reproduce "returns to tracking on the next `needMoreProduction` transition" without an effect, `pickerManuallyOpened` is reset to `false` in **every handler that can change `needMoreProduction`** — precisely the set of ops that used to fire the old effect:
- `addAssemblyLine`, `addFactoryAssemblyLine` (add a line → sufficiency changes)
- `removeAssemblyLine`
- `updateProductionRate`, `updateOutputRate` (rate edits)
- `toggleAutoCalculateRate`, `toggleMaximizeOutput`

`splitRecipes`'s reveal becomes `setPickerManuallyOpened(true)` (only reachable when `!needMoreProduction`, as today). This yields the same observable states as the old effect: short → visible; manual-open-while-satisfied → visible until any sufficiency-changing op → re-derives to `needMoreProduction`. It removes the `addFactoryAssemblyLine` divergence the reviewer flagged (the old effect *did* re-derive after a factory add; an explicit reset there is the faithful equivalent, not new behavior), and it removes the satisfy-via-rate-edit divergence (rate handlers reset intent, matching the old effect firing on the `needMoreProduction` flip).

**Why not keep persistent intent across satisfy.** A pure `needMoreProduction || pickerManuallyOpened` with reset only on add would keep the picker open after a satisfy-via-rate-edit, diverging from today. Resetting in all sufficiency-changing handlers is the minimal faithful mapping of "effect fires on every `needMoreProduction` change."

The `forceExpanded` sync effect (the `props.forceExpanded != null → setExpanded` mirror) is a genuine prop→state mirror, not derived-from-model; it stays (out of scope — not the `needMoreProduction` derived-state smell R3 targets).

### D6 — `FactoryPickerDialog` `mode` prop
Add required `mode: "recipe" | "supplier"`; the `<DialogTitle>` switches text on it. The two call sites in Details pass `mode="recipe"` (the "Use Factory as Recipe" reveal) and `mode="supplier"` (the "Supply from Factory" reveal). No testid/aria change; only the visible title copy diverges, and no e2e selector targets the title text (verified: selectors use roles/testids).

## Risks / Trade-offs

- [Splitting the row/body across files changes DOM nesting] → Keep the exact same element wrappers/classNames when relocating JSX; the top wrapper `<div className="flex flex-col gap-y-2 grow">` stays in the parent, Row renders the `rowVisualClasses` block, Details renders the `pl-12` block — same tree. E2e suite catches any structural regression.
- [Picker-visibility rewrite could change when the recipe list shows] → R3.S1–S3 pin the three cases (auto-short, manual-then-satisfy, partial-add); add an integration test asserting picker visibility across them before/after.
- [`rejectAllSuggestions` verbatim-move could subtly reorder slug collection or filtering] → Unit tests R3.S1–S6 lock slug set, removal set, and `applyRejectSilent` interaction; the walk is copied structurally, not rewritten.
- [Prop-threading derived values could bloat child interfaces] → Compute per-child (D2); if an interface grows past ~8 props, pass the `productionLine` + a small `derived` object rather than many scalars.
- [`recipeInstanceRate` divisor] → Precondition documented (caller passes a producing recipe); no behavior change, so no new NaN/Infinity path is introduced relative to today.

## Migration Plan

Pure in-repo refactor, no data/schema/deploy migration. Each step lands with `npm run test:run` + `npm run test:e2e` + `npm run build` green before the next (bisectable rollback):
1. Model-first (testable, no UI): add `ProductionLine.recipeInstanceRate`/`splitRecipeRates` + unit tests. **Gate:** suites green.
2. Add `lineRecipeSlugs`/`acceptAllSuggestions`/`rejectAllSuggestions` to `suggestions.ts` + unit tests. **Gate:** suites green.
3. Rewire `OptimizationSection` to the shared helpers (behavior identical). **Gate:** existing suites green.
4. Extract `FactoryRecipeCard`. **Gate:** suites green.
5. Extract `RecipePicker` (consuming `FactoryRecipeCard`). **Gate:** suites green.
6. Extract `ProductionLineDetails` (consuming `RecipePicker`); swap `getProductionRateForRecipe`/`splitRecipes` for the D4 model calls; replace the `showRecipes` effect with `pickerManuallyOpened` per D5. **Gate:** suites green + picker-visibility integration test.
7. Extract `ProductionLineRow`, leaving `ProductionLineComponent` as the composition parent. **Gate:** suites green.
8. Add required `mode` to `FactoryPickerDialog`; update the two call sites. **Gate:** suites green.
9. Remove `var`; `npm run lint-fix`; full suite + build.

Splitting the former "step 3" into steps 4–7 (one extraction per gate) preserves bisectability — a regression points at a single extraction, not a four-in-one commit.

**Merge-order dependency.** This change edits `app/models/suggestions.ts` (created by M2 `split-factory-god-class`) and `app/models/production-line.ts`. It sits at order 8 (`plans/component-refactor.md` §7) and depends on M2 (order 4) already landed — so `suggestions.ts` exists with its R1/R2 policy functions before this change extends it. Do not merge this change ahead of M2, or the `suggestions.ts` extension strands a half-moved walk. Rollback: revert the change branch; no external state touched, and M2's functions are untouched by the revert.

## Open Questions

None. Boundaries, homes, and behavior-preservation are pinned by the specs; the reviewer-approved specs resolved the earlier ambiguities (line cap, reset trigger, mode requiredness, slug order, no-op/empty-factory scenarios). D5 now pins the faithful picker-visibility mapping (reset intent in every sufficiency-changing handler).
