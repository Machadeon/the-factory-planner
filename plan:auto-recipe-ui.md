# Auto-fill Recipes — UI Plan

## Context

Satisfactory has many alternate recipes; picking the right ones for a goal (sink
points, power, buildings, etc.) is the core optimization challenge. The
`auto-recipe.md` feature lets the user state requirements and have the solver
auto-fill production lines between desired products and raw resources.

This plan covers **only the UI surface**. The LP objective construction,
recipe-selection algorithm, and `autoFillProductionLines()` solver logic are
**out of scope** — handled separately. Here we define the controls, dialog, and
indicators the user interacts with, matching existing UI conventions so the
feature feels native.

Decisions locked with the user:
- Trigger lives in a new **Overview section** (mirrors the Constraints feature).
- Dialog exposes: **Scoring objective**, **Part availability (incl. source
  factories)**, **Tech/phase filter with per-recipe overrides**, **Keep vs
  overwrite**.
- Auto-fill is **always active** — there is no enabled/off state. The only
  toggle is **eager** (re-run on every edit) vs manual (run via button).
- Suggested recipes shown as an inline **"Suggested" chip + accept/reject** at
  **both production-line and assembly-line level**.
- The Auto-fill overview section gets **"Accept all"** and **"Reject all"**
  buttons.
- Suggested provenance reuses the existing **`ProductionLine.autoCreated`**
  field (currently unused — created for this feature); add the same flag to
  `AssemblyLine`.

## UI conventions to follow (verified)

- Dialogs: MUI `Dialog maxWidth="sm" fullWidth` → `DialogTitle` →
  `DialogContent` (Tailwind flex rows) → `DialogActions` (text `Button` Cancel +
  `variant="contained"` primary). Controlled open via parent `useState`.
  Template: `app/components/ConstraintsDialog.tsx`.
- List rows: `<div className="flex flex-row items-center gap-x-2 mb-2">` with a
  24×24 `next/image` part icon + name `<span>` + control + `Clickable` delete
  icon. (`ConstraintsDialog.tsx:104-155`)
- Numeric inputs: `TextCalculatorField variant="outlined" size="small"` with
  `allowClear`/`onClear` for optional values.
- Icon affordances: `Clickable` (custom div, not MUI Button) +
  `@mui/icons-material` icon. Toolbar uses `Tooltip`→`span`→`Clickable`→icon.
- Part picker: reuse `app/components/PartSelector.tsx` with `existingParts`
  exclusion (see `ConstraintsDialog.tsx:184-189`).
- Source-factory picker: reuse `app/components/FactoryPickerDialog.tsx` (already
  used by `ProductionLineComponent.tsx` for supply linking) and the existing
  `factory.supplierFactories` concept (`factory.tsx:39`).
- Styling: Tailwind v4 utilities + MUI default dark/light palette. Secondary
  text `text-gray-400`. No custom theme tokens. No table component — use the
  flex-row list idiom.
- State: Factory is a mutable class in a `useRef` with manual `setVersion` bump;
  prop-drilled. Mutate model fields directly, then `factory.autoCalculateRates()`
  (re-solve) or `factory.update()` (rates + re-render).
  (`FactoryComponent.tsx:56-58,119-130`)

## Model touch-points (UI-facing fields only; algorithm separate)

- `app/models/factory.tsx` — add `factory.autoFill` config (mirror the
  `constraints` field pattern, `:42`):
  ```ts
  autoFill: {
    eager: boolean;                 // re-run on every edit; default false
    objective: ScoringObjective;    // "sinkPoints"|"power"|"buildings"|"inputValue"; default "sinkPoints"
    availableParts: string[];       // part slugs preferred as already-available
    availableFactoryIds: string[];  // source factories whose outputs are available
    phase: number;                  // game phase ceiling for recipe unlocks
    defaultRecipesEnabled: boolean; // master toggle for standard recipes; default true
    alternateRecipesEnabled: boolean; // master toggle for alternate recipes; default true
    recipeOverrides: Record<string, boolean>; // per-recipe allow/deny over the toggles+phase
    overwrite: boolean;             // overwrite all lines vs fill gaps; default false (keep)
    rejectPrompt: "ask" | "always" | "never"; // on rejecting a suggestion, remove recipe? default "ask"
  }
  ```
  No `enabled` field — auto-fill is always active.
- Default-vs-alternate classification: Satisfactory alternate recipes carry an
  `"Alternate: "` name prefix (the same prefix stripped in display). Derive an
  `isAlternate` helper on `Recipe` (prefix check, or a data flag if present in
  `data.json`) so the two master toggles can partition recipes.
- Serialization: add optional `autoFill?` to `app/models/factory-storage.ts`
  next to `constraints` (`:36`, write `:90-91`, restore `:137,:223`).
- Recipe provenance:
  - `ProductionLine.autoCreated` (`production-line.tsx:29`) — already exists,
    currently unused; use it as the "suggested" marker. **Accept** → set
    `autoCreated = false` (line becomes permanent). **Reject** → remove the line.
  - Add an `autoCreated: boolean` flag to `AssemblyLine`
    (`app/models/assembly-line.tsx`). An auto-created assembly line is
    accept/reject-able **independently of whether its production line is
    auto-created** — a manual (permanent) line can still hold suggested recipe
    choices.
