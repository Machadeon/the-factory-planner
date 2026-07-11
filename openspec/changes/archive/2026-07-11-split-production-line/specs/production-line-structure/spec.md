## ADDED Requirements

### Requirement: R1 — Production-line component decomposition

The production-line UI SHALL be split into focused components under `app/components/planning/`, each in its own file with one default export, replacing the monolithic `ProductionLineComponent.tsx`:

- `ProductionLineRow` — the always-visible header row: expand/collapse toggle, part icon and name, the factory-output-rate and production-rate fields (each toggling between disabled display and `TextCalculatorField`), the unit label, the auto-calculate-rate toggle, the maximize-output toggle, the actual-rate readout with diff, the remove-product button, and the line-level `SuggestedActions` shown when the line is `autoCreated`.
- `ProductionLineDetails` — the expanded body: the assembly-line list (each row an `AssemblyLine` with its per-line remove button and assembly-level `SuggestedActions`), the "add" reveal rows, and the three dialogs (`RecipeRejectDialog` and the two `FactoryPickerDialog`s).
- `RecipePicker` — the candidate-recipe list (`RecipeComponent` per game recipe not already used) and the candidate-factory list (a `FactoryRecipeCard` per candidate factory not already used).
- `FactoryRecipeCard` — the single inline candidate-factory card (icon-or-placeholder, name, instance count, resulting rate) formerly inlined in the `factoryCandidates.map` block.

A parent component (retaining or replacing the `ProductionLineComponent` export consumed by `PlanningSection`) SHALL compose `ProductionLineRow` and `ProductionLineDetails`.

#### Scenario: R1.S1 — Files exist with single responsibility
- **WHEN** `app/components/planning/` is inspected after the change
- **THEN** `ProductionLineRow.tsx`, `ProductionLineDetails.tsx`, `RecipePicker.tsx`, and `FactoryRecipeCard.tsx` each exist with exactly one default-exported component, and no single production-line component file exceeds 300 lines

#### Scenario: R1.S2 — PlanningSection renders the composed line unchanged
- **WHEN** `PlanningSection` renders a production line before and after the change with identical factory state
- **THEN** the rendered DOM exposes the same aria-labels and `data-testid`s, and the e2e suite passes without any selector edit

### Requirement: R2 — ProductionLine math methods

The pure production-line arithmetic currently inlined in the component SHALL move onto the `ProductionLine` model as methods, and the components SHALL read from them rather than recomputing:

- `recipeInstanceRate(recipe: Recipe): number` SHALL return `(this.rate - actualProductionRate) / recipe.productLookup[part.slug]`, where `actualProductionRate` is the sum of each assembly line's `getPartProductionRate(part)` — identical to the former `getProductionRateForRecipe`. Precondition: callers pass a `recipe` that produces this line's part (from `recipeLookup[part.slug]`), so `recipe.productLookup[part.slug]` is defined and non-zero; the method preserves the former behavior verbatim and adds no new divisor guard.
- `splitRecipeRates(): void` SHALL multiply every assembly line's `rate` by `n / (n + 1)`, where `n` is the current assembly-line count — identical to the former `splitRecipes` rescale (the reveal of the picker remains the component's concern).

#### Scenario: R2.S1 — recipeInstanceRate matches prior formula
- **WHEN** a `ProductionLine` with a known `rate` and assembly-line set calls `recipeInstanceRate(recipe)` in a unit test
- **THEN** the result equals `(rate − Σ getPartProductionRate(part)) / recipe.productLookup[part.slug]`

#### Scenario: R2.S2 — splitRecipeRates rescales by n/(n+1)
- **WHEN** a `ProductionLine` with `n` assembly lines (rates `r_i`) calls `splitRecipeRates()`
- **THEN** each assembly line's rate becomes `r_i * n / (n + 1)` and no other field changes

### Requirement: R3 — Picker visibility uses explicit intent, not a derived-state effect

