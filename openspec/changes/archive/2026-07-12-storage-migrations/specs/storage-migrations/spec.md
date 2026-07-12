## ADDED Requirements

### Requirement: R1 — unified deserialize core
`deserializeFactory(data: SerializedFactory, resolveNested?: (id: string) => SerializedFactory | null, _visiting?: Set<string>)` SHALL be the sole entry point for building a `Factory` from serialized data; no separate stub/cycle-break function SHALL exist. `resolveNested` is optional; when omitted, the core SHALL behave exactly as if `() => null` were passed (no nested/supplier reference resolves) — this preserves today's ergonomic single-argument call for data known to have no nested/supplier references. `resolveNested` SHALL be invoked once per `nestedFactoryId` found on an assembly line and once per entry in `data.supplierIds`. When `resolveNested(id)` returns a `SerializedFactory`, the core SHALL recursively deserialize it via the same core function (passing the same `resolveNested`), producing a `FactoryRecipe`-wrapped nested factory (assembly line case) or supplier `FactoryRecipe` (supplier case). When `resolveNested(id)` returns `null`, the core SHALL skip that assembly line or supplier entry, log a `console.warn` naming the unresolved id, and continue processing the rest of `data`.

#### Scenario: R1.S1 — nested assembly-line link resolves
- **WHEN** `deserializeFactory` is called with data containing an assembly line whose `nestedFactoryId` is `"x"`, and `resolveNested("x")` returns a valid `SerializedFactory`
- **THEN** the resulting `Factory`'s matching assembly line holds a `FactoryRecipe` wrapping the recursively deserialized nested factory

#### Scenario: R1.S2 — supplier link resolves
- **WHEN** `data.supplierIds` contains `"s1"` and `resolveNested("s1")` returns a valid `SerializedFactory`
- **THEN** `factory.supplierFactories` contains a `FactoryRecipe` for `"s1"` wrapping the recursively deserialized factory

#### Scenario: R1.S3 — unresolved reference skipped with warning
- **WHEN** `resolveNested` returns `null` for a `nestedFactoryId` or a `supplierIds` entry
- **THEN** that assembly line or supplier entry is skipped, a `console.warn` naming the id is logged, and the rest of the factory (other production lines, other suppliers) deserializes normally

#### Scenario: R1.S4 — mixed resolution within one factory
- **WHEN** a factory has two assembly lines with `nestedFactoryId`s `"x"` and `"y"`, and `resolveNested("x")` returns data while `resolveNested("y")` returns `null`
- **THEN** the `"x"` assembly line resolves per R1.S1, the `"y"` assembly line is skipped with a warning per R1.S3, and both outcomes coexist in the same returned `Factory`

#### Scenario: R1.S5 — omitted resolveNested defaults to null-resolution
- **WHEN** `deserializeFactory(data)` is called with no second argument, and `data` has no `nestedFactoryId`s or `supplierIds` at all
- **THEN** the factory deserializes normally with no warnings (nothing to resolve); if such data did carry a `nestedFactoryId` or `supplierIds` entry, it would be skipped with a warning per R1.S3, identical to explicitly passing `() => null`

### Requirement: R2 — cycle tracking via `_visiting`
The core SHALL track visited factory ids across a single deserialization call tree using the `_visiting: Set<string>` parameter (defaulting to an empty set at the top-level call). On entry, the core SHALL check whether `data.id` is already present in `_visiting`; if so, this is a cycle (see R3). Otherwise, before recursing into any `resolveNested`-resolved nested factory or supplier (R1.S1/R1.S2), the core SHALL pass a copy of `_visiting` with `data.id` added to that recursive call, so sibling branches do not share cycle state.

#### Scenario: R2.S1 — visiting set grows only along the active recursion path
- **WHEN** factory A references sibling factories B and C (both resolvable, neither referencing the other)
- **THEN** deserializing B's subtree does not affect the `_visiting` set used for C's subtree, and both resolve independently per R1.S1

### Requirement: R3 — stub/cycle-break mode reuses the core with a null resolver
There SHALL be no separate `deserializeFactoryStub` function. Stub behavior SHALL be achieved by calling the R1 core with `resolveNested = () => null` — this skips every `nestedFactoryId` assembly line and every `supplierIds` entry per R1.S3 (including the `console.warn` per skipped reference), while every other production/assembly line (no nested reference) deserializes normally. When R2 detects `data.id` already in `_visiting` (a cycle through nested-factory or supplier references), the core SHALL break the cycle by deserializing that occurrence with `resolveNested` forced to `() => null` regardless of the caller-supplied resolver, i.e. by invoking itself in stub mode for that occurrence only.

#### Scenario: R3.S1 — cycle breaks without infinite recursion
- **WHEN** factory A's assembly line references factory B (`nestedFactoryId`), and B's own assembly line references A again
- **THEN** deserializing A succeeds: A resolves B normally, B resolves A normally (recursing a second time), and it's this second, re-encountered occurrence of A — the one whose id is already in `_visiting` — that is built in stub mode, with *its* reference back to B skipped and a `console.warn` logged per R1.S3; deserialization terminates after this third-level call with no infinite recursion or stack overflow

