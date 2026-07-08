## 1. Test Stubs

Write all stubs failing first (they reference contexts/components that don't yet exist or still drill props). Test-type per AGENTS.md: hook/pure logic → unit; component behavior + render-count → integration; full flows/selectors → e2e (reuse existing suite, no new selectors).

- [x] 1.1 Unit stub (`tests/unit/contexts/FactoryContext.test.tsx`): `useFactory()` / `useFactorySnapshot()` throw a clear error when rendered outside a provider (R1.S3).
- [x] 1.2 Integration stub (`tests/integration/contexts/factory-context.test.tsx`): with a provider, `useFactorySnapshot()` reads a field and mutating via `useFactory()` proxy updates the snapshot; after `store.factory = loaded` swap, consumers read the new factory and hold no dead ref (R1.S1, R1.S2).
- [x] 1.3 Integration stub: a consumer previously fed `library`/`currentFactoryId` props reads them from `useLibraryContext()`; `currentFactoryId === null` on fresh load behaves as today (R2.S1, R2.S2).
- [x] 1.4 Integration stub: navigation triggered from a planning row and a logistics node both call `useNavigation().navigateToFactory`; unknown/deleted id behaves identically to today; logistics `actualSize` still flows via `LogisticsContext` (R3.S1, R3.S2, R3.S3).
- [x] 1.5 Integration stub (`tests/integration/contexts/render-scope.test.tsx`): edit one local field → that row re-renders, an unaffected sibling row and unaffected overview sections do NOT (render-count probe) (R6.S1).
- [x] 1.6 Integration stub (render-count): a FactoryPage re-render with unchanged `library`/`currentFactoryId`/nav references does not re-render context-only consumers; replacing `library` by-reference re-renders `LibraryContext` consumers only (R5.S1, R5.S2).
- [x] 1.7 Integration stub (render-count): a solver-coupled edit re-renders every row whose rate changed and leaves solver-unaffected rows un-rendered (R6.S3).
- [x] 1.8 Integration stub: `FactoryPickerDialog` candidates are used as data only (outputs check / `onPick` payload), never rendered through `useFactory()` leaves (R7.S2).
- [x] 1.9 Structural stub (`tests/unit/contexts/prop-contract.test.ts` or source-scan): the 13 listed components' props interfaces declare none of `library`/`currentFactoryId`/`onNavigateToFactory`; remaining `factory` props are only foreign-factory ones; `ProductionTargetsBar` declares no `library`/`currentFactoryId`; `FactoryPage` contains no `rateLookup` whole-tree trigger (R4.S1, R6.S2, R7.S1, R8.S2, factory-page R7.S3).
- [x] 1.10 Verify existing snapshot-spike unit test still asserts `getMachineCount`/`getPartProductionRate` match via snapshot vs proxy; extend if leaves add new method-through-snapshot reads (factory-page-structure R7.S2).
- [x] 1.11 Integration stub (render-count): FactoryPage STILL re-renders when `productionLines.length`, `solverError`, or `icon` change after the root trigger is removed — the positive half of R6.S2 (its own scoped snapshot subscribes to those fields).
- [x] 1.12 Integration stub: rendering `NestedFactoryRow` and `PartRateSummary` for a nested/other factory shows that foreign data comes from an explicit prop/local and no descendant reads the parent factory via `useFactory()` for it — behavioral half of R7.S1 (complements the 1.9 prop-scan and 1.8 FactoryPickerDialog case).

## 2. Context modules (inert)

- [x] 2.1 Add `app/contexts/FactoryContext.tsx`: provider takes the store container; `useFactory()` → `store.factory` proxy, `useFactorySnapshot()` → `useSnapshot(store).factory`; both throw outside a provider (undefined sentinel default). No container-shape leak.
- [x] 2.2 Add `app/contexts/LibraryContext.tsx`: provides `{ library, currentFactoryId, updatePartPointOverrides }` via `useLibraryContext()`; throws outside provider.
- [x] 2.3 Add `app/contexts/NavigationContext.tsx`: provides `{ navigateToFactory }` via `useNavigation()`; throws outside provider.
- [x] 2.4 Run `npm run test:run` — contexts inert, existing suite unchanged; new unit stub 1.1 passes.

## 3. Mount providers + stabilize values (root trigger retained)

- [x] 3.1 In `FactoryPage`, mount all three providers around the layout. Memoize each `value` (`useMemo` on reference-identity deps: `[store]`, `[library, currentFactoryId, updatePartPointOverrides]`, `[stableNavigate]`).
- [x] 3.2 Add the ref-wrapped stable `navigateToFactory`: `navRef` assigned in a `useEffect`; wrapper `useCallback((id) => navRef.current(id), [])`.
- [x] 3.3 Keep the existing drilled props AND the root `rateLookup` trigger in place (behavior identical). Run `npm run test:run` + `npm run test:e2e` — green, no selector change.

## 4. Migrate consumers in batches (no double-supply; prop-swap per component in one commit)

- [x] 4.1 Batch A — layout: `FactorySections`, `FactorySidebar` read contexts; delete `factory`/`library`/`currentFactoryId`/`onNavigateToFactory` from their interfaces and FactoryPage call sites. `npm run test:run`.
- [x] 4.2 Batch B — section containers: `PlanningSection`, `OptimizationSection`, and `LogisticsSection` read `useLibraryContext`/`useNavigation`/`useFactorySnapshot`; delete ALL of `factory`/`library`/`currentFactoryId`/`onNavigateToFactory` from these three components' interfaces and their FactorySections call sites in one commit (LogisticsSection's full prop removal happens here — it does not span batches). `npm run test:run`.
- [x] 4.3 Batch C — logistics internals only (no LogisticsSection interface change): `AssemblyLineNode`/`FactoryLinkNode` switch `useLogistics().onNavigateToFactory` → `useNavigation()`; remove `onNavigateToFactory` from `LogisticsCallbacks` in `logistics/context.ts` (keep `actualSize`); `LogisticsSection` stops populating nav into its `LogisticsContext.Provider` value. `npm run test:run`.
- [x] 4.4 Batch D — planning leaves: `ProductionLineComponent`, `AssemblyLineComponent`, `NestedFactoryRow`, `PartRateSummary`, `FactoryPickerDialog` read contexts; each adds its own `useSnapshot(subObject)` for any value formerly read off a removed proxy prop; keep genuinely-foreign `factory` props (R7). `npm run test:run`.
- [x] 4.5 Batch E — overview + targets: `FactoryOverviewComponent`, `RecipeOptimizerPanel`, `ProductionTargetsBar` read contexts; delete `ProductionTargetsBar` dead `library`/`currentFactoryId` props. `npm run test:run` + `npm run test:e2e` mid-way.

## 5. Drop root trigger + land render-count tripwire (same commit)

- [ ] 5.1 Add the render-count integration tests (stubs 1.5–1.7 and 1.11) as real assertions.
- [ ] 5.2 In the SAME commit, remove FactoryPage's `useSnapshot(...).factory.rateLookup` trigger; replace with `const snap = useFactorySnapshot()` reading only `snap.icon`, `snap.solverError`, `snap.productionLines.length`.
- [ ] 5.3 Fix any leaf the tripwire/e2e exposes as having lost its subscription. `npm run test:run` + `npm run test:e2e`.

## 6. Verification

- [ ] 6.1 All structural/unit/integration stubs (1.1–1.12) implemented and passing.
- [ ] 6.2 `npm run test:run` green.
- [ ] 6.3 `npm run test:e2e` green; assert `git diff --stat` shows zero modified files under `tests/e2e/` — no selector edits (R8.S1, factory-page R7.S1).
- [ ] 6.4 `npm run lint-fix` clean; `npm run build` clean.
- [ ] 6.5 Lighthouse audit N/A (no visual surface changed — behavior frozen per R8); note in review.
