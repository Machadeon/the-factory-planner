# Implementation Plan — UI Refactor: Three Sections

Branch: `ui-three-section-refactor`. Execute in order; each step is independently verifiable
(`npm run test:run` + targeted E2E). Commit at the marked checkpoints.

## Step 0 — Branch
`git checkout -b ui-three-section-refactor`.

## Step 1 — Extract `ConstraintsPanel.tsx` (live-write)
From `ConstraintsDialog.tsx`. Keep the body (constraint rows, defaults list, Add constraint,
PartSelector). Changes:
- Drop `Dialog/DialogTitle/DialogContent/DialogActions`, `open`/`onClose`/`onApply` props,
  Cancel/Apply buttons, the local `constraints` `useState`, and the open-sync `useEffect`.
- Read rows directly from `factory.constraints`. Each mutation (`addConstraint`,
  `removeConstraint`, `updateConstraint`) writes a new array to `factory.constraints`, then
  calls `factory.autoCalculateRates()` + `factory.update()` (mirrors old `handleApply`, now
  per committed edit — `TextCalculatorField` commits on blur/enter, so no LP-per-keystroke).
- Wrap in a labeled section: heading `Resource Constraints`. Add `aria-label`/accessible name
  on the row delete button matching test `name: /remove constraint/i` (use a `Tooltip` +
  `IconButton` or `aria-label="Remove constraint"`).
- Props: `{ factory: Factory }`.
- **Checkpoint A:** component compiles; `OptimizationSection` not yet wired. (No test yet.)

