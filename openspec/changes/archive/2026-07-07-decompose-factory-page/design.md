# Design: decompose-factory-page

## Context

`FactoryComponent.tsx` (1,141 lines) is the app's root client component. It owns nine concerns (session state, autosave, URL sync, restore, consent, save/load/clear, import/export, sidebar resize, layout) glued together with six state-mirroring refs and a `factory.update` callback that couples the model layer to React (`setIsDirty` + version counter + autosave scheduling). Phase 1 delivered `app/lib/` + `components/ui/` primitives; M1/M2 cleaned the model layer (`downloadJson` in `lib/download`, solver/config/metrics split out of Factory). The plan (`plans/component-refactor.md` §Phase 2, §3 State pattern) mandates this phase to introduce valtio and dissolve the god component into hooks plus a ≤150-line composition root.

Constraints:

- Zero observable behavior change: e2e selectors, storage keys, URL formats frozen.
- Domain stays a mutable class graph (`Factory`/`ProductionLine`/`AssemblyLine`) — load-bearing for the LP solver.
- `factory.update` cannot be deleted yet (model files call it internally, `factory.ts:165,180,208…`); it becomes a recompute-only shim until model M4 removes it.
- Re-render behavior must stay whole-tree in this phase (one root `useSnapshot`); scoping arrives in Phase 3.

## Goals / Non-Goals

**Goals:**

- Six hooks under `app/hooks/`, each unit-testable via `renderHook` without mounting the page.
- One `loadSerialized(sf, lib, opts?)` restore path replacing four duplicated blocks.
- valtio proxy as the single Factory store; version counter deleted; autosave/dirty driven by `subscribe`.
- Pure import remapping in `models/library-ops.ts`; `sanitizeFilename` in `lib/filenames.ts`.
- `FactoryPage.tsx` ≤150 lines: hooks + handler wiring + layout only.

**Non-Goals:**

