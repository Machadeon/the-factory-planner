## Pass 1 — 2026-07-11

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass
(empty — first pass)

### Findings

Dependency order:
- [7.1 / 9.1] — task 7.1 renders the two `FactoryPickerDialog`s inside `ProductionLineDetails` at step 7, but `mode` (made **required** by 9.1) isn't added/passed until step 9. Between steps 7 and 8 the step-7 call sites pass no `mode`; when 9.1 makes it required this is a compile-time type error at the moment 9.1 lands, and the step-7/8 gates ran without it. Either add `mode` (9.1) before wiring the dialogs in 7.1, or have 7.1 pass `mode` from the start and reorder 9 ahead of 7.

Scenario coverage (a):
- [pls R5.S1] — no Group 1 stub maps to R5.S1 (suites-green-without-selector-edits). It is only asserted at 10.2/10.3 as a whole-suite gate, not a written stub in Group 1. Acceptable as a meta-scenario, but flag: no explicit Group-1 test task references R5.S1; add a note or a grep-stub asserting no e2e selector diff, or annotate 10.3 as the R5.S1 owner.
- [pls R1.S2] — 1.9 (`ProductionLineRow` integration) is tagged R1.S2, but R1.S2 is the DOM-freeze/e2e scenario ("PlanningSection renders ... e2e passes without selector edit"). 1.9 tests Row in isolation, not PlanningSection-composed parity; the true R1.S2 assertion lives in 10.3 (e2e). Re-tag 1.9 to the Row's own coverage and point R1.S2 at 10.3, so the scenario isn't credited to an isolated-render stub.

Spec-vs-task consistency:
- [7.2 / pls R3] — 7.2 resets `pickerManuallyOpened` in ALL sufficiency-changing handlers (adds, remove, rate edits, toggles) per design D5, but spec R3 prose names only the "add-assembly-line action" as the reset trigger (R3.S2/S3 mention only the add). Task exceeds the spec's stated trigger. Not a coverage gap (R3.S1–S3 still pass), but reconcile: either broaden spec R3 to match D5's handler set, or the task drifts from the requirement text it cites.

Nit:
- [1.14] — "none >300 lines" is asserted in a grep stub, but it only lists the four `planning/` files; the retained parent `ProductionLineComponent.tsx` (composition parent, also a "production-line component file" per R1.S1) is not checked against the 300-line cap. Add it to the stub's file set or state it's exempt.
- [10.5] — "Lighthouse audit unchanged" has no baseline captured before the change; without a pre-change number "unchanged" is unverifiable. Either capture a baseline in step 1 or drop the quantitative claim.

## Pass 2 — 2026-07-11

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass
- [7.1/9.1 ordering bug] — RESOLVED: `FactoryPickerDialog` `mode` moved to Group 5 (migration step 4), before any extraction that re-wires the dialogs (Groups 6–9). 5.2 passes `mode` at both parent call sites; 8.1 notes the dialogs "already carrying `mode` from step 5". No gate runs with the required prop missing. Downstream groups renumbered 6–10 consistently.
- [R5.S1 no stub] — RESOLVED: 10.3 explicitly named owner of R5.S1 (suites-green-without-selector-edits) and R1.S2 (composed DOM-freeze parity).
- [1.9 mis-tag] — RESOLVED: 1.9 re-tagged to Row's own coverage; R1.S2 redirected to e2e task 10.3.
- [7.2 spec drift] — RESOLVED by broadening the requirement: R3 prose now normatively requires resetting `pickerManuallyOpened` in every sufficiency-changing handler (adds/remove/rate edits/toggles); new R3.S4 covers satisfy-via-rate-edit; the no-effect scenario is renumbered R3.S5. Task 8.2 now cites "spec R3 / design D5" and lists the full handler set; stub 1.13 covers R3.S4, 1.16 covers R3.S5.
- [1.14 parent file] — RESOLVED: the 300-line grep stub (now 1.15) checks the four `planning/` files AND the retained parent `ProductionLineComponent.tsx`.
- [10.5 lighthouse] — RESOLVED: quantitative "unchanged" claim dropped; now a visual-parity spot check with no metric target.

### Consistency & coverage verification (Pass 2 focus)
- R3 prose ↔ R3.S1–S5 internally consistent: prose visibility rule (`needMoreProduction || pickerManuallyOpened`), the reset-in-every-sufficiency-handler clause, and the no-effect clause each have a matching scenario (S1 auto-show, S2 add-satisfies, S3 partial-add, S4 rate-edit-satisfies, S5 no-effect grep). No orphan clause, no scenario contradicting prose.
- Every spec scenario has a Group-1 test task: pls R2.S1→1.1, R2.S2→1.2, R3.S1→1.10, R3.S2→1.11, R3.S3→1.12, R3.S4→1.13, R3.S5→1.16, R4.S1→1.14, R1.S1→1.15, R5.S2→1.17; opt R3.S1–S6→1.3–1.8; pls R1.S2 & R5.S1 owned by e2e 10.3 (meta-scenarios, correctly assigned).
- Group 1 stubs precede all implementation (Groups 2–10). Dependency order sound: model math (2) → helpers (3) → OptimizationSection rewire (4) → dialog `mode` (5) → FactoryRecipeCard (6) → RecipePicker (7) → Details (8) → Row+parent (9) → cleanup (10). Card→Picker→Details→Row consumption order correct; `mode` precedes all dialog re-wiring.
- No spec requirement left without an implementation task: R1→6–9, R2→2, R3→8.2, R4→5, R5→10; opt R3→3.

### Findings
(none — all 6 Pass 1 findings resolved; R3 broadening is internally consistent and coverage is complete)
