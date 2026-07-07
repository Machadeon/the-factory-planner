# library-ops

Pure import-merge logic extracted from FactoryComponent to `app/models/library-ops.ts`. Transitional home — model M5 later folds it into the storage/migrations area; the functions and their unit tests carry over unchanged.

## ADDED Requirements

### Requirement: R1 — pure module
`app/models/library-ops.ts` SHALL contain pure functions only: no React imports, no storage-service calls, no DOM/alert access. Callers (hooks/FactoryPage) own persistence and UI side effects.

#### Scenario: R1.S1 — purity
- **WHEN** the module's imports are inspected
- **THEN** it imports only model/storage types and helpers (`migrateLibrary`, `generateId`, types) — no React, no `storage-service`

### Requirement: R2 — remapImportedLibrary preserves cross-references
`remapImportedLibrary(data)` SHALL migrate the incoming library (`migrateLibrary`, hoisting legacy embedded factories), assign fresh ids to every folder and factory, and rewrite every cross-reference through the id map. Per-field semantics for references whose target is absent from the id map (today's exact behavior): folder `parentId` → `null`; factory `folderId` → `null`; `supplierIds` entries → original id passes through unchanged; assembly-line `nestedFactoryId` → original id passes through unchanged. All imported factories SHALL get fresh `createdAt`/`updatedAt` timestamps. It SHALL return `{ folders, factories, idMap }`.

#### Scenario: R2.S1 — id remap with nested references
- **WHEN** a library with a folder, a factory in that folder, a supplier reference, and a nested factory reference is remapped
- **THEN** all entities receive new ids and every reference points at the corresponding new id

#### Scenario: R2.S2 — legacy embedded factories hoisted
- **WHEN** a schema ≤ 3 payload with embedded nested factories is remapped
- **THEN** embedded copies become independent remapped entries (migration ran before remapping)

#### Scenario: R2.S3 — dangling reference tolerated
- **WHEN** a factory references a supplier id absent from the import
- **THEN** the reference survives unchanged and no exception is thrown

### Requirement: R3 — single-factory import merge
A pure merge function SHALL wrap a single serialized factory into a one-factory library, remap it via R2, and return the merged library (existing folders/factories + imported ones, `CURRENT_SCHEMA_VERSION`) plus the remapped root entry. If the root cannot be resolved after remapping, the function SHALL return no root, and the caller SHALL treat the import as failed: nothing is persisted and nothing is loaded (today's early-return behavior).

#### Scenario: R3.S1 — single factory merged and root returned
- **WHEN** a single-factory JSON (with embedded nested factories) is merged into an existing library
- **THEN** the result contains the original entries plus remapped imports, and the returned root id is the remap of the imported factory's id

### Requirement: R4 — library import merge
A pure merge function for full-library imports SHALL remap via R2, merge into the current library, and resolve the optional bundle root: when the payload carries `rootId`, the returned root is the remapped entry for it; otherwise no root (caller opens the drawer instead).

#### Scenario: R4.S1 — bundle root resolved
- **WHEN** an exported bundle with `rootId` is merged
- **THEN** the returned root is the remapped factory corresponding to `rootId`

#### Scenario: R4.S2 — no rootId
- **WHEN** a plain library without `rootId` is merged
- **THEN** the merge result has no root factory

### Requirement: R5 — import wiring behavior preserved
FactoryPage wiring SHALL preserve today's behavior: JSON with a `factories` key imports as a library (requires consent — without it, `requireConsent("openLibrary")` is invoked and nothing merges); JSON with `productionLines` imports as a single factory (merged library persisted only when consent exists; the imported factory loads either way); unrecognized JSON and parse failures surface the existing alerts.

#### Scenario: R5.S1 — single-factory import without consent
- **WHEN** a single-factory file is imported without consent
- **THEN** the factory loads into the session but the merged library is not saved by the import step (loadSerialized's own writes — current-id persist, slug backfill — still occur per factory-session R5, preserving today's behavior)

#### Scenario: R5.S3 — library import without consent
- **WHEN** a file with a `factories` key is imported without consent
- **THEN** nothing merges and `requireConsent("openLibrary")` is invoked (consent dialog path)

#### Scenario: R5.S2 — bundle import loads root
- **WHEN** a bundle export is imported with consent
- **THEN** the merged library is saved and the bundle's root factory is loaded without opening the drawer