The recipe/factory picker visibility SHALL be computed from `needMoreProduction || pickerManuallyOpened`, where `pickerManuallyOpened` is an explicit user-intent state set true when the user chooses "Add Recipe" / split, and there SHALL be no `useEffect` that mirrors `needMoreProduction` into a `showRecipes` state. `pickerManuallyOpened` SHALL be reset to `false` by **every handler that can change production sufficiency** (i.e. every op that could flip `needMoreProduction`): adding an assembly line or factory assembly line, removing an assembly line, editing the production or output rate, and toggling auto-calculate-rate or maximize-output. This reproduces the removed effect verbatim: the old `useEffect` re-derived `showRecipes = needMoreProduction` on every `needMoreProduction` transition, and those transitions could only occur through exactly these sufficiency-changing ops. Consequently the picker stays visible while `needMoreProduction` is true, remains transiently visible after a manual open while production is satisfied, and returns to tracking `needMoreProduction` after any sufficiency-changing op — matching today's behavior.

#### Scenario: R3.S1 — Picker auto-shows when production is short
- **WHEN** a production line has `needMoreProduction === true` (no lines, or actual ≠ target beyond `RATE_EPSILON`)
- **THEN** the recipe picker is visible without any user action, matching current behavior

#### Scenario: R3.S2 — Manual open then satisfy hides the picker
- **WHEN** production is already satisfied, the user opens the picker via "Add Recipe"/split (setting `pickerManuallyOpened = true`), then adds a recipe that satisfies the target
- **THEN** the picker is shown after the manual open; the add resets `pickerManuallyOpened` to `false`; and because `needMoreProduction` is now false the picker is hidden — with no derived-state `useEffect` involved

#### Scenario: R3.S3 — Partial add keeps the picker open
- **WHEN** production is short, the picker is visible, and the user adds a recipe that only partially satisfies the target (`needMoreProduction` remains true)
- **THEN** the add resets `pickerManuallyOpened` to `false` but the picker remains visible via `needMoreProduction`, matching current behavior

#### Scenario: R3.S4 — Satisfy via rate edit closes a manually-opened picker
- **WHEN** production is satisfied, the user manually opens the picker, then edits the production rate up and back (or otherwise triggers a sufficiency-changing handler) that leaves production satisfied
- **THEN** `pickerManuallyOpened` is reset to `false` by that handler and the picker hides — matching the old effect, which force-closed a manually-opened picker whenever `needMoreProduction` transitioned

#### Scenario: R3.S5 — No derived-state effect remains
- **WHEN** the decomposed production-line source is searched
- **THEN** no `useEffect` depends on `needMoreProduction` to set a picker-visibility state

### Requirement: R4 — FactoryPickerDialog mode prop

`FactoryPickerDialog` SHALL accept a **required** `mode: "recipe" | "supplier"` prop that selects its title text: `"recipe"` → "Use Factory as Recipe", `"supplier"` → "Supply from Factory". There is no default (the prop is required; omitting it is a compile-time type error). The two production-line instances SHALL pass the mode matching their action ("Use Factory as Recipe" reveal → `recipe`; "Supply from Factory" reveal → `supplier`). No `data-testid` or aria-label changes, and the dialog's pick behavior is unchanged.

#### Scenario: R4.S1 — Title reflects mode
- **WHEN** `FactoryPickerDialog` is rendered open with `mode="recipe"` and again with `mode="supplier"`
- **THEN** the titles read "Use Factory as Recipe" and "Supply from Factory" respectively, and both preserve the existing onPick contract

### Requirement: R5 — Behavior freeze

This change SHALL NOT alter observable behavior: all aria-labels and `data-testid`s are unchanged; storage keys/formats and URL formats are unchanged; the full unit, integration, and e2e suites pass; `npm run build` is clean. `var` declarations in the affected files SHALL be replaced with `const`/`let`. The only permitted observable copy change is the two factory-picker dialog titles becoming distinct (R4), which no e2e selector targets.

#### Scenario: R5.S1 — Suites green without selector edits
- **WHEN** `npm run test:run` and `npm run test:e2e` run after the change
- **THEN** all tests pass and no e2e selector (`getByRole`/`getByTestId`) was modified to accommodate the split

#### Scenario: R5.S2 — No `var` in affected files
- **WHEN** the new `planning/` production-line files are searched for `var `
- **THEN** none is found
