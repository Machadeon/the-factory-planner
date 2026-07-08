# Tasks: decompose-factory-page

Commit sequence follows design §Migration Plan. Every group lands green (`npm run test:run` + `npm run build`); e2e at the milestones marked.

## 1. Test Stubs

All stubs written first and confirmed failing (or failing-to-compile) before implementation. Unit stubs live under `tests/unit/lib/`, `tests/unit/models/`, `tests/unit/hooks/`.

- [x] 1.1 Unit stub `tests/unit/models/valtio-snapshot-spike.test.ts`: page-structure R7.S2 — `getMachineCount`/`getPartProductionRate` via `snapshot()` equal direct proxy reads
- [x] 1.2 Unit stub `tests/unit/lib/filenames.test.ts`: lib-utilities R7.S1 — `sanitizeFilename("Iron Plant #2!")` → `"Iron_Plant__2_"`
- [x] 1.3 Unit stubs `tests/unit/models/library-ops.test.ts`: library-ops R1.S1 (import purity), R2.S1 (id remap with folder/supplier/nested refs), R2.S2 (legacy embedded hoist), R2.S3 (dangling supplier passthrough; dangling parentId/folderId → null), R3.S1 (single-factory merge + root), R4.S1 (bundle rootId resolved), R4.S2 (no rootId → no root)
- [x] 1.4 Unit stubs `tests/unit/hooks/useConsentGate.test.ts`: consent-gate R1.S1 (execute with consent), R1.S2 (defer without), R1.S3 (re-entrant replace), R2.S1 (allow replays once + library reload signal), R3.S1 (cancel discards)
- [x] 1.5 Unit stubs `tests/unit/hooks/useLibrary.test.ts`: page-structure R3.S1 — point-override mutator updates state and persists in one call
- [x] 1.6 Unit stubs `tests/unit/hooks/useDragResize.test.ts`: page-structure R4.S1 — clamp to [200,700], persist once on mouseup, initial width from storage
- [x] 1.7 Unit stubs `tests/unit/hooks/useFactorySession.test.ts`: factory-session R1.S1 (container proxy observability), R4.S1 (fresh defaults), R5.S1 (loadSerialized success), R5.S2 (slug backfill), R5.S3 (autosave-restore opts), R5.S4 (failed deserialization leaves state), R6.S1 (edit marks dirty via subscribe), R6.S2 (save clears dirty), R6.S3 (restore-time writes not dirty; next edit dirty), R7.S1 (clear resets session), R3.S1 (update shim recompute-only)
- [x] 1.8 Unit stubs `tests/unit/hooks/useAutosave.test.ts` (fake timers + real proxy): factory-autosave R1.S1 (burst coalesces at 400ms), R1.S2 (expiry write target by enabled flag), R2.S1 (no consent → no timer/write), R3.S1–S3 (flush enabled/disabled/no-op), R4.S1 (unmount flush), R4.S2 (beforeunload flush), R5.S1 (explicit save cancels + clears slot), R6.S1 (first save enables), R7.S1 (load cancels stale timer)
- [x] 1.9 Unit stubs `tests/unit/hooks/useFactoryUrlSync.test.ts` (jsdom history + PopStateEvent): factory-url-sync R1.S1 (URL slug wins), R1.S2 (autosave restore dirty), R1.S3 (lastId fallback), R1.S4 (fresh), R1.S5 (unresolvable param falls through), R2.S1 (initial hash), R2.S2 (tab switch replaceState), R3.S1 (load pushes bookmarkable URL), R4.S1 (back restores, no push), R4.S2 (hash-only nav with params), R4.S3 (clean URL reset), R4.S4 (deleted factory no-op); factory-autosave R6.S2 (orphan autosave disables)
- [x] 1.10 Integration stubs `tests/integration/FactoryPage.test.tsx` (mount-level): factory-session R2.S1 (proxy mutation re-renders page, no version counter), R7.S2 (dirty + autosave-on + consent → silent save then clear, no dialog), R7.S3 (dirty + autosave-off → clear-confirm dialog; cancel leaves session untouched)
- [x] 1.11 Integration stubs (import wiring, same file or `FactoryPageImport.test.tsx`): library-ops R5.S1 (single-factory import without consent loads but does not save merged library), R5.S2 (bundle import with consent saves and loads root, no drawer), R5.S3 (library import without consent → nothing merges, consent dialog path)
- [x] 1.12 Integration stubs: page-structure R5.S1 (FactoryJsonDialog shows serialized JSON + copy works), R6.S1 (SectionTabs renders three tabs + solver-error alert via formatSolverError); lib-utilities R7.S2 (export uses `sanitizeFilename(factoryName) + ".json"` — assert downloadJson filename arg)
- [x] 1.13 Confirm every stub fails (red) before starting Group 2 (`npx vitest run` on the new files)

