## 1. Test Stubs

- [x] 1.1 Write unit test stub `tests/unit/models/consumer-links.test.ts`: `deriveConsumers` returns empty `Map` when `library` is `undefined` or `currentFactoryId` is `null`/`undefined`/`""` (spec `consumer-links` R2.S1)
- [x] 1.2 Write unit test stub in the same file: net consumption exactly `RATE_EPSILON` is excluded; net just above `RATE_EPSILON` is included (spec `consumer-links` R2.S2)
- [x] 1.3 Rename `tests/integration/FactoryOverviewComponent.test.tsx` → `tests/integration/overview/OverviewSidebar.test.tsx`; update its render target to (not-yet-existing) `OverviewSidebar` — expect this stub to fail to compile/run until step 3 lands (spec `overview-sidebar-structure` R4.S1)
- [x] 1.4 In the renamed integration test, add a stub assertion that with outputs, inputs, intermediates, consumers, and suppliers all present, all six sections render (spec `overview-sidebar-structure` R1.S1)
- [x] 1.5 In the renamed integration test, add a stub assertion for conditional section omission: no consumers → `queryByText("Consumers")` is null; no suppliers → `queryByText(/^Suppliers/)` is null (spec `overview-sidebar-structure` R1.S2)
- [x] 1.6 In the renamed integration test, add a stub assertion for the `PowerSummary` two-span DOM: variable power renders `"{avg} MW avg"` and `"· {min}–{max} MW"` as separate text nodes; non-variable renders a single `"{avg} MW"` node (spec `overview-sidebar-structure` R3.S1)
- [x] 1.7 Add a stub assertion (same test file) that `AssemblyLineControls`'s power row renders through the same `PowerSummary` formatting (spec `overview-sidebar-structure` R3.S2) — can be a focused test in `tests/integration/AssemblyLineControls.test.tsx` if that file exists, else added inline
- [x] 1.8 Add a stub assertion comparing before/after render output for a fixed factory state — text content, icon `src`/`alt`, allocation-bar width styles — asserting parity between `OverviewSidebar` and the pre-refactor `FactoryOverviewComponent` baseline captured before deletion (spec `overview-sidebar-structure` R4.S2)
- [x] 1.9 Add a stub assertion for cross-leaf re-render: mutating a field one leaf section reads (e.g. toggling/removing a supplier) re-renders `OverviewSidebar`'s subtree and updates the affected section's output (design.md Migration Plan mitigation)
- [x] 1.10 Add a stub assertion confirming `FactorySidebar` no longer accepts/forwards an `onRebuild` prop (spec `overview-sidebar-structure` R1.S3, R4) — grep-based check or a type-level check acceptable if no existing test file covers `FactorySidebar` directly
- [x] 1.11 Add a structural stub (grep-based, alongside 7.3) asserting `app/components/logistics/graph-model.ts` no longer defines `deriveConsumers` locally (imports it instead) and `app/components/overview/ConsumersSection.tsx` contains no inline consumer-derivation loop (spec `consumer-links` R1.S1, R1.S2)

## 2. Hoist consumer-links

- [x] 2.1 Create `app/models/consumer-links.ts`: move `deriveConsumers` out of `app/components/logistics/graph-model.ts` verbatim (same signature, same body)
- [x] 2.2 Update `app/components/logistics/graph-model.ts` to import `deriveConsumers` from `../../models/consumer-links` instead of defining it
- [x] 2.3 Run `tests/unit/models/consumer-links.test.ts` (from 1.1/1.2) and existing `logistics/` tests — confirm green

## 3. Move PartRateSummary

- [x] 3.1 Move `app/components/PartRateSummary.tsx` → `app/components/overview/PartRateSummary.tsx` (no logic change)
- [x] 3.2 Update its one caller's import path

## 4. Extract leaf sections

