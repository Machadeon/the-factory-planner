## Why

Issue #22: clicking the "Actual: rate" text (or other non-control area) in a production line row does not toggle the assembly-line list, while clicking the part name does. `onToggleExpand` is only wired to the inner `ActionRow` wrapping the icon + part name, not the rest of the row, so users perceive the toggle area as inconsistent/broken.

## What Changes

- Make the entire `ProductionLineRow` clickable to toggle expand/collapse, not just the icon+name `ActionRow`.
- Interactive controls (Output Rate field, Production Rate field, Edit/Autocalculate/Maximize/Delete buttons) stop click propagation so they keep their independent behavior and don't also toggle expand.
- `TextCalculatorField` instances already `stopPropagation` on click — unchanged.
- `IconButton` instances (Edit/Autocalculate, Maximize, Delete) currently lack `stopPropagation` — add it so they don't bubble to the new row-level toggle.
- The whole row becomes a single keyboard-operable interactive element (`role="button"`, `tabIndex={0}`, `aria-expanded`, Enter/Space activates toggle), replacing the narrower keyboard support the inner `ActionRow` currently provides. Nested interactive controls remain independently focusable/operable and do not trigger the row toggle when activated via keyboard.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `production-line-row-toggle`: clicking anywhere in a production line row outside interactive controls toggles the assembly-line list expand/collapse state.

## Impact

- `app/components/planning/ProductionLineRow.tsx`: move `onToggleExpand` from inner `ActionRow` to row-level click handler; add `stopPropagation` to IconButton click handlers.
- New/updated integration test in `tests/integration/` covering click-to-toggle across row zones (part name, rate text, padding) and non-toggle on interactive controls.