#### Scenario: R3.S2 — standalone stub call skips every nested/supplier reference
- **WHEN** a caller invokes `deserializeFactory(data, () => null)` directly (equivalent to today's standalone stub use)
- **THEN** every assembly line with a `nestedFactoryId` and every `supplierIds` entry is skipped per R1.S3, and every other production line/assembly line (no nested reference) deserializes normally

### Requirement: R4 — schemaVersion is pinned, not branched on
`SerializedFactory.schemaVersion` and `StorageLibrary.schemaVersion` SHALL always be written as `1` by `serializeFactory`, `emptyLibrary`, and `migrateLibrary`. No deserialize, load, or migrate path SHALL branch on the runtime value of `schemaVersion`. Legacy or malformed field shapes are handled by the existing per-field tolerance already documented in AGENTS.md (missing part/recipe lookups skip the affected production/assembly line and log a warning), not by version-specific repair logic.

#### Scenario: R4.S1 — schemaVersion always 1 on write
- **WHEN** a factory is serialized via `serializeFactory`, or a library is produced by `emptyLibrary` or `migrateLibrary`
- **THEN** the resulting `schemaVersion` field is `1`

#### Scenario: R4.S2 — legacy field shapes are not repaired
- **WHEN** raw input data uses the legacy `slooped` boolean field instead of `sloopedSlots`, omits `machineSpeed`/`allowRemainder`, or embeds `nestedFactoryData` instead of a `nestedFactoryId`
- **THEN** no migration step rewrites these fields; `sloopedSlots` falls through to `AssemblyLine`'s own constructor default (`0`) when absent, `machineSpeed`/`allowRemainder` fall through to the constructor's own defaults (`100`/`true`) when absent, and an assembly line with only `nestedFactoryData` (no `recipeSlug`, no `nestedFactoryId`) is skipped with a warning per the existing "neither recipeSlug nor nestedFactoryId" tolerance

### Requirement: R5 — migrateLibrary is a structural-shape guarantee only
`migrateLibrary(raw)` SHALL guarantee only structural defaults on its output: `schemaVersion: 1` (per R4), `folders: []` if absent, `factories: []` if absent. It SHALL NOT perform field-level rewrites (no `slooped` rename, no `nestedFactoryData` hoisting, no per-assembly-line defaulting) — those concerns are retired per R4.

#### Scenario: R5.S1 — missing folders/factories default to empty arrays
- **WHEN** `migrateLibrary` is called with raw data lacking a `folders` or `factories` key
- **THEN** the returned library has `folders: []` and/or `factories: []` respectively, and `schemaVersion: 1`

### Requirement: R6 — module boundary
`app/models/factory-storage.ts` SHALL contain only serialization types, `CURRENT_SCHEMA_VERSION`, `emptyLibrary`, `serializeFactory`, `deserializeFactory` (R1/R2/R3), `collectFactoryBundle`, `directDependencyIds`, `generateSlug`, and `generateId`. `app/models/migrations.ts` SHALL contain `migrateLibrary` (R4/R5) plus the import-merge functions absorbed from `library-ops.ts` (`remapImportedLibrary`, `mergeSingleFactory`, `mergeLibrary` — see the `library-ops` capability's own requirement numbering, distinct from this file's). `app/models/library-ops.ts` SHALL NOT exist after this change.

#### Scenario: R6.S1 — library-ops.ts is gone
- **WHEN** the repository is inspected after this change
- **THEN** no file at `app/models/library-ops.ts` exists, and every prior importer of its exports imports from `app/models/migrations.ts` instead

### Requirement: R7 — loadLibrary normalizes unconditionally, not by version comparison
`storage-service.ts`'s `loadLibrary` SHALL call `migrateLibrary` on every successfully-parsed stored library, unconditionally — it SHALL NOT gate that call behind a `parsed.schemaVersion < CURRENT_SCHEMA_VERSION` (or any other version-magnitude) comparison. This closes the gap where pinning `schemaVersion` to `1` (R4) would otherwise make a legacy `<` comparison against stored data saved under any prior higher version number (1–5, from before this change) evaluate false and skip normalization entirely. Because `migrateLibrary` post-R5 is a cheap, idempotent structural-default-fill (not a per-version repair pass), calling it on every load has no meaningful cost and no behavior difference for already-well-formed data.

#### Scenario: R7.S1 — pre-change stored data still gets structurally normalized
- **WHEN** `loadLibrary` parses a stored library JSON blob that was written before this change (carrying `schemaVersion: 5` or any other prior value, and potentially missing `folders`/`factories` keys entirely if extremely old)
- **THEN** `migrateLibrary` runs on it regardless of its `schemaVersion` value, guaranteeing `folders`/`factories` default to `[]` if absent (R5) and the re-saved library carries `schemaVersion: 1` (R4)

#### Scenario: R7.S2 — well-formed current data is unaffected
- **WHEN** `loadLibrary` parses a stored library already shaped correctly (has `folders`, `factories`, `schemaVersion: 1`)
- **THEN** running `migrateLibrary` unconditionally on it produces an equivalent library (structural defaults are no-ops when the keys are already present)
