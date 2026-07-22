## Pass 1 — 2026-07-21 (opus subagent, cold read of design.md + tasks.md)

**Status: CONCERNS (2 blocking, resolved same pass; 5 non-blocking, folded in)**

### Blocking (resolved)

- **B1 — `TextCalculatorField` refactor undercounted call sites (7 vs actual 8).** `NestedFactoryRow.tsx:47`, `ConstraintsPanel.tsx` (×2), `AvailablePartsEditor.tsx`, and `ProductionTargetsBar.tsx` had no migration task even though they pass MUI-only `slotProps`/`variant`/`size` that the refactored primitive drops. `NestedFactoryRow.tsx` imports no raw `@mui/material`, so the `no-mui-outside-ui` guard wouldn't catch it either — only a TypeScript build error would, with no task routing to a fix.
  *Resolution:* design.md D-C1.5 and tasks.md 3.6 corrected to 8 call sites; tasks 4.1, 4.2, 4.7, 5.7 gained explicit TCF-migration lines; new task 5.8 added for `NestedFactoryRow.tsx`, with a note that it's invisible to the import guard and only caught by the build + this task.

- **B2 — `saveLibrary` call-site count wrong (~11 claimed vs actual 13 across 3 files) and the internal call inside `loadLibrary()` (storage-service.ts:40) had no task.** Task 9.2 said "8 mutation callbacks" when `useLibrary.ts` has 9.
  *Resolution:* design.md D-C3.2 corrected to 12 call sites across `useLibrary.ts`/`useFactorySession.ts` + 1 internal (13 total, 3 files); the internal `loadLibrary()` call is explicitly left non-surfacing (module is hook-free, can't toast) with a required code comment explaining the deliberate choice. Task 9.1 updated with this instruction; task 9.2's callback count corrected to 9 with all names listed.

### Non-blocking (folded in)

- **N1 — `useAutosave.flush()` toast could fire during `beforeunload`/unmount teardown**, where a toast can't paint and a state update during unmount is a footgun. Resolved: design D-C3.2 and task 9.4 now scope the error toast to the interactive flush path only.
- **N2 — Guard test (1.18) would false-positive on `layout.tsx`/`ThemeRegistry.tsx`**, which legitimately retain `@mui/material` imports for the provider setup (tasks 2.1/2.3). Resolved: task 1.18 lists both as explicit allowed exceptions.
- **N3 — Mutation-contract / snapshot-pattern check: passed, no defect.** Reviewer confirmed C1/C3/C4 touch no `Factory` model mutators; `TextCalculatorField`'s refactor preserves the `onCalculate` callback contract verbatim. Added one clarifying sentence to D-C1.5 per the reviewer's non-blocking suggestion.
- **N4 — New primitives had no stated obligation to preserve test-selector handles** (`aria-label`/`data-testid`/semantic role) across the migration, risking silent Playwright breakage outside the two new specs. Resolved: new task 3.15 states this obligation explicitly for every primitive in section 3.
- **N5 — ADR-0001 `Drawer` amendment (D-C1.6): reviewer's independent take is the amendment is the correct call**, not scope creep — hand-rolling a focus-trap-adjacent widget to avoid an ADR amendment would be worse and risks the historical drawer-loop bug class. No change made; this is the one decision design.md already flagged for explicit user sign-off before/during apply, and the review corroborates rather than overturns it.
- **N6 — Two tasks (`SourceFactoriesEditor` TextField routing, `AssemblyLineControls` Slider handling) deferred a design choice to "decide at implementation time."** Resolved: both pinned. `SourceFactoriesEditor` (4.9) → swap the `Autocomplete`'s inner `TextField` via `renderInput` (lower churn than rerouting through `PartSelector`'s different options shape). `AssemblyLineControls` (5.1) → new `ui/Slider.tsx` thin wrapper (added to the primitive roster, design D-C1.5 and tasks 3.x), isolating the `.MuiSlider-*` `sx` overrides in `ui/` rather than leaving them in `planning/`.

### Verdict

All blocking items resolved in this pass; non-blocking items folded into design.md/tasks.md directly (no separate follow-up needed — this is pre-implementation, not a shipped review). Cleared to proceed to apply. The one item carried forward for the user's attention during apply is D-C1.6 (Drawer ADR amendment) — reviewer-corroborated but originally out of the literal ask, flagged transparently rather than silently actioned.
