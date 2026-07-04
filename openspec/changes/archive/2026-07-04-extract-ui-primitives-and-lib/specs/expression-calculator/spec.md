# expression-calculator Delta Spec

## ADDED Requirements

### Requirement: R1 — Module split with verbatim behavior
The expression calculator SHALL move from `app/utils.tsx` to `app/lib/expression/` split as `tokenize.ts`, `shunting-yard.ts`, `rpn.ts`, and `index.ts` (exporting `calculate`). Evaluation behavior MUST be preserved — identical results for all R1/R2 scenario inputs, locked by golden unit tests (the existing calculator cases in `tests/unit/utils.test.ts` carried over plus the scenarios below): same operators (`+ - * / % ^` with current precedence and associativity), same functions (`min max sin cos tan log sqrt`), same unary `+`/`-` handling, and the same `-0` normalization.

#### Scenario: R1.S1 — Representative expressions
- **WHEN** `calculate` evaluates `"1 + 2 * 3"`, `"-2 ^ 2"`, `"min(3, 2) * 4"`, and `"0 - 0"`
- **THEN** the results equal the pre-move implementation's results (7, 4, 8, 0 — with no `-0`)

### Requirement: R2 — Error behavior preserved
All existing error cases SHALL throw with the same messages: double `.` in a number, space inside a number, consecutive operators, invalid characters, parentheses mismatch, misplaced `,`, and insufficient operators.

#### Scenario: R2.S1 — Errors unchanged
- **WHEN** `calculate` receives `"1..2"`, `"1 2"`, `"1 +* 2"`, `"abc"`, `"(1 + 2"`, `"1 + 2)"`, and `"1 , 2"`
- **THEN** each throws the same error message the pre-move implementation throws (both paren-mismatch directions included)

#### Scenario: R2.S2 — Empty input behavior preserved
- **WHEN** `calculate` receives `""` or whitespace-only input
- **THEN** it returns `NaN` without throwing, matching the pre-move implementation

### Requirement: R3 — Tests lock the move
Unit tests SHALL cover R1/R2 scenarios and pass identically against the new module layout. Existing `tests/unit/utils.test.ts` calculator coverage moves alongside (or is superseded by) these tests; `TextCalculatorField` keeps its integration test green with only import-path updates.

#### Scenario: R3.S1 — Suite green after move
- **WHEN** `npm run test:run` executes after the move
- **THEN** all calculator tests pass with no behavioral test edits (import paths only)
