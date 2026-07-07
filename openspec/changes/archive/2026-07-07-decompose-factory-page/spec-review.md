<!-- Append-only. Each review pass adds a new ## Pass N section. Never delete or edit previous passes. -->

## Pass 1 — 2026-07-06

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass
(first pass: empty)

### Findings
- factory-session/spec.md [R1] — "the only place a Factory instance is created or swapped" is overbroad; deserialization and nested-factory handling construct Factory instances outside the hook. fix: scope claim to "the session's Factory store is created/swapped only here".
- factory-session/spec.md [R5] — contradicts factory-url-sync R1: R5 mandates dirty=false and slug backfill unconditionally, url-sync says autosave restore sets dirty=true and skips backfill, but R5's `loadSerialized(sf, lib)` signature has no way to express that. fix: add an options parameter (or explicit exception clause) to R5 and reference it from url-sync R1.
- factory-session/spec.md [R5] — slug persist and current-factory-id persist are storage writes stated unconditionally; no-consent path unspecified and conflicts with library-ops R5.S1 (load without persisting). fix: state consent gating for the persistence steps inside loadSerialized.
- factory-session/spec.md [R6] — missing edge case: proxy writes during loadSerialized/`_updateRates` will fire `subscribe` and could mark a fresh load dirty; also unclear whether subscription survives the factory swap. fix: add scenario "load completes → session not dirty despite restore-time proxy writes" and state re-subscribe behavior on swap.
- factory-autosave/spec.md [R1] — normal debounce-expiry write target unspecified; only flush (R3) says library-save vs autosave-slot. fix: state that timer expiry follows the same enabled→doSave / disabled→writeAutosave rule.
- factory-autosave/spec.md [R4] — requirement names beforeunload but only unmount has a scenario. fix: add a beforeunload flush scenario.
- factory-autosave/spec.md [missing] — pending timer across factory load/clear unspecified: a stale timer could write the old factory after the session swaps. fix: add requirement that load/clear cancels (or flushes) the pending timer.
- factory-url-sync/spec.md [R1] — URL param present but slug/id unresolved in library: unspecified whether restore falls through to autosave/lastId or starts fresh. fix: add scenario.
- factory-url-sync/spec.md [R4] — popstate with history-state factoryId absent from the library (factory deleted): behavior unspecified. fix: add scenario (fall through to URL params / fresh).
- consent-gate/spec.md [R1] — second `requireConsent(action)` while the dialog is already open with a pending action: replace, queue, or ignore is unspecified. fix: add scenario stating the rule (today: replace).
- library-ops/spec.md [R2] — "pass through unchanged (supplierIds/nestedFactoryId) or null out (parentId/folderId ... `?? null` / passthrough)" is ambiguous about which field gets which semantics. fix: state per-field: parentId → null, folderId → ?, supplierIds/nestedFactoryId → passthrough.
- library-ops/spec.md [R3] — "unusable-safe (caller loads nothing)" is vague; unspecified whether the merged library is still persisted when the root cannot be resolved. fix: define the merge result and persistence expectation for the no-root case.
- library-ops/spec.md [R5] — text covers library-import-without-consent (`requireConsent("openLibrary")`, nothing merges) but no scenario exercises it. fix: add scenario.
- factory-page-structure/spec.md [R2] — "one hook per commit" is process guidance, not testable system behavior; doesn't belong in a spec requirement. fix: move to tasks.md.

