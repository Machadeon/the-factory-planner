## 1. Test Stubs

<!-- useLibrary mutator surface — spec component-structure R2.S1/R2.S3 -->
- [x] 1.1 Write unit test stub (`tests/unit/hooks/useLibrary.test.ts`): `renameFactory(id, name)` updates the factory's name in hook state and persists to `sfp:library` — R2.S1
- [x] 1.2 Write unit test stub: `renameFolder(id, name)` updates the folder's name in hook state and persists — R2.S1
- [x] 1.3 Write unit test stub: `deleteFactory(id)` removes the factory from hook state and persists — R2.S1
- [x] 1.4 Write unit test stub: `deleteFolder(id)` removes the folder (and its contents, per existing `storage-service.removeFolder` cascade) from hook state and persists — R2.S1
- [x] 1.5 Write unit test stub: `duplicateFactory(factory)` adds a copy with a fresh id, `" (copy)"`-suffixed name, and fresh `createdAt`/`updatedAt` to hook state and persists — R2.S1, D4
- [x] 1.6 Write unit test stub: `addFolder(name, parentId)` adds the folder to hook state, persists, and returns `{ folder }` with the created folder — R2.S1, D5
- [x] 1.7 Write unit test stub: `moveFactory(factoryId, folderId)` updates the factory's `folderId` in hook state and persists — R2.S1
- [x] 1.8 Write unit test stub: calling `deleteFactory` (or `renameFolder`) with an id absent from the library persists the library unchanged and throws no exception — R2.S3

