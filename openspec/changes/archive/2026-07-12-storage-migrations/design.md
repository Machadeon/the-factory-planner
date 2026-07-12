## Context

`app/models/factory-storage.ts` (493 lines) currently mixes four concerns: serialize/deserialize, a duplicate stub-mode deserialize path (`deserializeFactoryStub`, ~60 lines nearly identical to `deserializeFactory`), and a version-blind `migrateLibrary` that unconditionally applies legacy field-shape fixups regardless of the input's actual `schemaVersion`. `app/models/library-ops.ts` (92 lines) is a separately-landed, explicitly transitional file for import-merge (`remapImportedLibrary`/`mergeSingleFactory`/`mergeLibrary`) whose own header says it's waiting for this change to fold it in.

This is M5 of `plans/model-refactor.md`. During spec drafting (grilled with the user) the scope shifted from the plan's literal "restructure `migrateLibrary` into per-schema-version steps" to retiring schema-version migration entirely: the project is pre-alpha with no real users, `migrateLibrary`'s three per-line fixups are redundant with defaults `AssemblyLine`'s own constructor already applies (`sloopedSlots ?? 0`, `machineSpeed ?? 100`, `allowRemainder ?? true`), and the fourth (embedded-`nestedFactoryData` hoisting) is a real behavior being deliberately dropped, not ported. See `specs/storage-migrations/spec.md` and `specs/library-ops/spec.md` for the normative requirements this design implements.

## Goals / Non-Goals

**Goals:**
- One deserialize code path (`deserializeFactory` + `resolveNested`) replacing today's two near-duplicate functions.
- `app/models/migrations.ts` as the single home for "reshape data on the way in": `migrateLibrary` (now a structural-shape guarantee only) plus the import-merge functions absorbed from `library-ops.ts`.
- Delete `app/models/library-ops.ts` and all schema-version-specific migration code.
- Every existing call site (hooks, `FactoryPage` import wiring, `storage-service.ts`, tests) updated to the new module boundary with no behavior change beyond what's specified.

**Non-Goals:**
- No LP solver, rate-propagation, or algorithm changes.
- No UI/component behavior changes beyond import-path updates.
- No new schema version — this change *removes* version branching, it doesn't add one.
- No changes to `storage-service.ts`'s consent gate or autosave keys.
- Not a data migration — `loadLibrary`'s version-gate does need one small logic fix (D6) because pinning `schemaVersion` breaks it otherwise; this is a bug fix forced by D3, not new scope.

## Decisions

### D1 — `resolveNested` replaces the `library?: StorageLibrary` parameter
`deserializeFactory(data, resolveNested?: (id) => SerializedFactory | null, _visiting?)` takes a resolver function instead of a `StorageLibrary`. Callers with a library build the resolver once: `(id) => library.factories.find(f => f.id === id) ?? null`. `resolveNested` stays optional (defaults to `() => null` behavior when omitted) so the many existing call sites that deserialize data known to have no nested/supplier references (most unit tests) keep their single-argument call unchanged.

**Note:** today's `deserializeFactory` also has a second, independent fallback — `library?.factories.find(...) ?? alData.nestedFactoryData` — that resolves a nested factory directly from an embedded copy when no library match is found. This is retired along with the `library` parameter itself; `resolveNested` is the *only* resolution path (R1). One existing test (`tests/unit/models/factory-storage-graph.test.ts`, "nested-factory line with no rows...") relies on this embedded fallback via a single-argument call and needs rewriting to pass an explicit resolver — flagged in tasks.md.

**Why over keeping `library` + adding `resolveNested` as an optional override:** two ways to resolve the same reference is exactly the duplication this change removes. A resolver function is also the natural seam for stub mode (`() => null`) and for future callers that don't have a full `StorageLibrary` in hand (e.g. a single-factory fixture in a unit test) — they no longer need to wrap a fixture in a fake `StorageLibrary` just to satisfy the signature.

### D2 — Stub mode is not a separate function, it's `resolveNested = () => null`
`deserializeFactoryStub` is deleted. Anywhere the codebase needs stub behavior, it calls `deserializeFactory(data, () => null)`. Cycle-breaking (today: `if (_visiting.has(data.id)) return deserializeFactoryStub(data)`) becomes: on cycle detection, recurse into the *same* core function for that occurrence with the resolver forced to `() => null`, regardless of what resolver the outer call was using.

