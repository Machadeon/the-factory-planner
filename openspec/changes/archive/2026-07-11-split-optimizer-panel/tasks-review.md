<!-- Append-only. Each review pass adds a new ## Pass N section. Never delete or edit previous passes. -->

## Pass 1 — 2026-07-10

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass
(leave empty, this is pass 1)

### Findings
[R1.S2] — no test task exists anywhere for R1.S2 (no inline duplication / handlers call named exports). Not in Group 1, not deferred-with-rationale in Group 6/7 like R4/R5. R3.S1/R3.S2 got equivalent fs-based structural stubs (1.6/1.7); R1.S2 is the same shape of assertion (inspect a component file's source) and should have gotten one too — this is a silent gap, not a documented exception.
[Group 6 rationale — R4/R5 deferral] — the inline comment's reasoning holds for R4.S1/R4.S2 (proven by pre-existing e2e/integration suite, not new-test-shaped) and for R5.S1 (a path update to an existing test, only meaningfully assertable once the deletion happens) — this is a legitimate distinction from "new test coverage," not a rule violation. But the same comment doesn't acknowledge or cover R1.S2's omission, since R1.S2 is unrelated to the deletion step and had no reason to be deferred.
[Task 2.4] — "Run 1.1-1.5 — confirm green" omits re-running 1.8's fail-confirmation intent for 1.6/1.7 at this point; not a bug (1.6/1.7 correctly stay deferred to 5.3 since the new files don't exist yet), but worth noting the task list never explicitly states why 1.6/1.7 are excluded from 2.4 — a reader diffing 1.1-1.7 against 2.4 could mistake the omission for an oversight rather than the intentional Group-5 deferral it actually is.
[Task 5.2] — "passing `factory`/`library`/`onUpdateLibrary` props per design Decision 1's exception" is correct per design.md, but the task never states where `library`/`onUpdateLibrary` come from for `OptimizerPanel` itself (i.e., that `OptimizerPanel` must call `useLibraryContext()` to obtain them before forwarding to `PointValuesPanel`) — implementer has to infer this from design.md rather than tasks.md stating it directly.

## Pass 2 — 2026-07-10

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass
[R1.S2 missing test task] — new task 1.8 added: fs-based structural stub checking `OptimizerRecipeFilters.tsx` calls `updatePhase(`/`toggleCategory(`/`toggleBuilding(` rather than redeclaring them, and no other `app/components/` file declares those names. Same shape and same file as 1.6/1.7 (`optimizer-panel-structure.test.ts`), correctly not deferred. Header comment now explicitly distinguishes it from the R4/R5 deferred set. Old "confirm all fail" task renumbered to 1.9 and covers 1.1-1.8.
[Group 6 rationale not covering R1.S2] — moot now that R1.S2 has its own Group 1 stub; header comment no longer needs to explain an omission that no longer exists.
[Task 2.4 unclear exclusion of 1.6-1.8] — task 2.4 now states explicitly why 1.6-1.8 stay red at this point ("they check `app/components/optimization/*` files and `OptimizerRecipeFilters.tsx`'s call sites, none of which exist until Groups 3-5"). Clear.
[Task 5.2 missing useLibraryContext() source] — task 5.2 now states `OptimizerPanel` calls `useLibraryContext()` itself to obtain `library`/`updatePartPointOverrides` before forwarding as props to `PointValuesPanel`. Matches design.md Decision 1's exception exactly.

Additionally verified: task 5.3's reasoning that 1.8 stays red until 6.3 (because `RecipeOptimizerPanel.tsx` still declares its own `updatePhase`/`toggleCategory`/`toggleBuilding` closures under those exact names until deleted) is factually correct — confirmed against the original file, which declares functions with those exact three names at the closure level. This is a real, correctly-reasoned dependency, not just plausible-sounding.

### Findings
None.