<!-- File-layout/state-ownership/import-hygiene — R1.S1, R1.S3, R2.S2 are structural checks (file contents, not runtime behavior), verified via a static grep-based check rather than a vitest/playwright test. Stubbed here as failing checks (grep currently finds no `library/` files or violates the pattern) so they follow the same "write the check, watch it fail, then make it pass" flow as the runtime stubs above. -->
- [x] 1.9 Write verification-script stub: `grep -rln "saveLibrary\|addFactory\|updateFactory\|removeFactory\|addFolder\|renameFolder\|removeFolder\|moveFactory" app/components/library/` returns no matches (confirms R2.S2 — no component imports `storage-service` mutators directly, only `useLibrary`) — expected to fail today since `app/components/library/` doesn't exist yet
- [x] 1.10 Write verification-script stub: `ls app/components/library/` lists exactly `LibraryDrawer.tsx LibraryTree.tsx LibraryFolderRow.tsx LibraryFactoryRow.tsx LibraryFactoryMenu.tsx MoveToFolderSelect.tsx` (confirms R1.S1's file *set*) — expected to fail today since the directory doesn't exist yet. This check alone doesn't verify per-file content boundaries (e.g. that `LibraryTree.tsx` contains no recursion logic) — that's a manual review checklist, not a grep: see task 9.7.
- [x] 1.11 Write verification-script stub: `grep -n "useState" app/components/library/*.tsx` shows the 6 `rowState` `useState` calls (`expandedFolders`, `editState`, `moveMenuFactory`, `menuState`, `deleteConfirmFactory`, `deleteConfirmFolder`) only in `LibraryDrawer.tsx`, none in `LibraryTree.tsx`/`LibraryFolderRow.tsx`/`LibraryFactoryRow.tsx`/`LibraryFactoryMenu.tsx` (confirms R1.S3 — state ownership) — expected to fail today since the files don't exist yet

Note on `rowActions`' 4 non-setter members (`toggleFolder`, `commitRename`, `closeMenu`, `handleAddFolder`): these are UI interaction behaviors (folder expand/collapse, rename commit, menu close, add-folder flow), not persistence logic — they're exercised end-to-end by the existing `tests/e2e/library/*.spec.ts` and `tests/integration/FactoryPage.test.tsx` suites, which R3.S1 (task 9.2) requires to keep passing unmodified. No new unit stubs are added for them per AGENTS.md's test-type guidance (component/interaction behavior → integration/E2E, not unit).

## 2. Add CRUD mutators to useLibrary

- [x] 2.1 Capture baseline: run `npm run test:run` and `npm run test:e2e` on current `main`, confirm all green before making any change (freezes the pre-split contract per design.md's testing strategy)
- [x] 2.2 Add `renameFactory(id, name)` to `app/hooks/useLibrary.ts`, implemented via `updateFactory(library, { ...factory, name })` (D3) — no new `storage-service` export
- [x] 2.3 Add `renameFolder(id, name)`, `deleteFactory(id)`, `deleteFolder(id)`, `moveFactory(factoryId, folderId)` to `useLibrary.ts`, each wrapping the existing `storage-service` function of the same name (D3)
- [x] 2.4 Add `duplicateFactory(factory)` to `useLibrary.ts`: builds the copy (`generateId()`, `" (copy)"` suffix, fresh timestamps) internally, then calls `addFactory` (D4)
- [x] 2.5 Add `addFolder(name, parentId)` to `useLibrary.ts`, wrapping `storage-service.addFolder` and returning `{ folder }` (D5)
- [x] 2.6 Wrap every mutator added in 2.2–2.5 in `useCallback`, matching `useLibrary.ts`'s existing `replaceLibrary`/`updatePartPointOverrides` pattern (D3)
- [x] 2.7 Run stubs from Group 1, confirm all pass against the new mutators

## 3. Extract MoveToFolderSelect

- [x] 3.1 Create `app/components/library/MoveToFolderSelect.tsx` per design.md's prop contract (`factory`, `folders` read via `useLibraryContext()`, `libraryApi: Pick<..., "moveFactory">`, `onMoved`) — moves the `<TextField select>` block verbatim from `FactoryLibraryDrawer.tsx`'s `renderFactoryRow`
- [x] 3.2 Confirm the app still builds with `FactoryLibraryDrawer.tsx` unchanged (new file not yet wired in)

## 4. Extract LibraryFactoryMenu

- [x] 4.1 Create `app/components/library/LibraryFactoryMenu.tsx` per design.md's prop contract (`menuState`, `onClose`, `onRename`, `onMove`, `deleteConfirmFactory`/`onDeleteConfirmFactoryChange`, `libraryApi: Pick<..., "duplicateFactory" | "deleteFactory">`) — moves the `<Menu>` block and the `deleteConfirmFactory` `ConfirmDialog` from `FactoryLibraryDrawer.tsx`
- [x] 4.2 Wrap `LibraryFactoryMenu` in `React.memo` (D5a)
- [x] 4.3 Confirm the app still builds with `FactoryLibraryDrawer.tsx` unchanged

## 5. Extract LibraryFactoryRow

- [x] 5.1 Create `app/components/library/LibraryFactoryRow.tsx` per design.md's D1a/D1b prop contract (`factory`, `depth`, `rowState`, `rowActions`, composes `MoveToFolderSelect` when `rowState.moveMenuFactory === factory.id`) — moves `renderFactoryRow`'s body from `FactoryLibraryDrawer.tsx`; reads `currentFactoryId` via `useLibraryContext()` (D1)
- [x] 5.2 Wrap `LibraryFactoryRow` in `React.memo` (D5a)
- [x] 5.3 Confirm the app still builds with `FactoryLibraryDrawer.tsx` unchanged

## 6. Extract LibraryFolderRow

- [x] 6.1 Create `app/components/library/LibraryFolderRow.tsx` per design.md's D1a/D1b prop contract (`folder`, `depth`, `rowState`, `rowActions`; self-recurses for `childFolders`, renders `LibraryFactoryRow` for `childFactories` — D2) — moves `renderFolderRow`'s body from `FactoryLibraryDrawer.tsx`; reads `library` via `useLibraryContext()` for child lookups (D1)
- [x] 6.2 Wrap `LibraryFolderRow` in `React.memo` (D5a)
- [x] 6.3 Confirm the app still builds with `FactoryLibraryDrawer.tsx` unchanged

## 7. Extract LibraryTree and LibraryDrawer

- [x] 7.1 Create `app/components/library/LibraryTree.tsx`: renders sorted root-level `LibraryFolderRow`/`LibraryFactoryRow`, reads `library` via `useLibraryContext()` for `rootFactories`/`rootFolders` (D1, D2)
- [x] 7.2 Create `app/components/library/LibraryDrawer.tsx`: owns `rowState`'s six `useState` calls, `handleAddFolder`, `handleExportAll`, `deleteConfirmFolder` `ConfirmDialog`; reads `library` via `useLibraryContext()` for the empty-state check; builds `rowState`/`rowActions` with `useMemo`/`useCallback`; renders `Drawer`/pinned chrome, header, `LibraryTree`, footer, `LibraryFactoryMenu` — moves the remaining top-level structure from `FactoryLibraryDrawer.tsx`
- [x] 7.3 Cross-check `rowState`/`rowActions` against design.md's D1b table row by row: confirm all 9 `rowActions` members are present (`toggleFolder`, `commitRename`, `closeMenu`, `handleAddFolder`, `setEditState`, `setMoveMenuFactory`, `setMenuState`, `setDeleteConfirmFactory`, `setDeleteConfirmFolder`), no extras, and each non-setter member's `useCallback` deps array matches the table exactly (`toggleFolder`: `[]`; `commitRename`: `[editState, libraryApi.renameFactory, libraryApi.renameFolder]`; `closeMenu`: `[]`; `handleAddFolder`: `[libraryApi.addFolder]`)
- [x] 7.4 Confirm the app still builds with `FactoryLibraryDrawer.tsx` unchanged

## 8. Swap the live export and delete the old file

- [x] 8.1 Update `app/components/factory/LibraryDrawerSlot.tsx`: import `LibraryDrawer` from `../library/LibraryDrawer` instead of `FactoryLibraryDrawer`; drop `library`/`currentFactoryId` from the props it passes (now read via context inside `LibraryDrawer`, per D1) — keep `pinned`, `libraryApi`, `flows`, `onPinChange`
- [x] 8.2 Delete `app/components/FactoryLibraryDrawer.tsx`
- [x] 8.3 Verify no remaining imports of `FactoryLibraryDrawer` anywhere in the repo (`grep -rn "FactoryLibraryDrawer" app/ tests/`) — R1.S2

## 9. Verification

- [x] 9.1 All unit/integration tests pass (`npm run test:run`)
- [x] 9.2 All E2E tests pass (`npm run test:e2e`), including `tests/e2e/library/*.spec.ts` unmodified — R3.S1
- [x] 9.3 `npm run build` succeeds
- [x] 9.4 Selector contract check (R3.S2): compare `grep -o 'aria-label={[^}]*}\|aria-label="[^"]*"\|data-testid="[^"]*"'` output between the pre-split `FactoryLibraryDrawer.tsx` (via `git show`) and the post-split `app/components/library/*.tsx` — sets match
- [x] 9.5 `npm run lint-fix` clean
- [x] 9.6 Lighthouse audit — skipped: no visual/DOM-output change (R3), pure internal file/state reorganization
- [x] 9.7 Manual content-boundary review against R1.S1: confirm `LibraryDrawer.tsx` contains only chrome/header/footer (no per-row rendering logic), `LibraryTree.tsx` contains only root-level sort + one non-recursive render pass (no self-recursion, no folder-child lookup logic), `LibraryFolderRow.tsx` is the only file that self-recurses for child folders, `LibraryFactoryRow.tsx` renders exactly one factory row (load/rename/actions-trigger) and only *composes* `MoveToFolderSelect` (doesn't inline its `<TextField select>` JSX) and only *triggers* `LibraryFactoryMenu` (doesn't inline the `<Menu>`/`ConfirmDialog` JSX), `LibraryFactoryMenu.tsx` contains only the `<Menu>` + its `ConfirmDialog` (no row-rendering), `MoveToFolderSelect.tsx` contains only the `<TextField select>` block
