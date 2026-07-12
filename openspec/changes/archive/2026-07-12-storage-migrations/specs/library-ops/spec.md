## MODIFIED Requirements

### Requirement: R1 — pure module
`app/models/migrations.ts` SHALL contain the import-merge functions as pure functions only: no React imports, no `storage-service` calls, no DOM/alert access. Callers (hooks/FactoryPage) own persistence and UI side effects. (Relocated from `app/models/library-ops.ts`, which no longer exists — see the `storage-migrations` capability's own R6, distinct from this file's requirement numbering.)

#### Scenario: R1.S1 — purity
- **WHEN** `app/models/migrations.ts`'s imports are inspected
- **THEN** it imports only model/storage types and helpers (`generateId`, types) — no React, no `storage-service`

### Requirement: R2 — remapImportedLibrary preserves cross-references
`remapImportedLibrary(data)` SHALL run the incoming library through `migrateLibrary` (structural defaults only — `schemaVersion: 1`/`folders`/`factories` guarantees per `storage-migrations` R4/R5; `migrateLibrary` no longer hoists schema-≤3 embedded (`nestedFactoryData`) factories into independent entries — that repair is retired for this pre-alpha project), assign fresh ids to every folder and factory, and rewrite every cross-reference through the id map. This id-remap step is distinct from — and runs before — any later `deserializeFactory` call on the remapped output; it does not itself resolve or recurse into nested factories (that's `storage-migrations` R1/R2/R3's concern at load time).

Per-field semantics for references whose target is absent from the id map (today's exact behavior): folder `parentId` → `null`; factory `folderId` → `null`; `supplierIds` entries → original id passes through unchanged; assembly-line `nestedFactoryId` → original id passes through unchanged. All imported factories SHALL get fresh `createdAt`/`updatedAt` timestamps. It SHALL return `{ folders, factories, idMap }`.

Legacy embedded-`nestedFactoryData` payloads (schema ≤ 3) are no longer hoisted into independent entries by this step (see Reason below); an assembly line carrying only `nestedFactoryData` with no `nestedFactoryId` passes through the remap untouched and is later skipped with a warning when `deserializeFactory` loads it, per `storage-migrations` R4.S2.

**Reason for the behavior change**: `migrateLibrary`'s legacy-hoisting fixup is removed as part of `storage-migrations` R4/R5 — schema-version-specific migration is retired for this pre-alpha project (no persisted real-user libraries depend on it).

#### Scenario: R2.S1 — id remap with nested references
- **WHEN** a library with a folder, a factory in that folder, a supplier reference, and a nested factory reference (via `nestedFactoryId`) is remapped
- **THEN** all entities receive new ids and every reference points at the corresponding new id

#### Scenario: R2.S3 — dangling reference tolerated
- **WHEN** a factory references a supplier id absent from the import
- **THEN** the reference survives unchanged and no exception is thrown

#### Scenario: R2.S4 — legacy embedded factory is not hoisted
- **WHEN** a schema-≤3 payload with an assembly line carrying `nestedFactoryData` (no `nestedFactoryId`) is remapped
- **THEN** the embedded data passes through unchanged as part of that assembly line (no independent library entry is created for it), and the id map contains no entry for the embedded factory's id

### Requirement: R3 — single-factory import merge
A pure merge function SHALL wrap a single serialized factory into a one-factory library, remap it via R2, and return the merged library (existing folders/factories + imported ones, `schemaVersion: 1`) plus the remapped root entry. If the root cannot be resolved after remapping, the function SHALL return no root, and the caller SHALL treat the import as failed: nothing is persisted and nothing is loaded (today's early-return behavior).

#### Scenario: R3.S1 — single factory merged and root returned
- **WHEN** a single-factory JSON is merged into an existing library
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