- Source-factory availability seam: store `availableFactoryIds` only; compute
  available outputs through a Factory method (e.g.
  `factory.availableOutputsFrom(sourceFactory)`) rather than a frozen snapshot.
  Design it so a later version can return **net** available outputs — a source
  factory's production minus what other factories already pull from it. v1 may
  return gross outputs, but the call site and signature must not assume gross.

## Components

### 1. Auto-fill overview section — `FactoryOverviewComponent.tsx`

Add after the Constraints block (after `:392`), built like Constraints
(`:329-392`):

- Header row: `<span className="text-lg grow">Auto-fill</span>` + show/hide
  `Clickable` (`VisibilityIcon`/`VisibilityOffIcon`), matching `:329-339`.
- Summary body (`text-sm text-gray-400`): objective label, eager on/off, count
  of available parts + source factories, phase, keep/overwrite, and suggested
  count (e.g. "3 suggested recipes").
- Actions row (`Clickable` + icon, like "Edit constraints" `:379-385`):
  - `AutoFixHighIcon` "Configure auto-fill" → opens `AutoFillDialog`.
  - `PlayArrowIcon` "Run auto-fill" → `factory.autoFillProductionLines()` then
    re-render. (Always available; eager just additionally runs it on edits.)
- **Accept all / Reject all** — when suggestions exist, render below the actions
  row as **full-width MUI `Button`s** (`fullWidth` + `DoneAllIcon`/`ClearAllIcon`
  `startIcon`), stacked with clear spacing (`mt-3`, `gap-2`) and visually
  separated from the icon actions above to prevent mis-clicks. Accept all → set
  `autoCreated = false` on every suggested production + assembly line. Reject all
  → remove all suggested lines and revert suggested assembly recipes. Both call
  `factory.update()`. Reject all does a single bulk confirm (not the per-recipe
  4-option prompt) but still honors `rejectPrompt === "always"` (add deny
  overrides for the removed recipes).
- Render `<AutoFillDialog open onClose factory onApply />` controlled by a new
  `showAutoFillDialog` `useState` (mirror `showConstraintsDialog`).

### 2. `AutoFillDialog.tsx` (new) — `app/components/AutoFillDialog.tsx`

Copy `ConstraintsDialog.tsx`. Local state seeded from `factory.autoFill`,
re-synced on `open` (the `useEffect` at `ConstraintsDialog.tsx:42-47`).
`handleApply` writes `factory.autoFill = config; factory.autoCalculateRates();`
then `onApply()` + `onClose()`. `handleClose` discards local state.

`DialogContent` sections, separated by `HorizontalDivider`:

1. **Run mode** — single MUI `Switch` "Re-run on every edit (eager)" with helper
   `text-xs text-gray-400`: "May be slow with many recipes." (Switch style per
   `FactoryHeader.tsx:178-181`.) No enable/off switch.

2. **Scoring objective** — MUI `RadioGroup` (or `Select size="small"`): Max sink
   points (default), Min power, Min buildings, Min input value. One-line
   `text-xs text-gray-400` description.

3. **Tech / game phase filter**
   - `Select size="small"` for current game phase — sets the unlock ceiling.
   - **Two master toggles** (MUI `Switch`): "Default recipes enabled" and
     "Alternate recipes enabled". These set the baseline allow/deny per category
     (combined with the phase ceiling). Toggling one **clears the per-recipe
     overrides that belong to that category** from `recipeOverrides` (so the
     toggle becomes the source of truth again); confirm before clearing if any
     overrides exist.
   - **Active overrides list (always visible)** directly below the phase select
     and **above** the search box: one `RecipeOverrideRow` per entry in
     `recipeOverrides`, each with a `Clickable` `DeleteIcon`/`CloseIcon` to
     remove the override (revert to phase default). Empty state: `text-sm
     text-gray-400` "No recipe overrides."
   - **Search box + results** below the active list: a text filter (PartSelector
     filter pattern) listing matching recipes as `RecipeOverrideRow`s; clicking
     a row toggles its allow/deny into `recipeOverrides`. Phase sets the default;
     overrides win.
   - **`RecipeOverrideRow` (new compact component)** — single row, the **only
     text is the recipe name**:
     `[allow/deny toggle] [building icon] [recipe name] [power W] [in-icons →
     out-icons]`.
     - Recipe name with any `"Alternate: "` prefix stripped.
     - Building icon from `recipe.building`; power from `recipe.minPowerUsage`/
       `maxPowerUsage` (`customPowerUsage` handled), formatted with `displayNum`.
     - Inputs and outputs inline: each is **part icon only** (24×24, wrapped in
       MUI `Tooltip` showing the part name) + quantity (`recipe.ingredients` /
       `recipe.products`, `RecipePart.quantity`). Separate inputs from outputs
       with the `EastIcon` arrow (already used in `RecipeComponent.tsx:4`).
     - Note: `RecipeComponent.tsx` shows rates/editable fields and is too heavy;
       build a dedicated lightweight row reusing its icon/`displayNum` idioms.