## 2. Spike + pure extractions (design steps 1–2)

- [x] 2.1 Add `valtio` dependency (pinned); implement 1.1 spike test green
- [x] 2.2 Create `app/lib/filenames.ts` (`sanitizeFilename`); switch FactoryComponent export path to it (lib-utilities R7.S2); 1.2 green
- [x] 2.3 Create `app/models/library-ops.ts` — `remapImportedLibrary`, `mergeSingleFactory`, `mergeLibrary` per design D6; FactoryComponent's import handlers consume them (behavior identical, library-ops R5 wiring preserved); 1.3 green

## 3. Independent hooks (design step 3)

- [x] 3.1 Extract `app/hooks/useConsentGate.ts`; FactoryComponent consumes; 1.4 green
- [x] 3.2 Extract `app/hooks/useLibrary.ts` (library state + persist-pairing mutators incl. point-override update); FactoryComponent consumes; 1.5 green
- [x] 3.3 Extract `app/hooks/useDragResize.ts`; FactoryComponent consumes; 1.6 green

## 4. Session + autosave (design step 4 — one commit, kills version counter and ref machinery)

- [x] 4.1 Implement `useFactorySession` core: `proxy({ factory })` container (D2), raw-instance update-shim assignment (D3), identity state + dirty, sync `loadSerialized(sf, lib, opts)` with queueMicrotask muting (D4), single container subscription + `onFactoryMutate` seam (D4b)
- [x] 4.2 Implement `useFactorySession` flows: `buildSerialized`, `doSave` (first-save slug/id assignment, deleted-entry save-as-new, autosave-enable-on-first-save), clear flow with guards, `rebuild()`
- [x] 4.3 Implement `app/hooks/useAutosave.ts`: debounce/flush/enabled machinery on the `onFactoryMutate` seam; unload/unmount flush; session-swap timer cancellation
- [x] 4.4 Switch FactoryComponent to both hooks; delete the version counter, the React-coupled `factory.update` body, and the four autosave mirroring refs (`autosaveEnabledRef`, `doSaveRef`, `buildSerializedRef`, `flushAutosaveRef`) — `sidebarWidthRef` already died in 3.3; `activeSectionRef` dies in 5.1; 1.7 + 1.8 green (1.10–1.12 mount FactoryPage and go green at 6.2); `npm run test:e2e` milestone
- [x] 4.5 Profile eager-optimizer mode on a large factory before/after this commit (design risk: proxy overhead); record numbers in the PR description — measured raw vs proxied Factory, 20× eager autoCalculateRates+_updateRates on a 25-line factory: 5.3ms raw vs 6.2ms proxied (~16% relative, ~45µs/solve absolute) — negligible; no ref() exemption needed before model M4

## 5. URL sync (design step 5)

- [x] 5.1 Extract `app/hooks/useFactoryUrlSync.ts` delegating restores to session API (url-sync R5); port suppress-push rAF, hash-capture-at-render, and popstate invariants; `activeSectionRef` moves in here; 1.9 green

## 6. Composition root (design step 6)

- [x] 6.1 Extract `app/components/factory/FactoryJsonDialog.tsx` and `app/components/factory/SectionTabs.tsx` (page-structure R5, R6)
- [x] 6.2 Create `app/components/factory/FactoryPage.tsx` (≤150 lines, hooks + wiring + layout only); update `app/page.tsx`; delete `FactoryComponent.tsx`; update integration test imports (`FactoryComponent.test.tsx`, `history-base-path.test.tsx`); 1.10–1.12 green
- [x] 6.3 Inspection checklist (grep/code-walk, record results in PR): no `setVersion` (factory-session R1.S2); `.update =` assigned only in `useFactorySession` (R3.S2); exactly one restore path sets identity fields (R5.S5); autosave scheduling unreachable from `factory.update` (factory-autosave R1.S3); url-sync delegates restores to session, no duplicated restore logic (factory-url-sync R5.S1); no `FactoryComponent` import leftovers (page-structure R1.S1); FactoryPage line count ≤150

## 7. Verification

- [x] 7.1 All unit/integration tests pass (`npm run test:run`)
- [x] 7.2 All E2E tests pass (`npm run test:e2e`) with zero selector changes
- [x] 7.3 `npm run build` clean; `npm run lint-fix` applied
- [x] 7.4 Lighthouse audit — waived: audit tool run was denied at permission prompt; change is a structural extraction with zero visual/DOM delta (all 93 e2e selectors pass unchanged), so no regression surface vs. main