## Step 2 — Extract `RecipeListPanel.tsx`
From `RecipeListDialog.tsx` body (searchable enable/disable recipe list + override rows).
- Strip the Dialog wrapper; render inline (collapsible via a local `show` toggle is fine —
  it's a long list). Writes go straight to `factory.optimizer.enabledRecipes` via the existing
  `setRecipesEnabled` helper, then `factory.update()` (no auto-solve; recipes only matter at
  Solve). Props: `{ factory, library?, currentFactoryId? }` as needed.

## Step 3 — Extract `RecipeOptimizerPanel.tsx` (live-write)
From `RecipeOptimizerOptionsDialog.tsx`. Largest conversion.
- Drop Dialog wrapper, `open`/`onClose`/`onApply`, the local `config` `useState`, the open-sync
  `useEffect`, and `handleApply`.
- Replace the `update(patch)` helper with one that writes the model:
  `factory.optimizer = { ...factory.optimizer, ...patch }; factory.update();`
  (no `autoCalculateRates` here — objective/eager/phase/enablement only take effect on the next
  Solve/Optimize; `eager` already drives auto-rerun elsewhere).
- Cascade helpers (`updatePhase`, `toggleCategory`, `toggleBuilding`, `toggleRecipe`,
  `add/removeAvailablePart`, `add/removeSourceFactory`) compute `next` from
  `factory.optimizer` (instead of `prev`) and route through the new `update`.
- Embed `RecipeListPanel` where the dialog embedded `RecipeListDialog` (replace the
  `showRecipeList` modal launch with the inline panel or a local expand toggle).
- Keep `sourceFactories` / `factoryOptions` `useMemo`s (depend on `factory`/`library`).
- Props: `{ factory, library?, currentFactoryId? }`.
- **Checkpoint B (commit):** panels extracted, old dialogs still present/unused. `test:run` green.

## Step 4 — `OptimizationSection.tsx`
Compose, in a scroll container (flex col):
1. `ProductionTargetsBar` (see Step 5).
2. `factory.solverError` `Alert` (moved from `FactoryComponent`).
3. `ConstraintsPanel`.
4. `RecipeOptimizerPanel` (contains `RecipeListPanel`).
5. Suggestions block: objective summary text + "Optimize recipes" button
   (`factory.optimizeRecipes()` + `factory.update()`), Accept-all/Reject-all buttons, and the
   **reject-all confirm `Dialog` + `showRejectAllConfirm` state + `acceptAllSuggestions` /
   `rejectAllSuggestions` handlers** lifted verbatim from `FactoryOverviewComponent.tsx:67-111,508-561`.
- Props: `{ factory, library?, currentFactoryId? }`.
- Satisfies stubs T4, T4b, T5, T6, T7.

## Step 5 — Trim `ProductionTargetsBar.tsx`
- Remove the `RecipeOptimizerOptionsDialog` import, the `showRecipeOptimizerDialog` state, the
  "Advanced options" `Clickable` (`:79-85`), and the dialog render (`:186-193`).
- Keep targets list + Solve. Existing `ProductionTargetsBar.test.tsx` stays green.

## Step 6 — `PlanningSection.tsx`
Lift `FactoryComponent.tsx:773-811` (empty-state hint, production line list, Add-product
`PartSelector`/`Clickable`). Props mirror what those elements consume today
(`factory`, `library`, `currentFactoryId`, `candidateFactories`/`deserializedOtherFactories`,
`forceExpanded`, `onToggle`, `addProductionLine`, `removeProductionLine`,
`handleNavigateToFactory`, `addingProduct`+setter — or keep `addingProduct` state inside the
section). Prefer moving `addingProduct` state into `PlanningSection`.

## Step 7 — `LogisticsSection.tsx`
Placeholder: centered message mentioning "Logistics" / coming soon. Props `{ factory }`
(unused now; keeps a stable signature). Satisfies T8.

## Step 8 — Wire tabs in `FactoryComponent.tsx`
- Add `activeSection` `useState<"planning"|"optimization"|"logistics">("planning")`.
- Insert MUI `Tabs`/`Tab` between `FactoryHeader` and the content row (`:760`).
- In the left/center column render all three sections, each wrapped in a div with
  `style={{ contentVisibility: activeSection === X ? "visible" : "hidden" }}` (stay mounted).
  Logistics may render lazily.
- Remove the relocated `solverError` Alert and the lifted Planning JSX from `FactoryComponent`.
- Keep `FactoryOverviewComponent` in the right column unchanged in placement.
- Satisfies T1–T3, T9, T10.

## Step 9 — Strip overview optimization panels
`FactoryOverviewComponent.tsx`: remove Constraints (`397-461`) + Recipe Optimizer (`462-561`)
panels, the reject-all dialog, `ConstraintsDialog`/`RecipeOptimizerOptionsDialog` imports, and
the now-unused state (`showConstraints`, `showConstraintsDialog`, `showRecipeOptimizer`,
`showRecipeOptimizerDialog`, `showRejectAllConfirm`, `suggestion*` counts, accept/reject
handlers, `OBJECTIVE_LABELS`). Keep the six readout sections + `consumersByPartSlug` memo.
`FactoryOverviewComponent.test.tsx` should remain green (it asserts only readout sections).

## Step 10 — Delete dead dialogs + rewrite coupled E2E
- Delete `ConstraintsDialog.tsx`, `RecipeOptimizerOptionsDialog.tsx`, `RecipeListDialog.tsx`
  (grep-confirm no remaining imports).
- **Delete** `tests/e2e/constraints/{cancel-discards-changes,delete-then-cancel,dialog-resyncs-on-open}.spec.ts`.
- Rewrite remaining `tests/e2e/constraints/*` + `tests/e2e/auto-fill/configure-auto-fill.spec.ts`:
  open the Optimization tab; target inline panels (no `role="dialog"`, no Apply); assert
  live-write persistence to `factory.optimizer` / `factory.constraints` and across reload.
- **Checkpoint C (commit):** dialogs gone, suite rewritten.

## Step 11 — Full verify
`npm run lint-fix && npm run test:run && npm run test:e2e`. Then dev-server manual pass +
`lighthouse_audit` (UI changed). Watch for drawer-loop regression. Final commit.

## Reuse
- `factory.optimizeRecipes()`, `factory.autoCalculateRates()`, `factory.update()`,
  `setRecipesEnabled`, `recipeMatchesFilters`, `defaultRecipeOptimizerConfig`,
  `defaultResourceLimits`, `PartSelector`, `TextCalculatorField`, `Clickable`,
  `HorizontalDivider`, MUI `Tabs`/`Tab`/`Dialog`/`Switch`.

## Risks
- Optimizer panel cascade helpers must read fresh `factory.optimizer` each call (no stale draft).
- Per-edit `autoCalculateRates` in `ConstraintsPanel` runs the LP on each committed edit — fine
  at blur cadence; do NOT trigger it per keystroke.
- Overview state pruning must be complete (no orphaned vars → lint failure).
- `content-visibility: hidden` on inactive section: confirm Playwright treats inner text as
  not-visible-but-attached (used by T-remount); adjust to a `hidden`-attribute fallback if MUI
  panels misbehave.
- Schema/data: none. No serialization change (`factory.optimizer`/`constraints` already persisted).
