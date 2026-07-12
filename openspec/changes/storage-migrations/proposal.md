## Why

`app/models/factory-storage.ts` carries two duplicate ~60-line deserialize paths (`deserializeFactory` / `deserializeFactoryStub`, differing only in whether nested-factory links resolve) and a blanket, version-blind `migrateLibrary` that unconditionally applies every legacy fixup regardless of input schema. `app/models/library-ops.ts` is an explicitly transitional file whose own header says "model M5 later folds this into the storage/migrations area." This is M5 of `plans/model-refactor.md`: consolidate serialize/deserialize/migrate/import-merge into one coherent area and delete the duplication.

The project is pre-alpha with no real users, so this change also retires the schema-version migration machinery entirely rather than restructuring it into per-version steps — there is nothing yet worth migrating, and carrying dead version-branch code forward only grows the next bump's blast radius for no benefit.

## What Changes

- **BREAKING** (pre-alpha, no persisted-user impact accepted): delete schema-version migration. `migrateLibrary`'s legacy fixups (`slooped`→`sloopedSlots` rename, `machineSpeed`/`allowRemainder` defaulting, `nestedFactoryData` embedded-factory hoisting) are removed. `schemaVersion` stays on `SerializedFactory`/`StorageLibrary` (pinned to `1`, written by `serializeFactory`/`emptyLibrary`) but nothing reads or branches on its value. Existing localStorage libraries saved under prior schema versions (1–5) are not migrated; malformed/legacy shapes degrade via the existing per-line skip/warn tolerance (AGENTS.md-documented convention), not a version-aware repair pass.
- Unify `deserializeFactory` / `deserializeFactoryStub` into one core function taking `resolveNested: (id) => SerializedFactory | null` in place of the `library?: StorageLibrary` parameter. Callers close over their library to build the resolver (`(id) => library.factories.find(f => f.id === id) ?? null`); stub/cycle-break mode is the same core called with `() => null`. Cycle detection recurses into the core with a null-returning resolver instead of invoking a separate stub function. Deletes the ~60-line copy.
- Split `app/models/migrations.ts` out of `factory-storage.ts`, and absorb `app/models/library-ops.ts` into it: `migrateLibrary`, `remapImportedLibrary`, `mergeSingleFactory`, `mergeLibrary` all live together as "reshape data on the way in." `factory-storage.ts` keeps serialize/deserialize/types/bundle-collection only. `library-ops.ts` is deleted; its exports move to `migrations.ts` (re-exported from the same public names, import paths update at call sites).
- `remapImportedLibrary`'s dependency on legacy embedded-factory hoisting goes away with `migrateLibrary`'s simplification — it now just assigns fresh ids and rewrites cross-references, no migration step first.

## Capabilities

### New Capabilities
- `storage-migrations`: deserialize-core unification (`resolveNested` link strategy) and the (now much smaller) `migrateLibrary`/schema-pinning behavior, living in `app/models/factory-storage.ts` + `app/models/migrations.ts`.

### Modified Capabilities
- `library-ops`: file location changes (`app/models/library-ops.ts` → folded into `app/models/migrations.ts`); Requirement R2 drops the schema-≤3 embedded-factory hoisting scenario (R2.S2) since `migrateLibrary` no longer performs that hoist — `remapImportedLibrary` becomes pure id-remap + cross-reference rewrite with no migration step first.

## Impact

- **Code**: `app/models/factory-storage.ts` (deserialize unification, migration exports removed), `app/models/library-ops.ts` (deleted, contents relocated), new `app/models/migrations.ts`. Call-site import updates wherever `library-ops` or the removed migration fixups are imported (`hooks/useLibrary`, `FactoryPage`/import wiring, tests).
- **Tests**: `tests/unit/models/factory-storage.test.ts`, `tests/unit/models/factory-storage-graph.test.ts`, `tests/unit/models/library-ops.test.ts` — legacy schema-version fixup assertions (slooped rename, embedded-nested hoist-on-migrate, schemaVersion 3/4 fixtures) deleted; round-trip serialize→deserialize coverage adapted and kept; new stub-mode parity test (resolver-null path vs. today's `deserializeFactoryStub` output on a factory with nested links) added; new `migrations.ts` gets direct unit tests for its relocated functions.
- **`storage-service.ts`**: import path updates (`migrateLibrary` now from `migrations.ts`), plus one required logic fix — `loadLibrary`'s `parsed.schemaVersion < CURRENT_SCHEMA_VERSION` gate breaks once `schemaVersion` is pinned to `1` (old data would never satisfy `< 1`), so it now calls `migrateLibrary` unconditionally on every load (see design.md D6). Consent gate and autosave keys are unchanged.
- **No changes**: LP solver, any UI component behavior beyond import paths.