- [x] 4.1 Create `app/components/overview/OutputsSection.tsx`: lift the Outputs `CollapsibleSection` block verbatim from `FactoryOverviewComponent.tsx`; read `factory`/output list via `useFactorySnapshot()`
- [x] 4.2 Create `app/components/overview/InputsSection.tsx`: lift the Inputs block verbatim; `useFactorySnapshot()`
- [x] 4.3 Create `app/components/overview/IntermediatesSection.tsx`: lift the Intermediate Parts block verbatim; `useFactorySnapshot()`
- [x] 4.4 Create `app/components/overview/SuppliersSection.tsx`: lift the Suppliers block verbatim; `useFactorySnapshot()` for reads, `useFactory()` for the `removeSupplier` write, `useNavigation()` for `navigateToFactory`
- [x] 4.5 Create `app/components/overview/ConsumersSection.tsx`: lift the Consumers JSX verbatim; rewrite its `consumersByPartSlug` `useMemo` body to call `deriveConsumers` from `app/models/consumer-links.ts` instead of the inline loop; `useFactorySnapshot()`, `useLibraryContext()`, `useNavigation()`
- [x] 4.6 None of the five section components declare a props interface (zero props; state read from context per design.md Decision 3)

## 5. Extract PowerSummary

- [x] 5.1 Create `app/components/overview/PowerSummary.tsx`: fragment containing an `Icon` plus one span (`"{avg} MW"`) or two spans (`"{avg} MW avg"`, `"· {min}–{max} MW"`) depending on `max - min > 0.01`; no wrapping element (design.md Decision 6)
- [x] 5.2 Wire `PowerSummary` into `OverviewSidebar`'s Power & Modules block (Shards/Somersloop rows stay inline, not moved into `PowerSummary`)
- [x] 5.3 Replace `AssemblyLineControls.tsx`'s inline power-row JSX (current lines ~179-200) with `PowerSummary`, preserving its existing `flex flex-row gap-x-1` wrapper

## 6. Composition root

- [x] 6.1 Create `app/components/overview/OverviewSidebar.tsx`: calls `useFactoryUpdateSubscription()` once at its root; renders `OutputsSection`, `ConsumersSection` (conditional), `HorizontalDivider`s, `InputsSection`, `IntermediatesSection`, Power & Modules block (using `PowerSummary`), `SuppliersSection` (conditional) — same order as today
- [x] 6.2 Confirm `OverviewSidebar` takes no props

## 7. Rewire import site, delete old file

- [x] 7.1 Update `app/components/factory/FactorySidebar.tsx`: import `OverviewSidebar` from `../overview/OverviewSidebar`; drop the `onRebuild` prop and `FactorySidebarProps` interface entry
- [x] 7.2 Update `app/components/factory/FactoryPage.tsx`: remove the `onRebuild={session.rebuild}` prop passed to `FactorySidebar`
- [x] 7.3 `grep -rn "FactoryOverviewComponent" app/ tests/` — confirm zero remaining references outside the file itself
- [x] 7.4 Delete `app/components/FactoryOverviewComponent.tsx`

## 8. Verification

- [x] 8.1 All unit/integration tests pass (`npm run test:run`)
- [x] 8.2 All E2E tests pass (`npm run test:e2e`)
- [x] 8.3 `npm run build` clean
- [x] 8.4 `npm run lint-fix` clean
- [x] 8.5 Lighthouse audit not required — no DOM/style change, no new page (design.md non-goal: no visual redesign)
- [x] 8.6 Review-verify `app/components/overview/` contains exactly `OverviewSidebar.tsx`, `OutputsSection.tsx`, `ConsumersSection.tsx`, `InputsSection.tsx`, `IntermediatesSection.tsx`, `PowerSummary.tsx`, `SuppliersSection.tsx`, `PartRateSummary.tsx`, each with exactly one default export (spec `overview-sidebar-structure` R2.S1 — review-verified per spec, not lint-enforced)