## Pass 2 — 2026-07-06

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass
- factory-session R1 overbroad "only place a Factory is created" — resolved: scoped to the session store; instances built by deserialization/nested-factory handling explicitly excluded.
- factory-session R5 vs factory-url-sync R1 contradiction — resolved: `loadSerialized(sf, lib, opts?)` gained `markDirty`/`backfillSlug`/`persistCurrentId` options with defaults; url-sync R1 now names the exact options the autosave call site passes; new R5.S3 scenario covers the option path.
- factory-session R5 consent gating of persistence writes — resolved: writes declared unconditional matching today's call sites (storage-service does not self-check consent); library-ops R5.S1 amended to state loadSerialized's own writes still occur, eliminating the cross-spec conflict.
- factory-session R6 restore-time dirty / re-subscribe — resolved: R6 text states restore-time proxy writes must not dirty and the subscription follows the swap; new R6.S3 scenario covers both.
- factory-autosave R1 expiry write target — resolved: R1 text states expiry follows the R3 rule; new R1.S2 scenario.
- factory-autosave R4 beforeunload scenario — resolved: new R4.S2.
- factory-autosave stale timer across load/clear — resolved: new R7 with R7.S1 (load cancels pending timer).
- factory-url-sync R1 unresolvable URL param — resolved: new R1.S5 (falls through to autosave → lastId → fresh).
- factory-url-sync R4 popstate to deleted factory — resolved: new R4.S4 (session left untouched, matching today's skip branches).
- consent-gate R1 re-entrant requireConsent — resolved: new R1.S3 (replace pending action, allow executes only the latest).
- library-ops R2 dangling-reference semantics — resolved: per-field rules stated (parentId → null, folderId → null, supplierIds/nestedFactoryId → passthrough).
- library-ops R3 "unusable-safe" — resolved: no-root now defined as import failed, nothing persisted, nothing loaded.
- library-ops R5 library-import-without-consent scenario — resolved: new R5.S3.
- factory-page-structure R2 commit-granularity process rule — resolved: dropped from the requirement, deferred to tasks.md.

### Findings
(none)

## Pass 3 — 2026-07-06

**Source: Reviewer** (scope: verify the R1/R6 container amendment in factory-session/spec.md, made to resolve design-review Pass 1 finding [D2 vs factory-session R1])

**Status: CONCERNS**

### Resolved from Previous Pass
- factory-session R1 + R1.S1 — verified: now specify the `proxy({ factory })` container created once, swap of the container's `factory` field as a tracked write, observability via `subscribe` on the container; scoped-creation and no-`setVersion` clauses intact. Matches design D2.
- factory-session R6 (last sentence) — verified: subscription attaches once to the container and survives swaps, replacing the re-subscribe wording; R6.S3 unchanged and still consistent.

### Findings
- factory-session/spec.md [R2] — stale after the R1 amendment: "subscribe via one root `useSnapshot(factory)` and render children from it" contradicts the container store and the agreed design D7 resolution (snapshot is a re-render trigger only; children receive the proxy, no snapshot objects cross component boundaries this phase). fix: reword R2 to `useSnapshot(store)` as trigger-only and state children receive the proxy.
- factory-session/spec.md [R6] — first sentence still says "driven by valtio `subscribe(factory, …)`" while the amended last sentence attaches the subscription to the container. fix: change to `subscribe(store, …)` for internal consistency.

## Pass 4 — 2026-07-06

**Source: Reviewer** (scope: verify the R2/R6 rewording in factory-session/spec.md from Pass 3)

**Status: APPROVED**

### Resolved from Previous Pass
- factory-session R2 — verified: retitled "root snapshot as re-render trigger"; `useSnapshot` called once on the proxy container as a trigger only, children receive the proxy (`store.factory` and objects reached through it), not snapshot objects; mutations never through a snapshot. Consistent with R1's container shape and design D7.
- factory-session R6 — verified: first sentence now "driven by valtio `subscribe` on the proxy container", consistent with the attach-once-to-container sentence; R6.S1–S3 unchanged and still coherent.

### Findings
(none)

## Pass 5 — 2026-07-06

**Source: Reviewer** (scope: verify the factory-autosave R1 and factory-page-structure R1 amendments made to resolve implementation review.md Pass 1 findings)

**Status: APPROVED**

### Resolved from Previous Pass
- factory-autosave R1 — verified: the ban is now scoped to the component-level state-mirroring machinery "as they existed in FactoryComponent" (refs mirroring React state because closures escaped the render cycle), with hook-internal latest-callback refs explicitly accepted as an implementation detail. Matches the built `useAutosave`/`useFactoryUrlSync`/FactoryPage refs; R1.S1–S3 unchanged and still testable.
- factory-page-structure R1 — verified: MAY clauses added for the colocated `useFactoryPageFlows` hook and the four thin passthrough layout components (`FactoryPageDialogs`, `FactorySections`, `FactorySidebar`, `LibraryDrawerSlot`), conditioned on child prop contracts staying frozen per R7. Matches the built files; R2's six-hooks-in-`app/hooks/` requirement remains accurate (flows hook lives under `components/factory/`).

### Findings
(none)
