# ui-primitives Specification

## Requirements

### Requirement: R1 — Semantic interactive elements
Every shared interactive primitive in `app/components/ui/` SHALL render a real semantic element (`<button>` for activatable controls) with keyboard activation (Enter and Space) and visible focus. The `<div onClick>` primitive `Clickable` SHALL be deleted; no file in `app/` may import it after this change.

#### Scenario: R1.S1 — Keyboard activation
- **WHEN** an `IconButton` or `ActionRow` has focus and the user presses Enter or Space
- **THEN** its `onClick` handler fires, identically to a pointer click

#### Scenario: R1.S2 — Clickable is gone
- **WHEN** the change is complete
- **THEN** `app/components/Clickable.tsx` does not exist and no import of it remains in `app/` or `tests/`

### Requirement: R2 — IconButton
`ui/IconButton` SHALL render a `<button>` with a required `aria-label`, an MUI `Tooltip`, and the existing hover/active/danger/warning visual styles of the current `Tooltip > span > Clickable` pattern. It SHALL be the single home for icon-button rendering; hand-rolled `Tooltip > Clickable` icon buttons MUST NOT remain.

#### Scenario: R2.S1 — Required aria-label
- **WHEN** `IconButton` renders
- **THEN** the `<button>` carries the `aria-label` prop value and the tooltip shows the same text by default

#### Scenario: R2.S2 — Migrated labels match former tooltips
- **WHEN** an existing icon-button call site is migrated
- **THEN** its `aria-label` equals the former `Tooltip` title verbatim, unless the change is enumerated in R10's selector-change list

#### Scenario: R2.S3 — Style variants preserved
- **WHEN** a migrated call site used the `danger` or `warning` Clickable style
- **THEN** the `IconButton` renders the same border/hover/active classes as before

### Requirement: R2a — ActionRow
`ui/ActionRow` SHALL be the successor for non-icon-button `Clickable` uses (clickable rows/tiles with text or composite content): a real `<button>` (full-width row layout) with keyboard activation and visible focus, accessible name derived from its content or an explicit `aria-label`, and the same default/danger/warning hover-active styling classes as `Clickable` today.

#### Scenario: R2a.S1 — Row semantics
- **WHEN** an `ActionRow` renders with text content
- **THEN** it is reachable by Tab, exposes role `button` with an accessible name from that content, and activates on Enter/Space

### Requirement: R3 — ConfirmDialog
`ui/ConfirmDialog` SHALL be the single confirm-dialog implementation: props for title, message, confirm label, cancel label, and a `severity` (`default` | `warning` | `danger`) mapping the confirm button to today's MUI color (primary/warning/error, contained); an optional secondary action (label + handler) covers the two existing three-choice dialogs (unsaved-load, clear-confirm: Cancel / Discard / Save-and-continue). Confirm invokes its action exactly once; cancel and Escape dismiss without invoking confirm or secondary. All 5 existing confirm dialogs (unsaved-load, clear-confirm, delete-factory, delete-folder, reject-all) SHALL compose it. *(Amended during implementation: the original danger-boolean shape could not represent the warning-colored reject-all dialog or the three-action dialogs without visual change.)*

#### Scenario: R3.S1 — Confirm path
- **WHEN** the user activates the confirm button
- **THEN** the `onConfirm` callback fires once and the dialog closes

#### Scenario: R3.S2 — Cancel paths
- **WHEN** the user activates cancel, presses Escape, or clicks the backdrop (MUI Dialog default close)
- **THEN** the dialog closes and `onConfirm` is never called

### Requirement: R4 — InlineEditText
`ui/InlineEditText` SHALL commit its trimmed value on Enter and on blur — the commit callback fires whether or not the value changed, matching the current `commitEdit` behavior. It SHALL cancel on Escape, reverting to the pre-edit value without invoking the commit callback; a trimmed-empty value on commit also cancels without invoking the callback. Both existing rename sites (folder and factory rename in `FactoryLibraryDrawer`) SHALL compose it.

#### Scenario: R4.S1 — Enter commits
- **WHEN** the user edits the text and presses Enter (changed or unchanged value)
- **THEN** the commit callback receives the trimmed value

#### Scenario: R4.S2 — Escape cancels
- **WHEN** the user edits the text and presses Escape
- **THEN** the commit callback is not invoked and the displayed value reverts

#### Scenario: R4.S3 — Blur commits
- **WHEN** the field loses focus (changed or unchanged value)
- **THEN** the commit callback receives the trimmed value

#### Scenario: R4.S4 — Escape-then-blur does not commit
- **WHEN** the user presses Escape and the field subsequently blurs
- **THEN** the commit callback is not invoked for that blur

#### Scenario: R4.S5 — Empty value cancels
- **WHEN** the user commits (Enter or blur) with a value that trims to empty
- **THEN** the commit callback is not invoked and the edit is cancelled

