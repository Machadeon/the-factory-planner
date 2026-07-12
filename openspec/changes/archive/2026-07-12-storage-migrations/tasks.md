## 1. Test Stubs

<!-- One stub per spec scenario. Written to fail first, made to pass in later groups. -->

### storage-migrations capability

- [x] 1.1 Unit test stub (`tests/unit/models/factory-storage.test.ts`): R1.S1 — assembly-line `nestedFactoryId` resolves via `resolveNested` returning data
- [x] 1.2 Unit test stub: R1.S2 — `supplierIds` entry resolves via `resolveNested` returning data
- [x] 1.3 Unit test stub: R1.S3 — `resolveNested` returning `null` skips the reference and logs `console.warn` (spy on `console.warn`, assert call + id in message)
- [x] 1.4 Unit test stub: R1.S4 — mixed resolution, one nested ref resolves and one doesn't, both outcomes present on the same returned `Factory`
- [x] 1.5 Unit test stub: R1.S5 — `deserializeFactory(data)` called with no second argument behaves as `() => null` (passes today already — `library?.factories` short-circuits cleanly on undefined; confirmed correct, not a gap)
- [x] 1.6 Unit test stub: R2.S1 — sibling nested-factory subtrees don't share `_visiting` state (both resolve independently)
- [x] 1.7 Unit test stub (**stub-mode parity test**, per user's testing directive): R3.S1 — cyclic reference (A references B, B references A back) deserializes without infinite recursion/stack overflow; nested B is built in stub mode, its back-reference to A skipped with a warning
- [x] 1.8 Unit test stub: R3.S2 — `deserializeFactory(data, () => null)` skips every nested/supplier reference, non-nested lines deserialize normally (this is the direct replacement for today's standalone `deserializeFactoryStub` behavior — assert output shape matches what `deserializeFactoryStub` produces today, run this against both the pre-change and post-change code paths if feasible to lock down parity)
- [x] 1.9 Unit test stub: R4.S1 — `serializeFactory`, `emptyLibrary`, `migrateLibrary` all write `schemaVersion: 1` (new file `tests/unit/models/migrations.test.ts`)
- [x] 1.10 Unit test stub: R4.S2 — real fixture with legacy `slooped: true` (no `sloopedSlots`), missing `machineSpeed`/`allowRemainder`, and an assembly line with only `nestedFactoryData` (no `nestedFactoryId`/`recipeSlug`) — assert `sloopedSlots` defaults to `0`, `machineSpeed`/`allowRemainder` default to `100`/`true`, and the `nestedFactoryData`-only line is skipped with a warning (passes today already — this exact fixture shape was already tolerated pre-refactor; the *new* embedded-fallback-retirement behavior is separately covered by task 4.13's rewrite of the graph test)
- [x] 1.11 Unit test stub: R5.S1 — `migrateLibrary` on raw data missing `folders`/`factories` keys defaults both to `[]`
- [x] 1.12 Unit test stub: R6.S1 — `app/models/library-ops.ts` does not exist (filesystem check, e.g. `fs.existsSync`)
- [x] 1.13 Unit test stub: R7.S1 — real fixture of a pre-change stored library (`schemaVersion: 5`, well-formed) round-tripped through `loadLibrary` still gets `migrateLibrary` applied (black-box via `localStorage`, not a spy — same effective coverage)
- [x] 1.14 Unit test stub: R7.S2 — already-well-formed current-shape data survives unconditional `migrateLibrary` as a no-op (deep-equal before/after apart from `schemaVersion`/array defaults) — passes today already (well-formed data is a no-op under either the old gated path or the new unconditional path by construction; genuine regression coverage lives in R7.S1)

### library-ops capability (delta)

- [ ] 1.15 Adapt existing unit test stub: R1.S1 (purity) — path updates to `app/models/migrations.ts` — deferred until Group 3 creates `migrations.ts`; tracked together with task 5.2
- [x] 1.16 Existing unit test stub carries over unchanged: R2.S1 — id remap with nested references
- [x] 1.17 Existing unit test stub carries over unchanged: R2.S3 — dangling reference tolerated
- [x] 1.18 New unit test stub: R2.S4 — real fixture, schema-≤3 payload with embedded `nestedFactoryData` (no `nestedFactoryId`) remapped — assert the embedded data passes through unchanged on the assembly line and no independent library entry/id-map entry is created for it
- [x] 1.19 Existing unit test stubs carry over unchanged: R3.S1, R4.S1, R4.S2, R5.S1, R5.S2, R5.S3

## 2. Unify deserializeFactory core (factory-storage.ts)

- [x] 2.1 Change `deserializeFactory` signature to `(data, resolveNested?: (id: string) => SerializedFactory | null, _visiting = new Set<string>())`
- [x] 2.2 Replace the `library?.factories.find(...)` nested-factory lookup and the `library?.factories.find(...)` supplier lookup with calls to `resolveNested(id)`
- [x] 2.3 Remove the `?? alData.nestedFactoryData` embedded-copy fallback — resolution is exclusively via `resolveNested` per R1 (see design.md D1 note; this is the change that requires updating the test noted in 4.13)
- [x] 2.4 On cycle detection (`_visiting.has(data.id)`), recurse into the same core with `resolveNested` forced to `() => null` for that occurrence instead of calling a separate stub function
- [x] 2.5 Delete `deserializeFactoryStub` entirely
- [x] 2.6 Add `console.warn` on every `resolveNested(id) === null` skip (assembly line and supplier cases) if not already present on both paths — verify parity between the two skip sites (already present on both original paths, carried through unchanged)

## 3. Create migrations.ts, simplify migrateLibrary, absorb library-ops

- [x] 3.1 Create `app/models/migrations.ts`
- [x] 3.2 Move `migrateLibrary` into `migrations.ts`; strip `migrateAssemblyLineRaw`, `migrateSerializedFactoryRaw`, `collectEmbeddedFactories` and all field-level fixups — replace with a function that only defaults `schemaVersion: 1`, `folders: []`, `factories: []`
- [x] 3.3 Ensure `serializeFactory` and `emptyLibrary` (in `factory-storage.ts`) write `schemaVersion: 1` (`CURRENT_SCHEMA_VERSION` pinned to `1`, both already derive from it)
- [x] 3.4 Move `remapImportedLibrary`, `mergeSingleFactory`, `mergeLibrary` from `app/models/library-ops.ts` into `migrations.ts`, updating their internal `migrateLibrary` import to be local
- [x] 3.5 Delete `app/models/library-ops.ts`
- [x] 3.6 Confirm `factory-storage.ts` still exports `CURRENT_SCHEMA_VERSION`, `emptyLibrary`, `generateId` (per spec R6 / design D5) alongside `serializeFactory`, `deserializeFactory`, `collectFactoryBundle`, `directDependencyIds`, `generateSlug`
- [x] 1.15 (completed alongside 3.4/5.2) purity test now reads `migrations.ts`
- [x] 5.1 (completed alongside 3.2) deleted the 4-test `migrateLibrary() — embedded factory hoisting` describe block in `factory-storage.test.ts`
- [x] 5.2 (completed alongside 3.4) `library-ops.test.ts` import path updated to `migrations.ts`; removed the old R2.S2 hoisting-assertion test (superseded by R2.S4)
- [x] 5.3 (completed alongside 3.3) `factory-storage-graph.test.ts` "AC6: schemaVersion is 5" → updated to `1`

## 4. Update call sites

- [x] 4.1 `app/models/consumer-links.ts:21` — `deserializeFactory(sf, library)` → `deserializeFactory(sf, (id) => library.factories.find(f => f.id === id) ?? null)`
- [x] 4.2 `app/components/FactoryPickerDialog.tsx:42` — same resolver-closure conversion
- [x] 4.3 `app/components/optimization/SourceFactoriesEditor.tsx:49` — same resolver-closure conversion
- [x] 4.4 `app/components/factory/useFactoryPageFlows.ts:82` — same resolver-closure conversion; also update its `import { mergeLibrary, mergeSingleFactory } from "@/app/models/library-ops"` to `"@/app/models/migrations"`
- [x] 4.5 `app/hooks/useFactorySession.ts:132` — same resolver-closure conversion
- [x] 4.6 `app/hooks/useFactoryUrlSync.ts:98` — same resolver-closure conversion (shared `resolveNested` closure defined once per enclosing function, reused across all sites within it)
- [x] 4.7 `app/hooks/useFactoryUrlSync.ts:111` — same resolver-closure conversion
- [x] 4.8 `app/hooks/useFactoryUrlSync.ts:127` — same resolver-closure conversion
- [x] 4.9 `app/hooks/useFactoryUrlSync.ts:216` — same resolver-closure conversion
- [x] 4.10 `app/hooks/useFactoryUrlSync.ts:231` — same resolver-closure conversion
- [x] 4.11 `app/models/storage-service.ts` — update `migrateLibrary` import to `./migrations`; implement D6: `loadLibrary` calls `migrateLibrary(parsed)` unconditionally, removing the `!parsed?.schemaVersion || parsed.schemaVersion < CURRENT_SCHEMA_VERSION` gate entirely
- [x] 4.12 `app/models/storage-service.ts` — verify no code assumes `loadLibrary` is read-only now that it write-backs (`saveLibrary`) on every call, not just on a rare version-gate hit (per design.md D6 note) — only caller is `useLibrary.ts`'s `reload()`, confirmed safe
- [x] 4.13 `tests/unit/models/factory-storage-graph.test.ts` — rewrite the "nested-factory line with no rows..." test (~line 156) to pass an explicit `resolveNested` (e.g. `(id) => (id === "nested" ? nestedSer : null)`) instead of relying on the removed `nestedFactoryData` embedded fallback

## 5. Delete/adapt legacy-migration-specific test assertions

- [x] 5.1 `tests/unit/models/factory-storage.test.ts` — delete the `describe("migrateLibrary() — embedded factory hoisting", ...)` block (schema-≤3 hoisting behavior no longer exists); keep/adapt any assertions there that are actually about structural defaults (folders/factories arrays) by moving them to assert against the new R5 behavior
- [x] 5.2 `tests/unit/models/library-ops.test.ts` — update import path to `@/app/models/migrations`; remove/adapt any assertion relying on `remapImportedLibrary` hoisting a schema-≤3 embedded factory into an independent entry (replaced by task 1.18's R2.S4 pass-through assertion)
- [x] 5.3 `tests/unit/models/factory-storage-graph.test.ts` — "AC6: schemaVersion is 5" (line 51) → update expected value to `1`
- [x] 5.4 `tests/integration/FactoryPage.test.tsx` — verify `library-ops R5.*` test names/imports still resolve after the module move; update import paths if it imports directly from `library-ops` — no direct import found, only test-name labels; nothing to change
- [x] 5.5 Sweep remaining `schemaVersion: CURRENT_SCHEMA_VERSION` / hardcoded `schemaVersion: 5` literals in test fixtures across `tests/unit/models/*.ts`, `tests/unit/hooks/*.ts`, `tests/integration/*.tsx`, `tests/e2e/**/*` — fixed a real regression in `useLibrary.test.ts` (`reload()` assertion expected the raw `schemaVersion: 5` passthrough, now correctly expects normalization to `CURRENT_SCHEMA_VERSION`); normalized `makeFactory()`'s default and e2e fixture literals to the constant/`1`; left incidental unrelated-to-migration literals in `LogisticsSection.test.tsx`/`library-nav-context.test.tsx`/`render-scope.test.tsx` untouched (never touch migrateLibrary, no functional effect, not worth the diff)

## 6. Verification

- [x] 6.1 All Group 1 test stubs now pass (`npm run test:run`)
- [x] 6.2 Full unit/integration suite passes (`npm run test:run`) — 540 passed, 2 todo (pre-existing)
- [x] 6.3 Full E2E suite passes (`npm run test:e2e`) — 93 passed, 1 skipped (pre-existing)
- [x] 6.4 `npm run build` succeeds (catches any missed import of deleted `library-ops.ts` or old `deserializeFactoryStub`)
- [x] 6.5 `make verify` passes (Biome + unit tests + build, per AGENTS.md pre-commit requirement)
- [x] 6.6 No UI/component behavior changed — lighthouse audit not applicable (no UI surface touched, confirmed in design-review)
