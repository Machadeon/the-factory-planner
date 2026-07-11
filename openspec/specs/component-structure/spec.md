# component-structure

Structural invariants for `app/components/library/` — the split library drawer (formerly the single `FactoryLibraryDrawer.tsx`). Established by the `split-library-drawer` change (Phase 4a of `plans/component-refactor.md`).

## Requirements

### Requirement: R1 — one file, one purpose in the library drawer
The library drawer's rendering SHALL be split across `app/components/library/{LibraryDrawer,LibraryTree,LibraryFolderRow,LibraryFactoryRow,LibraryFactoryMenu,MoveToFolderSelect}.tsx`, one exported component per file. `app/components/FactoryLibraryDrawer.tsx` SHALL NOT exist.

#### Scenario: R1.S1 — file responsibilities
- **WHEN** the library drawer files are inspected
- **THEN** `LibraryDrawer.tsx` contains only the `Drawer`/pinned-sidebar chrome, header (title, pin/new-factory/new-folder/import icons), footer (export-all), and composes `LibraryTree`; `LibraryTree.tsx` contains only root-level sorting and renders the top-level list of `LibraryFolderRow`/`LibraryFactoryRow`; recursion into child folders/factories is owned by `LibraryFolderRow.tsx` itself (self-recursion for child folders) — `LibraryTree.tsx` is not re-entered for nested levels; `LibraryFactoryRow.tsx` renders exactly one factory row (load, rename, actions-menu trigger) and composes `MoveToFolderSelect` when moving; `LibraryFactoryMenu.tsx` contains only the factory actions `<Menu>`; `MoveToFolderSelect.tsx` contains only the inline "Move to" `<TextField select>`

#### Scenario: R1.S2 — old file removed
- **WHEN** the repository is searched for `FactoryLibraryDrawer.tsx`
- **THEN** no such file exists and no file imports it

#### Scenario: R1.S3 — transient UI state ownership
- **WHEN** the split files are inspected for state ownership
- **THEN** `expandedFolders`, `editState`, `moveMenuFactory`, `menuState`, `deleteConfirmFactory`, and `deleteConfirmFolder` are all owned by `LibraryDrawer.tsx` and passed down as props/callbacks (bundled as `rowState`/`rowActions`) to `LibraryTree`/`LibraryFolderRow`/`LibraryFactoryRow`/`LibraryFactoryMenu`; no row component introduces its own competing copy of this state

### Requirement: R2 — CRUD orchestration lives in useLibrary
Every library mutation that pairs a `storage-service` call with `saveLibrary` and a state update (rename factory, rename folder, delete factory, delete folder, duplicate factory, add folder, move factory) SHALL be exposed as a mutator on the `useLibrary` hook's return value. Each mutator SHALL perform the mutate→persist→state-update sequence internally in one call, reusing existing `storage-service` exports (`addFactory`, `updateFactory`, `removeFactory`, `addFolder`, `renameFolder`, `removeFolder`, `moveFactory`) — no new `storage-service.ts` exports. Library row/menu components SHALL call these mutators directly and SHALL NOT call `storage-service` functions themselves. Mutators operate on ids that no longer exist in the library the same way the underlying `storage-service` function does: `.map`/`.filter` over a missing id is a no-op that leaves the library unchanged and persists that unchanged library — no error is thrown.

#### Scenario: R2.S1 — mutator surface
- **WHEN** `useLibrary()`'s return value is inspected
- **THEN** it includes `renameFactory(id, name)`, `renameFolder(id, name)`, `deleteFactory(id)`, `deleteFolder(id)`, `duplicateFactory(factory)`, `addFolder(name, parentId)`, and `moveFactory(factoryId, folderId)`, each of which updates hook state and persists via `saveLibrary` in one call
- **THEN** `renameFactory(id, name)` is implemented as `updateFactory(library, { ...factory, name })` (reusing the existing `updateFactory` export)
- **THEN** `duplicateFactory(factory)` takes the source `SerializedFactory` and internally builds the copy (fresh id via `generateId()`, name suffixed `" (copy)"`, fresh `createdAt`/`updatedAt`) before calling `addFactory` — callers pass the untouched source factory only
- **THEN** `addFolder(name, parentId)` mirrors `storage-service.addFolder`'s return shape — `{ folder }` alongside the persisted state update — so callers can react with UI-only side effects (expanding the parent folder, entering rename-edit-state for the new folder) without those side effects living inside the mutator

#### Scenario: R2.S2 — no hand-rolled triples in components
- **WHEN** `app/components/library/*.tsx` are inspected
- **THEN** none of them import `saveLibrary`, `addFactory`, `updateFactory`, `removeFactory`, `addFolder`, `renameFolder`, `removeFolder`, or `moveFactory` from `app/models/storage-service`; all persistence is reached through `useLibrary` mutators

#### Scenario: R2.S3 — mutation on a missing id is a safe no-op
- **WHEN** a mutator (e.g. `deleteFactory`, `renameFolder`) is called with an id no longer present in the library
- **THEN** the library is persisted unchanged and no exception is thrown

### Requirement: R3 — selector contract frozen
Every `aria-label` and `data-testid` on interactable elements in `app/components/library/*.tsx` SHALL remain stable across future changes to this directory unless a change explicitly documents and updates Playwright selectors that depend on them.

#### Scenario: R3.S1 — e2e suite coverage
- **WHEN** `tests/e2e/library/*.spec.ts`, `tests/integration/FactoryPage.test.tsx`, and `tests/integration/contexts/library-nav-context.test.tsx` are run
- **THEN** all tests pass

#### Scenario: R3.S2 — selector audit
- **WHEN** `grep -o 'aria-label={[^}]*}\|aria-label="[^"]*"\|data-testid="[^"]*"'` is run over `app/components/library/*.tsx`
- **THEN** the resulting set of selectors matches what the current Playwright suite expects — any diff in this set requires an explicit, reviewed change to the affected `tests/e2e/library/*.spec.ts` files
