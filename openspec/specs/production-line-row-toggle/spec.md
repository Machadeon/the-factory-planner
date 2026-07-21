## Purpose

Defines the clickable/keyboard-operable expand-collapse contract for `ProductionLineRow` (`app/components/planning/ProductionLineRow.tsx`), the header row shown per production line that expands to reveal its assembly-line list.

## Requirements

### Requirement: Whole-row click toggles assembly-line list (R1)
A `ProductionLineRow` SHALL toggle its assembly-line expand/collapse state when the user clicks any part of the row header (the part icon, part name, rate fields' surrounding whitespace, and the "Actual: rate" text) that is not one of the interactive controls enumerated in Requirement R2. Clicks on the expanded assembly-line list content below the row header are out of scope for this requirement and SHALL NOT toggle the row.

#### Scenario: Click on part name toggles (R1.S1)
- **WHEN** the user clicks the part icon or part name area of a production line row
- **THEN** the assembly-line list expand/collapse state toggles

#### Scenario: Click on actual-rate text toggles (R1.S2)
- **WHEN** the user clicks the "Actual: <rate>" text in a production line row
- **THEN** the assembly-line list expand/collapse state toggles

#### Scenario: Click on row padding/whitespace toggles (R1.S3)
- **WHEN** the user clicks the row header's whitespace/gap areas between the part-name block and the rate controls (not inside any control listed in R2)
- **THEN** the assembly-line list expand/collapse state toggles

#### Scenario: Repeated clicks toggle open/closed consistently (R1.S4)
- **WHEN** the user clicks the row four times in a row (any combination of non-control zones), starting from collapsed
- **THEN** the state after each click is, in order: expanded, collapsed, expanded, collapsed

#### Scenario: Click-drag text selection on rate text does not toggle (R1.S5)
- **WHEN** the user presses down inside the "Actual: rate" text, drags to select text, and releases outside the original mousedown position
- **THEN** the assembly-line list expand/collapse state does not change

### Requirement: Interactive controls do not trigger row toggle (R2)
Clicking an interactive control inside a `ProductionLineRow` (Output Rate field, Production Rate field, Edit/Autocalculate button, Maximize Output button, Delete button) SHALL NOT toggle the row's expand/collapse state; it SHALL only perform that control's own action.

#### Scenario: Clicking Output Rate field does not toggle (R2.S1)
- **WHEN** the user clicks into the Output Rate text field
- **THEN** the assembly-line list expand/collapse state does not change

#### Scenario: Clicking Delete button does not toggle (R2.S2)
- **WHEN** the user clicks the Delete (Remove product) icon button
- **THEN** the assembly-line list expand/collapse state does not change AND the remove-product action fires

#### Scenario: Clicking Autocalculate/Edit/Maximize buttons does not toggle (R2.S3)
- **WHEN** the user clicks the Edit/Autocalculate rate button or the Maximize Output button
- **THEN** the assembly-line list expand/collapse state does not change AND the button's own action fires

### Requirement: Row is keyboard-operable as a single interactive element (R3)
The entire `ProductionLineRow` header SHALL be operable as one focusable interactive element with `role="button"`, `tabIndex={0}`, and `aria-expanded` reflecting the current expand/collapse state, so that keyboard users and screen readers can toggle and perceive expand/collapse without a mouse. Nested interactive controls enumerated in R2 remain independently focusable and operable and are not part of this single element's tab stop.

#### Scenario: Enter key toggles the row (R3.S1)
- **WHEN** the row has keyboard focus and the user presses Enter
- **THEN** the assembly-line list expand/collapse state toggles

#### Scenario: Space key toggles the row (R3.S2)
- **WHEN** the row has keyboard focus and the user presses Space
- **THEN** the assembly-line list expand/collapse state toggles

#### Scenario: Tabbing into a nested control does not toggle the row (R3.S3)
- **WHEN** the user tabs focus into a nested interactive control (e.g. a text field or icon button) within the row
- **THEN** the assembly-line list expand/collapse state does not change

#### Scenario: Activating a nested control via keyboard does not toggle the row (R3.S4)
- **WHEN** a nested interactive control has focus and the user presses Enter or Space to activate it
- **THEN** the assembly-line list expand/collapse state does not change AND the nested control's own action fires

#### Scenario: aria-expanded reflects state (R3.S5)
- **WHEN** the row's expand/collapse state changes (by click or keyboard)
- **THEN** the row header element's `aria-expanded` attribute is updated to match the new state ("true" when expanded, "false" when collapsed)
