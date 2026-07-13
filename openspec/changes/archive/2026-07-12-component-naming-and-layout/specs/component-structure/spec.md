## MODIFIED Requirements

### Requirement: R1 — one file, one purpose, repo-wide directory placement
Every file under `app/components/` SHALL live inside one of its feature directories — `ui/`, `factory/`, `planning/`, `optimization/`, `overview/`, `library/`, `logistics/` — per the mapping table in Scenario R1.S4. No component `.tsx` file SHALL sit flat at the `app/components/` root, except `ThemeRegistry.tsx` (app-wide provider, intentionally not feature-scoped). Within the library drawer specifically, rendering SHALL be split across `app/components/library/{LibraryDrawer,LibraryTree,LibraryFolderRow,LibraryFactoryRow,LibraryFactoryMenu,MoveToFolderSelect}.tsx`, one exported component per file. `app/components/FactoryLibraryDrawer.tsx` SHALL NOT exist.

#### Scenario: R1.S1 — library file responsibilities
- **WHEN** the library drawer files are inspected
- **THEN** `LibraryDrawer.tsx` contains only the `Drawer`/pinned-sidebar chrome, header (title, pin/new-factory/new-folder/import icons), footer (export-all), and composes `LibraryTree`; `LibraryTree.tsx` contains only root-level sorting and renders the top-level list of `LibraryFolderRow`/`LibraryFactoryRow`; recursion into child folders/factories is owned by `LibraryFolderRow.tsx` itself (self-recursion for child folders) — `LibraryTree.tsx` is not re-entered for nested levels; `LibraryFactoryRow.tsx` renders exactly one factory row (load, rename, actions-menu trigger) and composes `MoveToFolderSelect` when moving; `LibraryFactoryMenu.tsx` contains only the factory actions `<Menu>`; `MoveToFolderSelect.tsx` contains only the inline "Move to" `<TextField select>`

#### Scenario: R1.S2 — old file removed
- **WHEN** the repository is searched for `FactoryLibraryDrawer.tsx`
- **THEN** no such file exists and no file imports it

#### Scenario: R1.S3 — transient UI state ownership
- **WHEN** the split files are inspected for state ownership
- **THEN** `expandedFolders`, `editState`, `moveMenuFactory`, `menuState`, `deleteConfirmFactory`, and `deleteConfirmFolder` are all owned by `LibraryDrawer.tsx` and passed down as props/callbacks (bundled as `rowState`/`rowActions`) to `LibraryTree`/`LibraryFolderRow`/`LibraryFactoryRow`/`LibraryFactoryMenu`; no row component introduces its own competing copy of this state

#### Scenario: R1.S4 — no flat files at the components root; full move mapping
- **WHEN** `app/components/` is listed non-recursively after this change
- **THEN** every entry is either a feature directory (`ui/`, `factory/`, `planning/`, `optimization/`, `overview/`, `library/`, `logistics/`) or `ThemeRegistry.tsx` — no other `.tsx`/`.ts` file exists at that level — and the 22 files flat at proposal time moved exactly as follows:

| From (flat) | To |
|---|---|
| `AssemblyLineComponent.tsx` | `planning/AssemblyLine.tsx` |
| `AssemblyLineControls.tsx` | `planning/AssemblyLineControls.tsx` |
| `ClockDisplay.tsx` | `planning/ClockDisplay.tsx` |
| `ConstraintsPanel.tsx` | `optimization/ConstraintsPanel.tsx` |
| `Dividers.tsx` | `ui/Dividers.tsx` |
| `FactoryHeader.tsx` | `factory/FactoryHeader.tsx` |
| `FactoryIconPicker.tsx` | `factory/FactoryIconPicker.tsx` |
| `FactoryPickerDialog.tsx` | `planning/FactoryPickerDialog.tsx` |
| `LogisticsSection.tsx` | `logistics/LogisticsSection.tsx` |
| `MachineCountDisplay.tsx` | `planning/MachineCountDisplay.tsx` |
| `NestedFactoryRow.tsx` | `planning/NestedFactoryRow.tsx` |
| `OptimizationSection.tsx` | `optimization/OptimizationSection.tsx` |
| `PartSelector.tsx` | `ui/PartSelector.tsx` |
| `PlanningSection.tsx` | `planning/PlanningSection.tsx` |
| `ProductionLineComponent.tsx` | `planning/ProductionLine.tsx` |
| `ProductionTargetsBar.tsx` | `optimization/ProductionTargetsBar.tsx` |
| `RecipeComponent.tsx` | `planning/Recipe.tsx` |
| `RecipeOverrideRow.tsx` | `optimization/RecipeOverrideRow.tsx` |
| `RecipeRejectDialog.tsx` | `planning/RecipeRejectDialog.tsx` |
| `StorageConsentDialog.tsx` | `factory/StorageConsentDialog.tsx` |
| `SuggestedActions.tsx` | `planning/SuggestedActions.tsx` |
| `TextCalculatorField.tsx` | `ui/TextCalculatorField.tsx` |

