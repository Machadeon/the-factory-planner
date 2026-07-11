## ADDED Requirements

### Requirement: R1 — one file, one purpose in the library drawer
The library drawer's rendering SHALL be split across `app/components/library/{LibraryDrawer,LibraryTree,LibraryFolderRow,LibraryFactoryRow,LibraryFactoryMenu,MoveToFolderSelect}.tsx`, one exported component per file. `app/components/FactoryLibraryDrawer.tsx` SHALL be deleted.

#### Scenario: R1.S1 — file responsibilities
- **WHEN** the library drawer files are inspected
- **THEN** `LibraryDrawer.tsx` contains only the `Drawer`/pinned-sidebar chrome, header (title, pin/new-factory/new-folder/import icons), footer (export-all), and composes `LibraryTree`; `LibraryTree.tsx` contains only root-level sorting and renders the top-level list of `LibraryFolderRow`/`LibraryFactoryRow`; recursion into child folders/factories is owned by `LibraryFolderRow.tsx` itself (it imports and renders itself for child folders, per today's `renderFolderRow(f, depth + 1)` pattern) — `LibraryTree.tsx` is not re-entered for nested levels; `LibraryFactoryRow.tsx` renders exactly one factory row (load, rename, actions-menu trigger) and composes `MoveToFolderSelect` when moving; `LibraryFactoryMenu.tsx` contains only the factory actions `<Menu>`; `MoveToFolderSelect.tsx` contains only the inline "Move to" `<TextField select>`

#### Scenario: R1.S2 — old file removed
- **WHEN** the repository is searched for `FactoryLibraryDrawer.tsx`
- **THEN** no such file exists and no file imports it

#### Scenario: R1.S3 — transient UI state ownership
- **WHEN** the split files are inspected for state ownership
- **THEN** `expandedFolders`, `editState`, `moveMenuFactory`, `menuState`, `deleteConfirmFactory`, and `deleteConfirmFolder` are all owned by `LibraryDrawer.tsx` (lifted, exactly as they were single `useState` calls in the original `FactoryLibraryDrawer.tsx`) and passed down as props/callbacks to `LibraryTree`/`LibraryFolderRow`/`LibraryFactoryRow`/`LibraryFactoryMenu`; no row component introduces its own competing copy of this state

### Requirement: R2 — CRUD orchestration lives in useLibrary
Every library mutation that today pairs a `storage-service` call with `saveLibrary` and a state update (rename factory, rename folder, delete factory, delete folder, duplicate factory, add folder, move factory) SHALL be exposed as a mutator on the `useLibrary` hook's return value. Each mutator SHALL perform the mutate→persist→state-update sequence internally in one call, reusing existing `storage-service` exports (`addFactory`, `updateFactory`, `removeFactory`, `addFolder`, `renameFolder`, `removeFolder`, `moveFactory`) — no new `storage-service.ts` exports are introduced by this change. Library row/menu components SHALL call these mutators directly and SHALL NOT call `storage-service` functions or `onLibraryChange`-style callbacks themselves. Mutators operate on ids that no longer exist in the library (e.g. a stale menu reference after concurrent deletion) the same way the underlying `storage-service` function does today: `.map`/`.filter` over a missing id is a no-op that leaves the library unchanged and persists that unchanged library — no error is thrown.

#### Scenario: R2.S1 — mutator surface
- **WHEN** `useLibrary()`'s return value is inspected
- **THEN** it includes `renameFactory(id, name)`, `renameFolder(id, name)`, `deleteFactory(id)`, `deleteFolder(id)`, `duplicateFactory(factory)`, `addFolder(name, parentId)`, and `moveFactory(factoryId, folderId)`, each of which updates hook state and persists via `saveLibrary` in one call
- **THEN** `renameFactory(id, name)` is implemented as `updateFactory(library, { ...factory, name })` (reusing the existing `updateFactory` export — today's drawer inlines this map itself; no new `storage-service` export is added)
- **THEN** `duplicateFactory(factory)` takes the source `SerializedFactory` and internally builds the copy (fresh id via `generateId()`, name suffixed `" (copy)"`, fresh `createdAt`/`updatedAt`) before calling `addFactory` — this id/name/timestamp construction moves from the drawer's `handleDuplicateFactory` into the mutator; callers pass the untouched source factory only
- **THEN** `addFolder(name, parentId)` mirrors `storage-service.addFolder`'s return shape — `{ folder }` alongside the persisted state update — so callers can react with UI-only side effects (expanding the parent folder, entering rename-edit-state for the new folder) without those side effects living inside the mutator

#### Scenario: R2.S2 — no hand-rolled triples in components
- **WHEN** `app/components/library/*.tsx` are inspected
- **THEN** none of them import `saveLibrary`, `addFactory`, `updateFactory`, `removeFactory`, `addFolder`, `renameFolder`, `removeFolder`, or `moveFactory` from `app/models/storage-service`; all persistence is reached through `useLibrary` mutators

#### Scenario: R2.S3 — mutation on a missing id is a safe no-op
- **WHEN** a mutator (e.g. `deleteFactory`, `renameFolder`) is called with an id no longer present in the library
- **THEN** the library is persisted unchanged and no exception is thrown

### Requirement: R3 — no behavior change
The split SHALL NOT change any observable behavior: every `aria-label` and `data-testid` present before the split SHALL remain present with identical values, on the same element roles, in the same components' rendered output; every interaction flow (load factory, rename factory/folder via Enter/Escape/blur, delete factory/folder with confirm dialog, duplicate factory, move factory to folder, add folder, add factory in folder, export one/export all, import via file picker, pin/unpin) SHALL produce the same resulting state and same rendered output as before the split. Because all transient UI state is lifted to `LibraryDrawer.tsx` per R1.S3 (unchanged from today's single-component state model), interrupted/overlapping interactions (e.g. a rename active when another row's actions menu opens) are out of scope for this change: today's behavior in these cases is whatever falls out of the existing single `useState` calls, and the split preserves that behavior unchanged simply because the same state, at the same granularity, still lives in one component.

#### Scenario: R3.S1 — e2e suite passes unmodified
- **WHEN** `tests/e2e/library/*.spec.ts`, `tests/integration/FactoryPage.test.tsx`, and `tests/integration/contexts/library-nav-context.test.tsx` are run against the split components without modification to the test files
- **THEN** all tests pass

#### Scenario: R3.S2 — selector contract frozen
- **WHEN** `grep -o 'aria-label={[^}]*}\|aria-label="[^"]*"\|data-testid="[^"]*"'` is run over `app/components/FactoryLibraryDrawer.tsx` before the split and over `app/components/library/*.tsx` after the split
- **THEN** the two sets of literal aria-label/data-testid strings (and any that are template-interpolated, e.g. `` `Rename ${x}` ``, compared by their static template) are identical
