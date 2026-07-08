## Context

Phase 2 (`decompose-factory-page`) landed a `FactoryPage` composition root that wraps the domain `Factory` in a valtio store (`storeRef.current = proxy({ factory })` in `useFactorySession`) and re-renders the whole tree via one root subscription: `useSnapshot(session.store).factory.rateLookup` (`FactoryPage.tsx:61`). Four values are still hand-drilled through up to five component levels: the `factory` proxy, the `StorageLibrary`, `currentFactoryId`, and `onNavigateToFactory`. Intermediate components (`FactorySections`, `FactorySidebar`, `PlanningSection`, …) restate and forward them; every model mutation reruns the solver, rebuilds `rateLookup`, trips the root snapshot, and re-renders the entire page.

Phase 3 replaces the drilling with three React contexts and pushes `useSnapshot` to the leaves so render scope = the fields a component actually reads. The `app-contexts` spec (R1–R8) and the `factory-page-structure` R7 delta are the contract. Constraints: zero observable behavior change (aria/testid/storage/URL frozen), no new runtime dependency (valtio already present), all suites + `npm run build` green.

Current facts that shape the design:
- `useFactorySession` owns the only `proxy(...)` call; `store` is `{ factory }` and `store.factory` is reassigned on load/new/clear.
- `useLibrary` holds `library` in `useState` (replaced **by reference** on mutation) and already exposes `useCallback`-stable mutators (`updatePartPointOverrides`, `reload`, `replaceLibrary`, `setLibrary`).
- `useFactoryPageFlows` returns **plain functions** (not memoized) — `handleNavigateToFactory` identity churns every render.
- `logistics/context.ts` already carries `{ onNavigateToFactory, actualSize }`; logistics nodes read it via `useLogistics()`.

## Goals / Non-Goals

**Goals:**
- Three provider seams mounted at `FactoryPage`: `FactoryContext` (stable store container), `LibraryContext` (`{ library, currentFactoryId, updatePartPointOverrides }`), `NavigationContext` (`{ navigateToFactory }`).
- Remove `library` / `currentFactoryId` / `onNavigateToFactory` (and current/top `factory`) from the props of the 13 listed components.
- Drop the root `rateLookup` trigger; each consumer snapshots the sub-object it renders; FactoryPage snapshots only `{ icon, solverError, productionLines.length }`.
- Referentially-stable provider values so a FactoryPage re-render does not fan out.
- Render-count integration test proving field-scoped re-render.

**Non-Goals:**
- Splitting the big-four components (Phase 4).
- Any model-layer change (`Factory`/`ProductionLine`/`AssemblyLine` untouched; solver untouched).
- New navigation semantics, new library mutators beyond what a migrated consumer needs.
- Nested-factory provider wiring — latent, not built (R7): no subtree today renders `useFactory()` leaves against a foreign factory.

## Decisions

**D1 — FactoryContext distributes the container `store`, not `store.factory`.**
Context value = the stable `storeRef.current` (`proxy({ factory })`). Rationale: `store.factory` is reassigned on every factory swap (load/new/clear), so distributing it churns the context value ref and risks a leaf holding a dead proxy between swap and re-provide. `store` is created once in `useRef` and never reassigned; `store.factory = loaded` is a *tracked mutation*, so `useSnapshot(store)` consumers re-render on swap for free. Alternative (distribute `store.factory`) rejected: matches the plan's loose "distribute the proxy" wording but re-introduces swap-timing fragility. `store` *is* a proxy, so the plan intent holds.

**D2 — Hook pair hides the container shape.**
`FactoryContext.tsx` exports `useFactory()` → `store.factory` (proxy, for writes/model calls) and `useFactorySnapshot()` → `useSnapshot(store).factory` (for render reads). Call sites never write `store.factory`. Rationale: a split read/write idiom that leaks `store.factory` into every leaf is the same stringly-typed coupling this phase removes. Alternative (single `useFactory()` returning `store`, callers destructure) rejected — leaks container shape to 13 files.

**D3 — Drop the root trigger; FactoryPage scope-snapshots its own fields.**
Remove `useSnapshot(session.store).factory.rateLookup`. FactoryPage takes `const snap = useFactorySnapshot()` and reads only `snap.icon`, `snap.solverError`, `snap.productionLines.length` (the fields its own JSX renders). Everything else it passes to children is the proxy (via provider) or stable callbacks. Rationale: as long as the root subscribes to `rateLookup` (rebuilt on every solver run), the parent re-renders on every edit and cascades to all children regardless of contexts — scoping is impossible until this read is gone. Leaves re-render through their own `useSnapshot(assemblyLine)` / `useSnapshot(productionLine)` because the solver's writes to those sub-objects are tracked.

**D4 — Provider values `useMemo`'d on reference identity; `navigateToFactory` ref-stabilized.**
`library` is replaced by-reference by `useLibrary`, `currentFactoryId` is a primitive → reference equality is the correct memo key, no deep-equality needed. `updatePartPointOverrides` is already `useCallback`-stable. `handleNavigateToFactory` is a churning plain function, so FactoryPage keeps a "latest ref": `navRef.current` is assigned **in a `useEffect`** (not in the render body — write-during-render is StrictMode-fragile), and the provided value is a stable wrapper `useCallback((id) => navRef.current(id), [])`. The wrapper is only invoked from event handlers, by which time the effect has committed the current callback. Each provider `value` is `useMemo`'d on `[library, currentFactoryId, updatePartPointOverrides]` / `[stableNavigate]` / `[store]`. Rationale: without this, context value identity churns every render and every consumer re-renders — the version-counter problem relocated. (R5)