- No contexts (Phase 3), no fine-grained `useSnapshot` scoping (Phases 3–4), no child-component splitting (Phase 4), no `ref()` exemption of solver scratch state (model M4), no CRUD-orchestration move into `useLibrary` beyond what FactoryComponent itself does today (drawer's triple stays until Phase 4a).

## Decisions

### D1 — valtio over alternatives (settled by plan §3)

`proxy()` wraps the existing mutable class instances unmodified; `useSnapshot` gives per-property subscription later; `subscribe` gives a non-React seam for autosave/dirty. Redux/Zustand would force an immutable rewrite of the model graph — non-starters. MobX would work but demands decorators/`makeObservable` touching every model class; valtio needs zero model edits. Version pinned, `proxy`/`useSnapshot`/`subscribe`/`snapshot` are the only APIs used.

### D2 — store shape: `proxy({ factory })` container, not bare `proxy(factory)`

`useFactorySession` holds `const store = useRef(proxy({ factory: initialFactory }))`. Loading swaps `store.factory = deserialized` — a tracked write, so the root snapshot updates without re-subscribing per factory. `subscribe(store, cb)` survives factory swaps for free (session R6: one subscription on the container). Alternative — bare `proxy(new Factory())` swapped via `useState` — rejected: every swap would tear down/re-create subscriptions in effects, and autosave R7's stale-timer cancellation would need manual choreography across two hooks. Spec factory-session R1/R6 are worded to this container shape.

Hook filenames: camelCase matching the hook export (`app/hooks/useFactorySession.ts` …), per the plan §3 directory tree; this extends AGENTS.md's naming table, which is updated in Phase 5's sweep (hooks are neither components nor model/service files).

Session identity fields (name/id/slug/folder/createdAt) stay React `useState` inside `useFactorySession` — they're rendered by ordinary components and change rarely; only the factory graph needs valtio. `dirty` also stays React state, set by the subscribe callback (guarded: muted during `loadSerialized`, see D4).

### D3 — the update shim and mutation flow

The shim is assigned on the **raw Factory instance before proxying/swapping** (`raw.update = () => { raw._updateRates(); }` then `proxy({ factory: raw })` at mount, or `restored.update = …` then `store.factory = restored` on load) — so the assignment itself is never a tracked write and cannot fire the subscription at mount. `useFactorySession` is the sole assignment site (session R3). Model methods keep calling `this.update()` internally — unchanged. Because the factory is proxied after assignment, `_updateRates`'s rebuild of `rateLookup` etc. is a tracked write: React re-renders via the root snapshot, and `subscribe` fires for autosave/dirty. The old body's `setIsDirty`/`setVersion`/`scheduleAutosave` responsibilities move to the subscribe callback. Nothing in `app/components/` or `app/hooks/` may call or assign `factory.update` except this one site.

### D4 — restore muting (pinned mechanism)

`loadSerialized` and the clear path stay **synchronous**. Muting: set `muted.current = true`, perform the swap + `_updateRates` recompute, then `queueMicrotask(() => { muted.current = false; })`. valtio batches subscriber notification into a microtask queued on the first mutation; microtasks run FIFO, so the notify callback runs before our unmute and sees `muted === true` — deterministic, no async signature ripple into the mount-restore chain or popstate handler. The subscribe callback no-ops while muted (no dirty-marking, no autosave scheduling). Alternatives rejected: `subscribe(…, true)` (notifyInSync) fires per-op and would need muting anyway with more churn; filtering by ops paths is brittle against model-internal writes. Satisfies session R6.S3. A unit test asserts both halves: not dirty after load; dirty on next edit.

### D4b — single subscription owner

Exactly one `subscribe(store, cb)` exists, owned by `useFactorySession`. Its callback, when not muted: sets dirty and invokes registered mutation listeners. The session exposes `onFactoryMutate(listener): unsubscribe` — a mute-aware seam. `useAutosave` registers its debounce-scheduling through it (and receives `buildSerialized`/`doSave`/session-swap signals as props from the session API). The muted flag never leaves the session; useAutosave needs no knowledge of it.

### D5 — hook boundaries and dependency direction

```
useConsentGate   ← no deps (dialog state + pending action)
useLibrary       ← storage-service only (library state + persist-pairing mutators)
useDragResize    ← storage-service only (width state, clamp, persist-on-mouseup)
useFactorySession← useLibrary API (store, identity, dirty, loadSerialized, clear, save)
useAutosave      ← session API (onFactoryMutate seam, buildSerialized, doSave, swap signal)
useFactoryUrlSync← session + library APIs (mount restore, hash sync, push/popstate)
```

Extraction order = this dependency order (plan §Phase 2.2; url-sync last). `doSave` lives in `useFactorySession` (it mutates identity: first-save id/slug assignment, deleted-entry save-as-new) and is passed to `useAutosave`, which owns only the debounce/flush/enabled machinery. `buildSerialized` also lives in the session (needs identity fields). The state-mirroring refs die because each hook closes over its own current state — surviving refs are genuinely non-render state (debounce timer id, muted flag, url-sync's spec-mandated section-hash ref and suppress-push flag per R3/R4, drag-in-progress state) plus hook-internal latest-callback refs: hooks with mount-once listeners or timers (useAutosave, useFactoryUrlSync) keep their injected callbacks current via render-assigned refs, which is the standard React pattern for that shape, not the banned component-level state mirroring.

One dependency-direction inversion vs. the table above: useAutosave's `doSave` is wired to the page-level `performSave` (cancel pending → session.doSave → enable-on-first-save) through a render-assigned ref in FactoryPage, because performSave composes autosave's own `cancelPending`/`enableAutosave` with the session save. The seam direction (session → autosave for mutations) is unchanged; only the save composition flows page → autosave.

### D6 — library-ops API (pure)

```ts
remapImportedLibrary(data: StorageLibrary): { folders; factories; idMap }
mergeSingleFactory(current: StorageLibrary, data: SerializedFactory):
  { library: StorageLibrary; root?: SerializedFactory }
mergeLibrary(current: StorageLibrary, data: StorageLibrary):
  { library: StorageLibrary; root?: SerializedFactory }
```

No storage, React, or DOM imports (library-ops R1). FactoryPage's `handleImport` keeps the FileReader + JSON sniffing (`factories` key vs `productionLines`) and wires consent gating, persistence, and `loadSerialized` — exactly today's branch structure, minus the inline remapping.

### D7 — FactoryPage composition

`app/components/factory/FactoryPage.tsx` renders: `StorageConsentDialog`, two `FactoryLibraryDrawer` placements (pinned/unpinned), two `ConfirmDialog`s (unsaved-load, clear-confirm), `FactoryJsonDialog`, `FactoryHeader`, `SectionTabs`, section switch, resize divider, `FactoryOverviewComponent`.

To keep FactoryPage inside the ≤150-line contract, the flow choreography (save/load/new-clear dialogs, import/export, drawer open state, otherFactories memo) lives in a colocated hook `app/components/factory/useFactoryPageFlows.ts`, and the layout groups above are thin passthrough components in the same directory: `FactoryPageDialogs` (the four dialogs), `FactorySections` (the three-section switch), `FactorySidebar` (resize divider + overview; owns `useDragResize`), `LibraryDrawerSlot` (drawer placement). These are structure-only; every child listed above keeps its original prop contract. Root subscription: `useSnapshot(store)` is called once at the top of FactoryPage **as a re-render trigger only** — its return value is not passed down. Children receive the **proxy** (`store.factory` and objects reached through it), exactly the mutable instances they receive today, so their reads and model-method mutations keep working unchanged (props unchanged — R7 behavior freeze; no frozen-snapshot objects cross a component boundary in this phase). Fine-grained snapshot reads arrive in Phase 3. The `deserializedOtherFactories` memo and the `addProductionLine`/`removeProductionLine` wrappers live in `useFactoryPageFlows`; rebuild is the session-exposed `rebuild()` (`store.factory = new Factory(store.factory)` inside the hook, so R1's "swap only inside the hook" holds) passed straight through to the overview.

`SectionTabs` gets tabs + solver-error alert + the `activeSection` value/onChange props. `FactoryJsonDialog` gets `open/onClose/buildJson` props.

### D8 — hook tests

`tests/unit/hooks/` with `renderHook` (vitest + jsdom, `@testing-library/react`): fake-timer autosave debounce/flush against a real `proxy(new Factory())`; consent pending-action replay; restore priority chain with stubbed storage-service (localStorage jsdom); popstate suppress via dispatched `PopStateEvent`. The valtio snapshot spike test (page-structure R7.S2: `getMachineCount`/`getPartProductionRate` through `snapshot()`) lands first — it validates the architecture's core assumption before anything is migrated.

## Risks / Trade-offs

- [valtio snapshot breaks a class-method read (getter identity, private-field access)] → spike test first; escape hatch per plan §6: read via proxy + `subscribe` in the offending component; worst case `ref()` the sub-object.
- [subscribe fires for solver scratch mutations, causing spurious dirty/autosave] → solver mutates plain (non-proxied) model objects except `_applyRates` (plan §3); dirty-after-load guarded by D4 muting; e2e catches spurious dirty prompts.
- [Proxy overhead on solver-heavy eager mode] → profile eager optimizer before/after on a large factory; M4 `ref()`-exempts scratch if needed.
- [popstate/rAF suppress-push edge cases regress] → port the existing comments as unit tests before extraction (url-sync R4); `history-base-path.test.tsx` must pass unchanged.
- [Autosave timing drift (double-write or lost flush)] → useAutosave fake-timer tests land before FactoryComponent call sites migrate.
- [`beforeunload`-only flush is a known modern-web gap: it does not fire on mobile tab discard, and registering it can make the page ineligible for bfcache; current guidance prefers `pagehide`/`visibilitychange: hidden`] → accepted as frozen behavior this phase (behavior-freeze rule); logged as a candidate follow-up bug change per plan §5 "no mixed changes". Not silently re-blessed.
- [Muting window wrong (dirty after load, or missed first edit)] → R6.S3 test asserts both halves: not dirty after load, dirty after next edit.

## Migration Plan

Commit sequence (each green: `test:run` + build; e2e at milestones):

1. Spike: add valtio dep + snapshot spike test.
2. `lib/filenames.ts` + `models/library-ops.ts` + unit tests (pure extractions; FactoryComponent imports them).
3. `useConsentGate`, `useLibrary`, `useDragResize` — extract + tests, FactoryComponent consumes them.
4. `useFactorySession` + `useAutosave` in one commit (store, identity, loadSerialized, clear, doSave, shim, subscription seam, debounce/flush) + tests; FactoryComponent switches to both; version counter and ref machinery die here. One commit because splitting them leaves autosave driverless between the shim landing and the subscribe-based scheduler existing — an invisible regression window under unit-tests-only commit gates.
5. `useFactoryUrlSync` + tests.
6. `FactoryJsonDialog`, `SectionTabs`; rename to `factory/FactoryPage.tsx`; delete `FactoryComponent.tsx`; update `page.tsx` + integration tests; full e2e.

Rollback: each commit is independently revertable; the branch lands as one PR (repo convention).

## Open Questions

None blocking. Two things deferred by design: whether `useLibrary` mutators grow full CRUD (Phase 4a decides), and whether `factory.update` internal call sites move to explicit `_updateRates` calls (model M4's call).