**Why this doesn't infinite-loop:** a `() => null` resolver never returns data to recurse into, so any call made with it terminates after skipping every reference at that level — `_visiting` doesn't even need to be threaded through the forced-stub sub-call. This is a direct consequence of D1: once resolution is a pure function of id → data, "no resolution available" and "deliberately stubbing" collapse into the same input.

**Behavior delta accepted:** stub-mode invocations now also process `supplierIds` (skipping each with a warning) and emit `console.warn` for every skipped reference — today's `deserializeFactoryStub` silently ignores `supplierIds` entirely and never warns. Confirmed acceptable with the user (single code path buys this "for free"; the extra log lines are harmless signal, not noise that breaks anything).

### D3 — `migrateLibrary` becomes a structural-shape guarantee, not a migration
Post-change, `migrateLibrary(raw)` only guarantees `schemaVersion: 1`, `folders: []`, `factories: []` when those keys are absent from `raw`. It performs no field-level rewrites. `serializeFactory` and `emptyLibrary` also always write `schemaVersion: 1`.

**Why not gate fixups by version (the plan's literal ask):** `migrateSerializedFactoryRaw` today applies every fixup unconditionally regardless of input `schemaVersion` — there was never real version-gating to "restructure." Gating it now would be *new* behavior, not a refactor, and there's no real per-version test fixture corpus to validate it against (pre-alpha, no accumulated real-world saves across versions). Given the fixups are redundant with `AssemblyLine`'s own constructor defaults (see Context), the honest simplification is to delete them rather than invent version semantics that never existed. The one fixup that isn't redundant — embedded-`nestedFactoryData` hoisting — is a deliberate, user-confirmed scope cut, not an oversight.

**Why keep the `schemaVersion` field at all if nothing reads it:** cheap forward-compat. When this project does get a real schema bump, the field is already on the wire and every writer already sets it; a future change adds a real second branch without touching every existing writer.

### D4 — `library-ops.ts` folds into `migrations.ts`, not `factory-storage.ts`
`remapImportedLibrary`, `mergeSingleFactory`, `mergeLibrary` move into `migrations.ts` alongside `migrateLibrary`.

**Why over `factory-storage.ts`:** both `migrateLibrary` and the import-merge functions are "reshape incoming data before it becomes live state" — `factory-storage.ts` stays scoped to the serialize/deserialize boundary (`Factory` ↔ `SerializedFactory`), never touching multi-factory library shape or id remapping. This keeps a clean top-down read: `factory-storage.ts` = one factory in/out, `migrations.ts` = whole-library reshaping (both structural normalization and import id-remapping).

### D5 — Module boundary and call-site updates
`factory-storage.ts` exports: types, `CURRENT_SCHEMA_VERSION`, `emptyLibrary`, `serializeFactory`, `deserializeFactory`, `collectFactoryBundle`, `directDependencyIds`, `generateSlug`, `generateId`. `migrations.ts` exports: `migrateLibrary`, `remapImportedLibrary`, `mergeSingleFactory`, `mergeLibrary`. `storage-service.ts` updates its import: `migrateLibrary` now comes from `migrations.ts`; `CURRENT_SCHEMA_VERSION`, `emptyLibrary`, `generateId` stay sourced from `factory-storage.ts`. Every other importer of `library-ops.ts` (hooks, `FactoryPage`) updates its import path to `migrations.ts`.

### D6 — `loadLibrary` calls `migrateLibrary` unconditionally, dropping the version comparison
Today's `loadLibrary` (`storage-service.ts`) only normalizes stored data when `!parsed?.schemaVersion || parsed.schemaVersion < CURRENT_SCHEMA_VERSION`. Once `CURRENT_SCHEMA_VERSION` is pinned to `1` (D3), that comparison breaks: any library saved under a prior version number (1–5, from before this change shipped) has `schemaVersion >= 1` already, so the `<` check evaluates false and `migrateLibrary` never runs — silently skipping the structural-default guarantee for exactly the data that predates this change. **Caught in design review; the original draft of this design incorrectly claimed `loadLibrary`'s branch structure was unchanged.**

Fix: `loadLibrary` calls `migrateLibrary(parsed)` unconditionally on every successful parse, with no version comparison at all. This is safe and cheap because D3 already made `migrateLibrary` an idempotent structural-default-fill rather than a per-version repair pass — running it on already-well-formed data is a no-op; running it on old data guarantees `folders`/`factories` default to `[]` if somehow absent and the re-saved library carries `schemaVersion: 1`.

**Why not keep some other version check:** there's nothing left to check against — R4 (schemaVersion pinned, never branched on) forbids exactly the kind of comparison the old code did. Removing the gate is the direct, honest consequence of D3, not a workaround.

**Noted in design review (non-blocking):** today's code already calls `saveLibrary(migrated)` whenever the gate triggers — that isn't new. What changes is *frequency*: the gate used to trigger rarely (only for data below the current version), so the write-back was rare too. Unconditional `migrateLibrary` means `loadLibrary` write-back fires on every app load. Harmless (same `localStorage.setItem` cost as any autosave) but worth a task-phase check that nothing assumes `loadLibrary` is read-only.

## Risks / Trade-offs

- **[Risk] Existing localStorage libraries at schema 1–4 lose fidelity on next load** (sloop flags reset to 0 if stored under the legacy `slooped` field, embedded nested factories no longer hoisted into independent entries and instead skipped with a warning) → **Mitigation**: accepted by the user as a pre-alpha trade-off (no real user data). Not silent data corruption — degraded fields default sanely (0 sloops, not a crash) and skipped references log a warning; nothing throws.
- **[Risk] Broad call-site churn**: every place importing from `library-ops.ts` or relying on `deserializeFactoryStub`/`library`-shaped deserialize needs updating (hooks, `FactoryPage`, `storage-service.ts`, ~5 test files) → **Mitigation**: tasks.md enumerates every call site found via `grep -rl` before implementation starts; `tsc`/build catches any missed import.
- **[Risk] Stub-mode's new `console.warn` volume** during legitimate cyclic factory graphs (A↔B references) → **Mitigation**: accepted; warnings are dev-console-only, no user-facing effect, and existing tolerant-skip style already warns liberally elsewhere.
- **[Risk] Pinning `schemaVersion` silently breaks `loadLibrary`'s existing version-gate** (found in design review; see D6) → **Mitigation**: D6 removes the gate, calling `migrateLibrary` unconditionally on every load — cheap and idempotent per D3, so no behavior loss for legacy data and no cost for current data.
- **[Risk] `migrations.ts` becomes a new dumping ground** (schema shape + import remap in one file) if scope creeps later → **Mitigation**: each exported function stays pure and independently testable; if the file grows unwieldy in a future change, splitting is cheap because there's no shared mutable state between the two concerns today.

## Migration Plan

This is a code-only refactor; there is no data migration to roll out (that's precisely what's being deleted). Implementation order:
1. Add the unified `deserializeFactory` core + `resolveNested` alongside the existing functions (non-breaking).
2. Switch all call sites to the new core; delete `deserializeFactoryStub`.
3. Create `migrations.ts`, move `migrateLibrary` (simplified per D3) and the `library-ops.ts` exports into it; delete `library-ops.ts`.
4. Update remaining imports (`storage-service.ts`, hooks, `FactoryPage`).
5. Delete/adapt legacy-migration-specific test assertions per the proposal's Impact section; add the stub-mode parity test and any new direct unit tests for `migrations.ts`.

**Rollback:** standard `git revert`. One caveat: between deploy and any rollback, `loadLibrary` (D6) will have re-saved some users' libraries with `schemaVersion: 1` and structural defaults filled in (no field-level rewrites occurred — D3 — so no data is lost or corrupted). A reverted build's old `loadLibrary` would see `schemaVersion: 1 < CURRENT_SCHEMA_VERSION: 5` and simply re-run its old `migrateLibrary` again, which is harmless (its fixups are idempotent no-ops on already-shaped data). No manual cleanup needed.

## Open Questions

None outstanding — all ambiguities from the original plan text (per-version migration steps, deserialize signature shape, file placement, schemaVersion field fate, test fallout) were resolved during proposal/spec grilling with the user and are captured as decisions above.