**D5 — Navigation is one seam; logistics keeps only `actualSize`.**
`NavigationContext` supplies `navigateToFactory`. `LogisticsContext` (`logistics/context.ts`) drops `onNavigateToFactory` from `LogisticsCallbacks`, retaining `actualSize`; logistics nodes (`AssemblyLineNode`, `FactoryLinkNode`) switch from `useLogistics().onNavigateToFactory` to `useNavigation()`. Rationale: merging `actualSize` (a logistics rendering detail) into a global context leaks it app-wide; leaving nav drilled in logistics keeps the duplication. Alternative (fold both into NavigationContext) rejected.

**D6 — Hooks throw when used outside their provider (fail-fast).**
Contexts are created with an `undefined` sentinel default; each hook throws a named error if the value is undefined. This diverges from AGENTS.md's "lookups return undefined" convention, but that convention governs *data* lookups (part/recipe misses callers null-check); a missing context provider is a programmer wiring error with no sensible runtime fallback, and returning `undefined` only defers the crash to an opaque property access. Standard React-context idiom. (R1.S3; noted per spec-review residual.)

**D7 — `useFactory()` is nearest-provider; foreign factories stay data-only.**
Verified: `NestedFactoryRow`'s `factory` prop is the *current* factory (calls `factory.update()`); it renders the nested factory as a flat recipe row, not via leaf components. `PartRateSummary` and `FactoryPickerDialog` operate on the current factory or on deserialized library data used only for lookups/`onPick` payloads — none render `useFactory()` leaves against a foreign proxy. So no nested `FactoryContext.Provider` is built now; the rule (R7) forbids the future footgun. Any genuinely foreign `factory` prop is retained (R4).

## Risks / Trade-offs

- **Silent perf regression: unstable provider value re-fans-out** → D4 memoization + render-count integration test (R5.S1) is the tripwire; review enforces "no inline provider value objects."
- **Silent perf regression: a missed root read keeps whole-tree re-render** → R6.S2 asserts no `rateLookup` trigger remains; render-count test asserts an unaffected sibling does not re-render.
- **Correctness: a leaf reads `useFactory()` for foreign-factory data** → D7 audit done; R7/R7.S1/R7.S2 pin it; foreign `factory` stays an explicit prop.
- **Swap-timing stale proxy** → D1 container distribution eliminates the window.
- **Snapshot-vs-class-instance drift** (leaves now call methods like `getPartProductionRate` on snapshots) → guarded by the existing `factory-page-structure` R7.S2 snapshot-spike test, kept as a standing regression guard.
- **e2e selector fallout** → none expected: contexts change wiring, not DOM/aria/testid; R8.S1 requires zero selector edits.

## Migration Plan

Principle: **no double-supply.** A component is never left holding both a drilled prop and a context source — for each component, deleting the prop (interface + parent call site) and adding the context read happen in the **same commit**, so there is never an ambiguous precedence window. Between the root trigger and per-leaf snapshots there must always be a working re-render path (see step 4). Every batch ends green and bisectable.

1. **Contexts (inert).** Add the three modules under `app/contexts/` (providers + hooks + throw-on-missing-provider). No consumers yet. `npm run test:run` — nothing changed, still green.
2. **Mount providers + stabilize values.** In `FactoryPage`, mount all three providers around the layout, memoize provider values (D4), and add the ref-wrapped stable `navigateToFactory`. The **root `rateLookup` trigger stays** for now, so re-render behavior is unchanged and every child still updates. Existing drilled props remain passed. `npm run test:run` + `npm run test:e2e` — behavior identical.
3. **Migrate consumers in small batches, prop-swap per component.** Top-down (`FactorySections`/`FactorySidebar` → sections → leaves; logistics nodes swap `useLogistics().onNavigateToFactory` → `useNavigation()` and `LogisticsContext` drops the field; `ProductionTargetsBar` dead props deleted). Each component in a batch, in one commit: read context, delete the drilled prop from its interface **and** its parent's call site, and add its own `useSnapshot(subObject)` for any value it previously read off a now-removed proxy prop. Run `npm run test:run` after **each batch** (bisectable regressions), full `test:e2e` at least once mid-way. The root trigger still guarantees updates, so a not-yet-added leaf snapshot cannot silently stop updating during this step.
4. **Land the render-count tripwire, then drop the root trigger — same commit.** Add the render-count integration test (edited row re-renders, unaffected sibling + overview do not; R5.S1/R6.S1) and, in the same commit, remove FactoryPage's `rateLookup` trigger, replacing it with `{ icon, solverError, productionLines.length }` snapshot reads. The test is the tripwire: if any leaf lost its own subscription in step 3, dropping the trigger makes the test (or e2e) fail here instead of shipping a stale-leaf bug. `npm run test:run` + `npm run test:e2e`.
5. **Final gate.** Full `npm run test:run`, `npm run test:e2e`, `npm run build` clean; confirm zero e2e selector edits (R8.S1).

Rollback: the change is additive-then-substitutive and behavior-frozen; revert the branch (or the offending batch commit — each is independently green). No data/storage/URL migration, so no persisted-state rollback concern.

## Open Questions

None blocking. Resolved residuals from spec-review: (a) throw-on-missing-provider vs return-undefined → D6 (throw, with rationale); (b) snapshot-spike test not named in proposal → kept as behavior-freeze guard, not new behavior, per `factory-page-structure` R7.S2.
