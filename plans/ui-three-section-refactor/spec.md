# Spec — UI Refactor: Three Sections (Planning / Optimization / Logistics)

## Problem

The interactive surface is one shell (`FactoryComponent.tsx`) mixing three concerns:
manual planning, solver-driven optimization, and (future) logistics. Optimization controls
are scattered across three substantive modals (`RecipeOptimizerOptionsDialog`,
`ConstraintsDialog`, `RecipeListDialog`) plus panels buried in the overview sidebar. Dense,
modal-heavy, hard to navigate.

## Goal

Split the center column into three tab-switched sections — **Planning**, **Optimization**,
**Logistics** — with the inputs/outputs **overview sidebar visible at all times**. Move all
substantive modal content inline into the owning section. Logistics is a placeholder this round.

## Out of scope

- The logistics graph view itself (roadmap task 11). Only a labeled placeholder ships now.
- Library drawer, factory/icon pickers, View JSON, and confirm dialogs (consent / unsaved /
  clear / delete / reject-all) — unchanged.
- Domain model, LP solver, serialization, storage. No data-format change.

## Requirements

### R1 — Tab navigation
- A tab bar (MUI `Tabs`) sits between `FactoryHeader` and the content row.
- Tabs: `Planning`, `Optimization`, `Logistics`. Default `Planning`.
- `FactoryComponent` holds `activeSection: "planning" | "optimization" | "logistics"` in
  `useState`. Switching tabs swaps only the left/center content.
- **Only the active section is rendered; inactive sections unmount.** Originally we planned to
  keep them mounted (content-visibility) to preserve draft state — but the live-write decision
  (R6b) removed all per-panel draft state (edits go straight to the model), so there is nothing
  transient to preserve. Unmounting is simpler, avoids duplicate interactive elements in the
  a11y tree (jsdom ignores `content-visibility`, so kept-mounted sections double up comboboxes
  in tests), and is cheaper. The overview sidebar (and its `consumersByPartSlug` memo) is always
  mounted regardless, so the memo is unaffected.
- The `factory.solverError` Alert renders in the shell (below the tabs, always visible), not
  inside any one section, so solver problems are seen on every tab.

### R2 — Overview sidebar always visible
- `FactoryOverviewComponent` renders in the right column regardless of `activeSection`.
- It retains: Outputs, Consumers, Inputs, Intermediate Parts, Power & Modules, Suppliers.
- It **loses**: the Constraints panel and the Recipe Optimizer panel (and their dialogs and
  the `useState` that backed them).

### R3 — Planning section (`PlanningSection.tsx`)
- Contains: the production line list (`ProductionLineComponent` per product), the empty-state
  hint, and the Add-product control (`PartSelector` / "Add product" `Clickable`).
- Receives the same props those elements consume today from `FactoryComponent`
  (`factory`, `library`, `currentFactoryId`, `deserializedOtherFactories`, `forceExpanded`,
  and the add/remove/navigate callbacks).
- Per-line inline suggestion chips (`belowRecipeName`) keep working unchanged.

### R4 — Optimization section (`OptimizationSection.tsx`)
Composes, top to bottom:
1. **Production targets** — targets list + per-target rate + maximize toggle + Add target +
   Solve button (current `ProductionTargetsBar` body, minus the "Advanced options" dialog launch).
2. **Solver error** — the `factory.solverError` `Alert` (moved out of `FactoryComponent`).
3. **Resource constraints** — inline panel (`ConstraintsPanel`) replacing `ConstraintsDialog`.
4. **Recipe optimizer config** — inline panel (`RecipeOptimizerPanel`) replacing
   `RecipeOptimizerOptionsDialog`: objective, eager/overwrite/phase, building + recipe
   enablement, custom point values, and the nested enabled-recipe list (`RecipeListPanel`,
   replacing `RecipeListDialog`).
5. **Suggestions** — "Optimize recipes" action (verbatim `factory.optimizeRecipes()` +
   `factory.update()`) + bulk Accept-all / Reject-all — moved from the overview. The
   **reject-all confirm dialog and its `showRejectAllConfirm` state move into this section**
   together with the buttons and the `acceptAllSuggestions` / `rejectAllSuggestions` handlers
   (currently `FactoryOverviewComponent.tsx:82-111`), so the trigger, state, and dialog stay
   co-located. It remains a `Dialog` (trivial confirm) — only its ownership moves.

Notes: `ProductionTargetsBar` must **drop** its own `RecipeOptimizerOptionsDialog` launch and
the "Advanced options" `Clickable` (`ProductionTargetsBar.tsx:79-85,186-193`); the optimizer
config is now an always-visible inline panel below the targets. Each panel writes directly to
the model and calls `factory.update()` (the dialogs' `onApply` is a no-op today); no `onApply`
prop chain is needed.

### R5 — Logistics section (`LogisticsSection.tsx`)
- Placeholder: a centered message indicating the logistics/graph view is coming. No controls.

### R6 — Modal elimination
- Delete `ConstraintsDialog.tsx`, `RecipeOptimizerOptionsDialog.tsx`, `RecipeListDialog.tsx`
  after extracting their bodies into `ConstraintsPanel.tsx`, `RecipeOptimizerPanel.tsx`,
  `RecipeListPanel.tsx`.
- No `Dialog`/modal remains for optimizer config, constraints, or recipe enablement.
- Kept dialogs/overlays unchanged: library drawer, `FactoryPickerDialog`, `FactoryIconPicker`,
  `StorageConsentDialog`, unsaved/clear/delete confirms, View JSON. The reject-all confirm is
  kept as a dialog but relocated into `OptimizationSection` (see R4).

### R6b — Live-write edit model (confirmed with user)
- Inline constraint and optimizer panels write to the model **immediately** on
  edit/toggle (debounced for text rate fields where the existing field already debounces).
- **No Apply/Cancel buttons.** The staged-draft behavior of the old dialogs (Cancel
  discards, resync-on-open) is intentionally dropped. Per-row delete (✕) replaces "discard".
- Consequence: the constraints E2E specs that assert Cancel/resync semantics are rewritten;
  see validation.md.

### R7 — Behavior parity
- Every action available before remains available: add/remove targets, set rate, maximize,
  Solve, edit constraints, configure optimizer, toggle recipe enablement, optimize recipes,
  accept/reject (single + bulk). Same handlers, same model mutations + `factory.update()`.

## Acceptance criteria

- AC1: Three tabs render; default Planning; clicking each shows its section; overview sidebar
  stays mounted and live across all three.
- AC2: Planning shows production lines + Add product; adding a product works.
- AC3: Optimization shows targets/Solve, constraints editor, optimizer config, recipe list,
  and bulk suggestion actions — all inline (no modal).
- AC4: Constraints/optimizer/recipe-list changes persist to the model and affect Solve output
  identically to before.
- AC5: Overview no longer shows Constraints or Recipe Optimizer panels; still shows the six
  readout sections.
- AC6: `ConstraintsDialog.tsx`, `RecipeOptimizerOptionsDialog.tsx`, `RecipeListDialog.tsx` are
  gone; no remaining imports/refs.
- AC7: Logistics tab shows a placeholder.
- AC8: `npm run lint-fix`, `npm run test:run`, `npm run test:e2e` all green; no drawer-loop
  regression.

## Open questions

None outstanding — three design forks resolved with user (tabs; targets in Optimization;
absorb substantive modals only).
