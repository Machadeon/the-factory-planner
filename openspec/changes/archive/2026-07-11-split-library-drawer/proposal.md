## Why

`FactoryLibraryDrawer.tsx` (651 lines) owns six-plus unrelated concerns — tree recursion, inline rename, move-to-folder, context menu, two delete-confirm dialogs, import/export, and pin toggle chrome — and hand-rolls a mutate→`saveLibrary`→`onLibraryChange` triple around every CRUD operation instead of going through `useLibrary`. This is Phase 4a of `plans/component-refactor.md` §4: split the library drawer into single-purpose files under `app/components/library/` and move CRUD orchestration into `useLibrary` mutators, continuing the decomposition already landed for `FactoryPage` (contexts, hooks) in prior phases.

## What Changes

- Split `FactoryLibraryDrawer.tsx` into `app/components/library/`:
  - `LibraryDrawer.tsx` — drawer/pinned chrome, header, footer only (replaces `FactoryLibraryDrawer.tsx` as the export consumed by `LibraryDrawerSlot`)
  - `LibraryTree.tsx` — root-level sort + recursion entry point
  - `LibraryFolderRow.tsx` — one folder row (rename, expand/collapse, action icons, recursion into children)
  - `LibraryFactoryRow.tsx` — one factory row (load, rename, actions-menu trigger, move-to-folder inline select)
  - `LibraryFactoryMenu.tsx` — the factory actions `<Menu>` (rename/export/duplicate/move/delete)
  - `MoveToFolderSelect.tsx` — the inline "Move to" `<TextField select>`
- Add persisting CRUD mutators to `useLibrary` (`renameFactory`, `renameFolder`, `deleteFactory`, `deleteFolder`, `duplicateFactory`, `addFolder`, `moveFactory`) that each perform the mutate→`saveLibrary`→state-update triple internally, reusing existing `storage-service.ts` exports (no new `storage-service.ts` exports). Rows call these mutators directly instead of the drawer hand-rolling `storage-service` calls plus `onLibraryChange`.
- `onLibraryChange` prop is removed from the drawer's public surface — mutation now flows through the `useLibrary` instance already passed via `libraryApi`.
- **BREAKING** (internal only, no user-facing change): `FactoryLibraryDrawer` import path changes to `library/LibraryDrawer`; `LibraryDrawerSlot.tsx` updates its import and prop wiring.
- No behavior change: aria-labels, `data-testid`s, DOM structure, and all interaction flows (rename/move/delete/duplicate/import/export/pin) stay identical. E2E suite (`tests/e2e/library/*`) and `tests/integration/FactoryPage.test.tsx` are the regression safety net.

## Capabilities

### New Capabilities
(none — this is a pure internal decomposition of existing capabilities, not a new capability)

### Modified Capabilities
- `library-ops`: unaffected — `library-ops.ts` (import remap/merge) is untouched by this change; listed here only to confirm no overlap.
- `library-button-visibility`: unaffected — pin/unpin visibility behavior is preserved verbatim; no requirement text changes.

No capability spec files require new requirements. This change is scoped to `app/components/FactoryLibraryDrawer.tsx` → `app/components/library/*` file layout and `app/hooks/useLibrary.ts` mutator surface. Because no spec-level behavior changes, the `specs/` artifact for this change will contain a single `component-structure` capability spec documenting the file-layout and mutator-ownership invariants introduced here (so review has something concrete to check the diff against), rather than modifying an existing behavioral spec.

## Impact

- **Removed**: `app/components/FactoryLibraryDrawer.tsx`
- **Added**: `app/components/library/{LibraryDrawer,LibraryTree,LibraryFolderRow,LibraryFactoryRow,LibraryFactoryMenu,MoveToFolderSelect}.tsx`
- **Modified**: `app/hooks/useLibrary.ts` (new mutators), `app/components/factory/LibraryDrawerSlot.tsx` (import + prop wiring update)
- **Tests**: `tests/unit/hooks/useLibrary.test.ts` gains mutator coverage; existing e2e/integration suites (`tests/e2e/library/*`, `tests/integration/FactoryPage.test.tsx`, `tests/integration/contexts/library-nav-context.test.tsx`) must stay green unmodified (selector contract frozen).
- **No dependency changes.**
