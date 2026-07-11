## Why

`ProductionLineComponent.tsx` (603 lines) is one of the "big four" oversized components called out in `plans/component-refactor.md` §2.2. It fuses at least six concerns in one file: the collapsible header row (name, dual rate fields, auto-calc/maximize toggles), the expanded body (assembly-line list, add-recipe reveals, three dialogs), the candidate-recipe and candidate-factory picker lists, suggestion accept/reject choreography, an inline factory-candidate card, and pure production-line arithmetic (`splitRecipes`, `getProductionRateForRecipe`) living in JSX. It also carries two structural smells from §2.4: a `useEffect(needMoreProduction → setShowRecipes)` that syncs derived state, and `var` declarations. Phase 4b (§4.2) decomposes it into focused components, moves the suggestion walks into `models/suggestions.ts` (extending the file M2 created — shared with `OptimizationSection`), and moves the production-line math onto the `ProductionLine` model where vitest can exercise it.

## What Changes

- Split `ProductionLineComponent` into `components/planning/`:
  - `ProductionLineRow` — header row: expand toggle, part icon/name, output-rate + production-rate fields, auto-calc/maximize/delete controls, actual-rate readout, line-level `SuggestedActions`.
  - `ProductionLineDetails` — expanded body: assembly-line list with per-line remove + assembly-level `SuggestedActions`, the "add" reveals, and the three dialogs (`RecipeRejectDialog`, two `FactoryPickerDialog`s).
  - `RecipePicker` — the candidate-recipe list (`RecipeComponent` per game recipe) plus the candidate-factory list.
  - `FactoryRecipeCard` — the inline candidate-factory card markup (extracted from the `factoryCandidates.map` block).
- Move suggestion mutation logic into `models/suggestions.ts` (new exports, unit-tested): `lineRecipeSlugs(productionLine)` (collect non-factory recipe slugs), `acceptAllSuggestions(factory)`, and `rejectAllSuggestions(factory)` (the prune-and-collect walk currently duplicated in `OptimizationSection`). `OptimizationSection` and the production-line accept/reject handlers both call these — the walk exists once.
- Move production-line arithmetic onto the `ProductionLine` model as pure, unit-tested methods: `recipeInstanceRate(recipe)` (was `getProductionRateForRecipe`) and `splitRecipeRates()` (the `ratio = n/(n+1)` rescale from `splitRecipes`). Call sites read from the model.
- Replace the `useEffect(needMoreProduction → setShowRecipes)` derived-state sync with derived rendering plus an explicit user-intent state (`pickerManuallyOpened`): the picker shows when `needMoreProduction || pickerManuallyOpened`, and "Add Recipe"/split sets the intent flag instead of mirroring `needMoreProduction` through an effect.
- `FactoryPickerDialog` gains a `mode: "recipe" | "supplier"` prop that selects its title text ("Use Factory as Recipe" vs "Supply from Factory"), replacing the two same-titled instances.
- Remove `var` declarations (use `const`/`let`).

No observable behavior change: all aria-labels and `data-testid`s are unchanged; storage keys/formats and URL formats are unchanged; unit + integration + e2e suites and `npm run build` stay green. (Dialog **title copy** for the two factory pickers becomes distinct — no e2e selector targets that visible text.)

## Capabilities

### New Capabilities
- `production-line-structure`: The component decomposition contract for the production-line UI — the `ProductionLineRow` / `ProductionLineDetails` / `RecipePicker` / `FactoryRecipeCard` split; the `ProductionLine.recipeInstanceRate` / `ProductionLine.splitRecipeRates` pure-math methods; the derived-rendering + `pickerManuallyOpened` intent state replacing the derived-state effect; the `FactoryPickerDialog` `mode` prop; and the behavior-freeze (aria/testid/storage/URL, suites green).

### Modified Capabilities
- `optimizer-suggestions`: Extend `models/suggestions.ts` (existing R1 already homes the reject policy there; this delta ADDS a new **R3**) with the suggestion **mutation** helpers — `lineRecipeSlugs(productionLine)`, `acceptAllSuggestions(factory)`, `rejectAllSuggestions(factory)` — so the accept-all / reject-all prune-and-collect walk lives once and is called by both `OptimizationSection` and the production-line handlers. Behavior (which slugs get denied, which lines/lines are removed, `applyRejectSilent` interaction) is preserved verbatim.

## Impact

- New: `app/components/planning/ProductionLineRow.tsx`, `ProductionLineDetails.tsx`, `RecipePicker.tsx`, `FactoryRecipeCard.tsx`; unit tests for the new `suggestions.ts` and `ProductionLine` methods; an integration test for the decomposed row/details.
- Modified: `app/components/ProductionLineComponent.tsx` (becomes thin composition or is replaced by `ProductionLineRow` + `ProductionLineDetails`), `app/components/PlanningSection.tsx` (import path), `app/components/OptimizationSection.tsx` (calls shared suggestion helpers), `app/components/FactoryPickerDialog.tsx` (mode prop), `app/models/suggestions.ts`, `app/models/production-line.ts`.
- No new runtime dependency (React, valtio, MUI already present).
- Contract change confined to the app: `FactoryPickerDialog` gains a required/optional `mode` prop; new component files under `planning/`. No public API, storage, or URL surface changes.