`ProductionLineComponent.tsx`, `RecipeComponent.tsx`, and `AssemblyLineComponent.tsx` move verbatim (mechanical rename + relocate) — they are not further decomposed by this change even though `planning/` already contains split children (`ProductionLineRow.tsx`, `ProductionLineDetails.tsx`) created by the earlier `split-production-line` change; that additional decomposition is out of scope here.

## ADDED Requirements

### Requirement: R4 — no `Component` suffix
No file under `app/components/**` SHALL have a filename ending in `Component.tsx`/`Component.ts`, and no exported component SHALL carry a `Component` suffix in its name. Renames preserve git history (`git mv`) and update every import site, every non-import textual reference to the old name in source comments, and every test that asserts against the old filename as a literal string (not just `import`-statement references).

#### Scenario: R4.S1 — suffix sweep
- **WHEN** `app/components/` is searched for filenames matching `*Component.tsx`
- **THEN** no matches are found

#### Scenario: R4.S2 — stale comment updated
- **WHEN** `app/models/factory.ts` is inspected around its solver hot-path comment (previously line 305, "per AssemblyLineComponent render")
- **THEN** it references the current file/component name (`AssemblyLine.tsx`), not the removed `AssemblyLineComponent` name

#### Scenario: R4.S3 — path-asserting tests updated
- **WHEN** `tests/unit/production-line-structure.test.ts` and `tests/unit/contexts/prop-contract.test.ts` are inspected
- **THEN** neither contains the literal strings `"app/components/ProductionLineComponent.tsx"` or `"app/components/AssemblyLineComponent.tsx"` (or `"AssemblyLineComponent.tsx"`); both reference the new `planning/ProductionLine.tsx` / `planning/AssemblyLine.tsx` paths, and both test suites pass
- **THEN** `tests/integration/AssemblyLineComponent.test.tsx` is renamed to match the new source filename (`AssemblyLine.test.tsx`)

### Requirement: R5 — hook-only files live in `app/hooks/`
A file that exports only a custom hook (a `use*`-named function with no default-exported JSX component) SHALL live under `app/hooks/`, not under `app/components/**`.

#### Scenario: R5.S1 — useFactoryPageFlows relocated
- **WHEN** the repository is searched for `useFactoryPageFlows.ts`
- **THEN** it is found at `app/hooks/useFactoryPageFlows.ts` and not under `app/components/`, and every importer resolves the new path

### Requirement: R6 — dead-code sweep clears knip; severity flips to error
Every export/type flagged by `npm run knip` as unused at this change's start SHALL be deleted, unless it is spec-pinned as guaranteed public API elsewhere (e.g. `game-data` R2's `partLookup`/`buildingLookup`). Spec-pinned exports SHALL be kept and marked with a `/** @public ... */` JSDoc tag at the declaration site (knip's built-in convention for suppressing an unused-export finding without disabling the rule), with the comment naming which requirement pins it; no export is left both flagged and unexplained. `knip.json`'s `exports` and `types` rules SHALL flip from `warn` to `error`, closing the handoff left by the `block-b0` change's B0.4 item. `knip.json`'s `files`/`dependencies` rules remain `error` (already configured, unchanged by this requirement).

#### Scenario: R6.S1 — knip exits clean under error severity
- **WHEN** `npm run knip` runs after this change, with `exports`/`types` set to `error` in `knip.json`
- **THEN** it exits 0 (no unused-export/unused-type findings)