4. **Keep vs overwrite** — `Switch`/two-option toggle: "Fill gaps only (keep my
   recipes)" vs "Overwrite all production lines". Default keep.

5. **Part availability** (flex-row list, like Constraints rows)
   - Part rows: icon + name `span (w-32 text-sm shrink-0)` + optional
     `TextCalculatorField` "Available /min" (`w-24`, `allowClear`) + `Clickable`
     `DeleteIcon`.
   - "Add available part" `Clickable` + `AddIcon` → inline `PartSelector` with
     `existingParts` exclusion (reuse `ConstraintsDialog.tsx:184-201`).
   - **Source factories**: a parallel list of selected source factories, each
     shown with its **produced parts paired with production rate** (part icon +
     name + `displayNum(rate)/min`, via `availableOutputsFrom(sourceFactory)`),
     plus a `Clickable` remove. "Add source factory" `Clickable` opens
     `FactoryPickerDialog`. Selected IDs → `availableFactoryIds`. Surfacing the
     rates here also exercises the net-availability seam (see model section), so
     a later "only unclaimed outputs" view drops in without UI changes.

`DialogActions`: `Button` "Cancel" + `Button variant="contained"` "Apply".
Optional third text `Button` "Apply & Run".

### 3. Suggested-recipe indicators

**Reject flow (shared by line- and assembly-level Reject, and per-recipe in
"Reject all"):** when a user rejects a suggested recipe, decide whether to also
remove it from the auto-filler's available recipes (a deny `recipeOverride`):

- If `factory.autoFill.rejectPrompt === "ask"`, open a small MUI `Dialog` —
  "Remove this recipe from auto-fill suggestions?" — with four actions:
  - **Never** → set `rejectPrompt = "never"`, do **not** add an override, then
    reject. (Future rejects never remove, no prompt.)
  - **No** → reject only; recipe stays available. One-time, no state change.
  - **Yes** → add a deny override (`recipeOverrides[slug] = false`), then reject.
    One-time.
  - **Always** → set `rejectPrompt = "always"` **and** add the deny override,
    then reject. (Future rejects auto-add the override, no prompt.)
- If `rejectPrompt === "always"`: reject and add the deny override silently.
- If `rejectPrompt === "never"`: reject without adding an override, silently.

This is a 4-button confirm `Dialog` (MUI `Dialog` + `DialogActions` with four
`Button`s; reuse the inline-confirm-dialog pattern from
`FactoryComponent.tsx:646`). `rejectPrompt` is part of `autoFill` config and is
persisted.

For any item with `autoCreated === true`:

- **Production line** — `ProductionLineComponent.tsx` header row: MUI `Chip
  size="small" label="Suggested"` (`color="info"`) + two `Clickable` icons in
  `Tooltip`s:
  - `CheckIcon` "Accept" → `productionLine.autoCreated = false; factory.update()`.
  - `CloseIcon` "Reject" → run the **reject flow** above, then remove via the
    existing delete path (`onDeleteClicked`); `factory.update()`.
- **Assembly line** — `AssemblyLineComponent.tsx` (and/or
  `AssemblyLineControls.tsx`): same `Suggested` chip + Accept/Reject on each
  assembly line, shown **whenever `assemblyLine.autoCreated`, regardless of
  whether the parent production line is auto-created**. Accept →
  `assemblyLine.autoCreated = false`. Reject → run the reject flow above, then
  remove that assembly line (the recipe choice), leaving the production line.

## Out of scope (handled elsewhere)

- `autoFillProductionLines()` / objective + variable expansion over
  `recipeLookup`, raw-resource limits, recycled rubber/plastic loop exclusion.
- Sink-point virtual scoring, power/space/point-value heuristics, requirement
  priority ordering.
- Web Worker / async loading state. Current solver is **synchronous** with no
  spinner; if 200+ variables stalls the UI, add a loading state as follow-up.
  Manual (non-eager) default mitigates this for v1.

## Verification

1. `make` / `npm run dev`, open the app.
2. Overview shows the **Auto-fill** section under Constraints; show/hide works;
   summary reflects config; Accept all / Reject all appear only with suggestions.
3. "Configure auto-fill" opens `AutoFillDialog`. Verify: eager switch, objective
   radio, phase select + per-recipe override toggles, keep/overwrite, part
   availability add/remove, and source-factory add/remove via FactoryPickerDialog.
   Cancel discards; Apply persists to `factory.autoFill`.
4. Reload after save → config restored (`factory-storage.ts` round-trip).
5. With suggested lines present: "Suggested" chip + Accept/Reject render at both
   production-line and assembly-line level; Accept clears the chip (flips
   `autoCreated`), Reject removes the line/recipe; sidebar Accept all / Reject
   all act on all suggestions.
6. Dark + light parity (MUI palette) and small-screen layout.
7. Add a Playwright e2e test mirroring the Constraints dialog tests (open dialog,
   edit each control, Apply, assert persisted state + suggested-chip flow).
8. `make` lint/typecheck (Biome) passes; match existing `biome-ignore` for the
   open-sync `useEffect`.
