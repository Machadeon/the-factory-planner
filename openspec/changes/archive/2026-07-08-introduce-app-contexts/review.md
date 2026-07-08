## Pass 1 — 2026-07-08

**Source: Reviewer**

**Status: APPROVED**

Full diff `main...HEAD` reviewed for context-migration + render-scoping correctness. No CRITICAL/HIGH findings. Suites (446 unit+integration, 93 e2e) green, zero e2e selector edits, build clean — independently consistent with the diff.

### Findings

app/contexts/FactoryContext.tsx:29-56: ✓ OK: stable container distributed (not `store.factory`); `useFactory()` returns proxy for writes, `useFactorySnapshot()` returns snapshot for reads; both throw on missing provider. `useFactoryUpdateSubscription()` subscribes to `rateLookup` for subtree cascade. Matches R1/D1/D2.

app/components/factory/FactoryPage.tsx:71-75: ✓ OK: `navRef` assigned in `useEffect`, stable wrapper `useCallback((id) => navRef.current(id), [])`; only invoked from event handlers post-commit. Matches design D4. Root `rateLookup` trigger removed; scoped snapshot reads `icon`/`solverError`/`productionLines.length` (lines 66,116,135,140).

app/contexts/LibraryContext.tsx:24-27 / NavigationContext.tsx:17: ✓ OK: both provider values `useMemo`'d on reference-identity deps. R5 satisfied.

Render-scoping (staleness sweep): every factory-reading component is either one of the four subscribed sections (`PlanningSection`, `OptimizationSection`, `FactoryOverviewComponent`, `LogisticsSection` — each calls `useFactoryUpdateSubscription()`) or a cascade descendant of one; `FactoryPage`'s own scoped snapshot covers its three fields. No leaf takes its own `useSnapshot` and none is wrapped in `React.memo`, so the section→leaf cascade re-render path is intact — no display component can go stale after root-trigger removal. Confirmed via grep: only the 4 sections subscribe; no `memo(` on any migrated leaf.

tests/integration/contexts/render-scope.test.tsx:36-90: ⚠ MED: the render-count probes call `useFactorySnapshot()` directly (per-leaf snapshot), but the shipped leaves (`ProductionLineComponent`/`AssemblyLineComponent`/`PartRateSummary`) do NOT — they read `useFactory()` and re-render by cascade from a section's `useFactoryUpdateSubscription()` (which subscribes to `rateLookup`, rebuilt on every mutation). So editing one row in the real tree re-renders the whole planning subtree, not just that row. This is correct per R6 ("field-scoped, never a fixed one-row count") and matches design D3, but the test demonstrates a finer isolation than the actual component tree achieves. Not a bug; consider a probe that mirrors the section-cascade shape so the test's guarantee matches shipped granularity, or a comment noting the divergence.

app/components/RecipeOptimizerPanel.tsx:251,261,578 & app/components/FactoryOverviewComponent.tsx:57: ⚠ LOW: dead defensive `if (!library)` / `library &&` guards remain although `library` is now a non-optional `StorageLibrary` from `useLibraryContext()` (always present). Harmless but inconsistent with the `library &&` guard removals done in `PartRateSummary`. (In FactoryOverviewComponent:57 the `currentFactoryId &&` half is still live — id can be null — only `&& library` is dead.)

app/components/LogisticsSection.tsx:44-46: ⚠ LOW: internal `GraphProps` still declares `library?`/`currentFactoryId?` as optional props, now sourced from context in the exported component and threaded to the internal `Graph`. Acceptable (internal sub-component, not one of the 13 migrated public interfaces) but the `?` optionality is now vestigial since the caller always supplies them.

app/components/logistics/AssemblyLineNode.tsx:130: ✓ OK: guard changed from `isFactory && onNavigateToFactory ?` to `isFactory ?` — `navigateToFactory` is always present from context, so behavior is unchanged in the real app (matches coordinator's stated expectation). Same for FactoryLinkNode:24 (`navigateToFactory(...)` unconditional).

Dead-code / stale-forward sweep: ✓ OK. `onNavigateToFactory` fully removed from app code (only in NavigationContext); no `rateLookup` trigger in FactoryPage; `onUpdateLibrary` remains only on `PointValuesPanel` (a non-migrated internal leaf) fed by `updatePartPointOverrides` from context — the intended terminal consumer. FactorySections/FactorySidebar dropped all four props and their now-unused type imports. No stale `library`/`currentFactoryId` props on migrated leaves.

Behavior freeze: ✓ OK. No aria-label/testid/storage/URL changes in the diff; `FactoryPickerDialog` candidates stay data-only (passed via `onPick`, never rendered through `useFactory()` leaves — R7.S2); `NestedFactoryRow` uses `useFactory()` + `useNavigation()` with no foreign-factory inherit (R7.S1).

### Summary
Migration is correct and complete. The four subscribed sections + cascade guarantee no stale display; contexts, memoization, and nav stabilization all match the design. Only non-blocking items: one MED test-realism note (render-scope probes isolate finer than the shipped tree) and two LOW dead-guard/vestigial-optionality cleanups.