### Requirement: R5 — AddItemControl
`ui/AddItemControl` SHALL render an add-trigger button that, when activated, reveals an inline child control. It SHALL always collapse back to the trigger when the child signals completion (item selected/added). Blur-close SHALL be configurable to preserve each site's current behavior: PlanningSection, RecipeOptimizerPanel ×2, and ProductionTargetsBar close on blur today and keep doing so; ConstraintsPanel has no blur-close today and keeps that. Partial input in the revealed child is discarded on collapse — nothing is committed. All 5 existing "Add X" reveals SHALL compose it.

#### Scenario: R5.S1 — Reveal and collapse on completion
- **WHEN** the user activates the add trigger and the revealed child signals completion
- **THEN** the child was shown and the control collapses back to the trigger

#### Scenario: R5.S2 — Blur-close per site
- **WHEN** the revealed child loses focus at a blur-close site vs. at ConstraintsPanel
- **THEN** the control collapses at the blur-close site and stays open at ConstraintsPanel

#### Scenario: R5.S3 — Partial input discarded
- **WHEN** the control collapses (blur or completion) while the child holds uncommitted partial input
- **THEN** no callback fires for the partial input and reopening shows a fresh child

### Requirement: R6 — CollapsibleSection
`ui/CollapsibleSection` SHALL render a header that toggles visibility of its body content, locked to the current `SectionHeader` markup: label in a `text-lg grow text-gray-400` span, chevron `ExpandMoreIcon` (small) when expanded and `ChevronRightIcon` (small) when collapsed, header row styled as the full-width clickable row. Initial state comes from a required `defaultExpanded` prop (current sites: intermediates collapsed, all other overview sections expanded).

#### Scenario: R6.S1 — Toggle
- **WHEN** the user activates the section header
- **THEN** the body toggles between visible and hidden, and the chevron switches between `ExpandMoreIcon` (expanded) and `ChevronRightIcon` (collapsed)

#### Scenario: R6.S2 — Initial state
- **WHEN** the overview sidebar mounts after migration
- **THEN** the intermediates section starts collapsed and outputs/inputs/consumers/power/suppliers start expanded, as today

### Requirement: R7 — FileImportButton
`ui/FileImportButton` SHALL encapsulate the hidden `<input type="file">` + trigger-button pattern; activating the trigger opens the file picker and the selected file is delivered to a callback. Both existing sites (FactoryHeader, FactoryLibraryDrawer) SHALL compose it.

#### Scenario: R7.S1 — File selection
- **WHEN** the user activates the trigger and selects a file
- **THEN** the callback receives that file and the input is reset so the same file can be re-selected

#### Scenario: R7.S2 — Picker cancelled
- **WHEN** the user activates the trigger and dismisses the file picker without selecting
- **THEN** the callback is not invoked

### Requirement: R8 — RateDisplay
`ui/RateDisplay` SHALL render a formatted rate value with its unit, delegating unit selection to `lib/format.ts`. Status color is variant-agnostic: the caller passes an optional color class produced by the `lib/rate-status.ts` API (the call site chooses the variant); `RateDisplay` itself never picks a variant. It SHALL replace the per-site `slug === "power" ? "MW" : "/min"` branching where a value+unit pair renders together; sites that render a bare unit label (e.g. ProductionTargetsBar's standalone unit span) use the lib unit function directly.

#### Scenario: R8.S1 — Unit rendering
- **WHEN** `RateDisplay` renders the power part vs. a solid part
- **THEN** the displayed unit is ` MW` vs. `/min` respectively, with the value formatted by `displayNum`

#### Scenario: R8.S2 — Caller-chosen status color
- **WHEN** a call site passes a color class from either rate-status variant
- **THEN** `RateDisplay` applies exactly that class, with no color when none is passed

### Requirement: R9 — ui/ is domain-free
Files under `app/components/ui/` MUST NOT import from `app/models/` or other feature components; props are primitives, strings, callbacks, and React nodes only. (`RateDisplay` receives pre-resolved display inputs or imports only `app/lib/`.)

#### Scenario: R9.S1 — Import audit
- **WHEN** imports of `app/components/ui/*` files are inspected
- **THEN** none resolve to `app/models/` or `app/components/` outside `ui/`

### Requirement: R10 — Frozen selector contract
Existing `aria-label` and `data-testid` values SHALL NOT change, except where enumerated below. New `aria-label`s are additive. E2E selectors relying on role `button` uniqueness SHALL be audited, since real `<button>`s make `getByRole('button')` match more elements.

Enumerated selector changes: _none._ Implementation note: MUI Tooltip previously projected its title as the wrapped control's accessible label, so sites with **dynamic** tooltip titles (Save/"Save (unsaved changes)", Expand all/Collapse all/"No production lines", maximize toggles) carry the same dynamic expression as their `aria-label` — the effective accessible names are unchanged, verified by the full Playwright suite passing without selector edits.

#### Scenario: R10.S1 — Selector stability
- **WHEN** the full Playwright suite runs after migration
- **THEN** it passes with selector changes limited to those enumerated in this requirement
