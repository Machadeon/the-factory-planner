# lib-utilities — delta

## ADDED Requirements

### Requirement: R7 — sanitizeFilename single home
`app/lib/filenames.ts` SHALL export `sanitizeFilename(name)` implementing the existing `name.replace(/[^a-z0-9]/gi, "_")` logic. The export-current-factory path (formerly in FactoryComponent) SHALL use it. (FactoryLibraryDrawer's duplicate copy migrates in Phase 4a, not this change.)

#### Scenario: R7.S1 — sanitization
- **WHEN** `sanitizeFilename("Iron Plant #2!")` is called
- **THEN** it returns `"Iron_Plant__2_"` (every non-alphanumeric character becomes `_`)

#### Scenario: R7.S2 — export uses it
- **WHEN** the current factory is exported
- **THEN** the download filename is `sanitizeFilename(factoryName) + ".json"` with no inline regex at the call site
