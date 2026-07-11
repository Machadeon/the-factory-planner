## Pass 1 — 2026-07-10

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass


### Findings
[R1.S1] — Doesn't specify which file owns transient UI state (`moveMenuFactory`/`isMoving`, `editState`, `expandedFolders`, `menuState`, delete-confirm state) after the split; "one purpose per file" isn't verifiable without knowing whether this state is lifted to `LibraryTree`/`LibraryDrawer` and prop-drilled, or owned locally per row, or lives in context.
[R1.S1] — "`LibraryFolderRow.tsx` renders exactly one folder row... and recurses into child rows" contradicts "`LibraryTree.tsx` contains only root-level sort and the recursion entry point" — unclear whether recursion logic lives in `LibraryFolderRow` (self-import) or is delegated back through `LibraryTree`; as written the two requirements can be read as assigning "the recursion" to two different files.
[R2.S1] — Mutator signatures (e.g. `deleteFolder(id)`, `renameFactory(id, name)`) don't state return value or behavior when the target id no longer exists (already deleted / stale menu reference) — not testable as a black-box contract without this.
[R2.S1] — `addFolder(name, parentId)` is specified as a pure persist-and-update mutator, but the current `handleAddFolder` also expands the parent folder and immediately opens rename-edit-state as side effects. Spec doesn't say whether those UI side effects move into the mutator (breaking the "useLibrary only persists" framing) or stay component-side (leaving `addFolder`'s contract silent on a caller obligation).
[R2.S1 / R2.S2] — No mapping is given from `duplicateFactory(factory)` to the existing `addFactory` triple: does the new mutator take a pre-built `SerializedFactory` copy (id/name-suffix/timestamps already computed by the caller, meaning `LibraryFactoryRow`/menu still does copy-construction logic that arguably isn't "just calling a mutator"), or does `duplicateFactory` itself own id generation and the `" (copy)"` suffix? Ambiguous which side owns that logic, so R2.S2's "components don't touch persistence logic" isn't fully verifiable for this case.
[R3] — No scenario covers state during an in-progress interaction that gets interrupted (e.g., inline rename active when the overlay drawer is closed/unmounted, or a delete-confirm dialog open when another row's menu is triggered). Not clear whether preserving this (undefined-today) behavior is in scope or excluded.
[R3.S2] — "pre-split and post-split DOM ... are compared for aria-labels and data-testids" names no comparison mechanism (manual audit, snapshot test, script) and no artifact to check the diff against — as written this scenario isn't executable/testable, only aspirational.
[Proposal Impact / R2.S1] — Proposal's Impact section scopes "Modified" files to `useLibrary.ts` and `LibraryDrawerSlot.tsx` only, but `storage-service.ts` has no `renameFactory` export today (confirmed: current rename-factory logic is inlined via `library.factories.map(...)` in the drawer, not a `storage-service` call). Requirement R2.S1 requires a `renameFactory` mutator on `useLibrary`, which — per the change's own stated pattern of thin mutators calling storage-service — implies a new `storage-service.ts` export not listed in Impact, exceeding the proposal's declared file-scope.

## Pass 2 — 2026-07-10

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass
[R1.S1 — state ownership] — New Scenario R1.S3 explicitly enumerates all six transient state vars (`expandedFolders`, `editState`, `moveMenuFactory`, `menuState`, `deleteConfirmFactory`, `deleteConfirmFolder`) and assigns them to `LibraryDrawer.tsx`, passed down as props/callbacks; row components may not hold competing copies. Verifiable now.
[R1.S1 — recursion contradiction] — R1.S1 rewritten: `LibraryTree.tsx` renders only the top-level list; `LibraryFolderRow.tsx` self-recurses for nested folders, matching today's `renderFolderRow(f, depth + 1)` pattern. `LibraryTree` is explicitly "not re-entered for nested levels." Contradiction removed.
[R2.S1 — missing-id behavior] — R2 requirement text now states missing-id mutations are no-ops that persist the unchanged library without throwing, mirroring underlying `storage-service` behavior; new Scenario R2.S3 makes this a standalone testable scenario. Spot-checked against `storage-service.removeFolder` (missing id → empty `deletedFolderIds` match → filters are no-ops) — claim holds.
[R2.S1 — addFolder side effects] — New bullet: `addFolder(name, parentId)` returns `{ folder }` (mirroring `storage-service.addFolder`'s existing return shape) so callers can react with UI-only side effects (expand parent, enter edit-state) outside the mutator. Verified against actual `storage-service.addFolder` signature — accurate, ambiguity resolved.
[R2.S1/R2.S2 — duplicateFactory ownership] — New bullet explicitly assigns id generation, `" (copy)"` suffix, and fresh timestamps to the mutator itself; callers pass only the untouched source factory. Resolves which side owns copy-construction logic.
[R3 — interrupted interactions] — R3 requirement text now explicitly scopes this out with reasoning: since all transient state stays lifted in one component (`LibraryDrawer.tsx`, per R1.S3) at the same granularity as before, interrupted/overlapping-interaction behavior is unchanged by construction and explicitly declared out of scope for this change.
[R3.S2 — untestable DOM comparison] — Rewritten with a concrete `grep -o` command over literal aria-label/data-testid strings, run pre- and post-split, with template-interpolated labels compared by static template. Ran the grep against the current `FactoryLibraryDrawer.tsx` to confirm it produces a well-formed, non-empty match set (12 aria-labels extracted cleanly, including the ternary `pinned ? ... : ...` case). Executable as written.
[Proposal Impact / R2.S1 — scope creep] — Proposal's "What Changes" and R2's requirement text now explicitly state mutators reuse existing `storage-service.ts` exports with "no new `storage-service.ts` exports introduced by this change," and R2.S1 spells out `renameFactory` as `updateFactory(library, { ...factory, name })` using the existing `updateFactory` export. Impact section's omission of `storage-service.ts` from "Modified" is now accurate.

### Findings
None.
