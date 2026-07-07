# Proposal: decompose-factory-page

Phase 2 of `plans/component-refactor.md` (order 5 in the combined sequencing table). Prerequisites landed: Phase 1 `extract-ui-primitives-and-lib`, M1 `model-hygiene`, M2 `split-factory-god-class`.

## Why

`FactoryComponent.tsx` (1,141 lines) owns nine unrelated concerns — session state, autosave debounce machinery, URL/history sync, restore-on-mount, consent gating, save/load/new/clear flows, import/export id-remapping, sidebar resize, and page layout. Six refs mirror state because closures escape React's render cycle; the "restore serialized factory → session state" block is duplicated four times with drift-prone variations. None of this logic is unit-testable today — it is covered only indirectly by e2e. Additionally, every model mutation funnels through a root version counter, re-rendering the whole page on every keystroke; this change introduces the valtio store that later phases use to scope re-renders.

## What Changes

- `FactoryComponent.tsx` is decomposed into six hooks (`useConsentGate`, `useAutosave`, `useLibrary`, `useDragResize`, `useFactorySession`, `useFactoryUrlSync`) under `app/hooks/`, plus a thin composition root `app/components/factory/FactoryPage.tsx` (target ≤150 lines) that calls the hooks and renders layout.
- Pure logic exits React first: import id-remapping (`remapImportedLibrary`, single-factory/library import merge) moves to `app/models/library-ops.ts`; filename sanitization moves to `app/lib/filenames.ts` as `sanitizeFilename`.
- `FactoryJsonDialog` and `SectionTabs` are extracted as components under `app/components/factory/`.
- The four duplicated restore blocks (restoreFactory priority 1/priority 3, popstate handler, `loadFactoryFromSerialized`) collapse into one `loadSerialized(sf, lib)` path inside `useFactorySession`.
- **valtio dependency added.** `useFactorySession` wraps the Factory in `proxy()`; the root version counter and the React-coupled `factory.update` body are deleted. Transitional shim: `factory.update = () => factory._updateRates()` (recompute only, no React coupling — model M4 deletes it later). Dirty-tracking and autosave move from `factory.update` plumbing to `subscribe(factory, …)`.
- `FactoryPage` renders via one root `useSnapshot`, so re-render behavior is unchanged in this phase — fine-grained scoping arrives in Phases 3–4.
- Hook unit tests via `renderHook`: autosave debounce/flush timing (fake timers + real proxy mutations), consent pending-action replay, restore priority chain (URL → autosave → lastId), popstate push-suppression.
- **No behavior change.** Aria-labels and `data-testid`s frozen; e2e suite is the safety net.

## Capabilities

### New Capabilities

- `factory-session`: valtio-proxied Factory store; session identity state (name/id/slug/folder/createdAt/dirty); the single `loadSerialized` restore path; new/clear flows; the transitional recompute-only `factory.update` shim.
- `factory-autosave`: consent-aware debounced autosave driven by `subscribe(factory)`; flush on unload/unmount; explicit-save supersedes pending autosave; enable/toggle semantics preserved (autosave-off writes `sfp:autosave`, autosave-on saves to library).
- `factory-url-sync`: hash ↔ active-section sync; pushState on factory switch; popstate restore with forward-stack preservation (push suppression); restore-on-mount priority chain URL → autosave → lastId; slug backfill (`ensureSlug`).
- `consent-gate`: `requireConsent(action)` pending-action state machine — execute immediately with consent, else prompt and replay on allow, drop on cancel.
- `library-ops`: pure import functions in `app/models/library-ops.ts` — migrate + fresh-id remapping preserving all cross-references (folder parent, supplier ids, nested factory ids), single-factory and library merge. (Transitional home; model M5 later folds it into storage/migrations. Extraction and tests carry over unchanged.)
- `factory-page-structure`: composition-root contract — `FactoryPage.tsx` ≤150 lines, hooks own all non-layout logic, `FactoryJsonDialog`/`SectionTabs` extracted, `useLibrary` owns library state + persistence, `useDragResize` owns sidebar divider drag + width persistence.

### Modified Capabilities

- `lib-utilities`: gains a requirement for `lib/filenames.ts` exporting `sanitizeFilename(name)` (the `name.replace(/[^a-z0-9]/gi, "_")` logic currently duplicated in FactoryComponent and FactoryLibraryDrawer); FactoryComponent's copy migrates here (the drawer's copy migrates in Phase 4a).

## Impact

- **Deleted:** `app/components/FactoryComponent.tsx` (replaced by `app/components/factory/FactoryPage.tsx` + hooks).
- **New dirs:** `app/hooks/`, `app/components/factory/`.
- **New dependency:** `valtio` (runtime).
- **Callers:** `app/page.tsx` (imports FactoryComponent today); `tests/integration/FactoryComponent.test.tsx` and any integration test mounting it; `history-base-path.test.tsx` (URL sync behavior).
- **Unchanged:** child component props/behavior (PlanningSection, OptimizationSection, LogisticsSection, FactoryOverviewComponent, FactoryHeader, FactoryLibraryDrawer receive the same props); storage keys/formats; URLs; all aria-labels/testids.
- **Risk areas per plan §6:** valtio snapshot-vs-proxy semantics (spike test on class-method reads through snapshots), URL/popstate edge cases (port existing invariant comments as test cases), autosave timing (fake-timer tests before call-site migration), solver proxy overhead (solver mutates plain objects; profile eager mode before/after).
