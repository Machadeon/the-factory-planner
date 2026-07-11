## Why

`FactoryOverviewComponent.tsx` (343 lines) owns six unrelated concerns in one file: outputs list, consumers-with-allocation-bar, inputs list, intermediates list, power/shards/sloops summary, and suppliers list — plus an inline `consumersByPartSlug` derivation that duplicates `deriveConsumers` already implemented in `app/components/logistics/graph-model.ts`. This is Phase 4 item 4 of `plans/component-refactor.md`: split the remaining big-four components into single-purpose files per the target architecture (§3) now that Phases 1–3 (UI primitives, hooks, contexts) and model M1 (`assembly-line.ts` `shardsForClock`/`totalMachines`) have landed.

## What Changes

- Split `FactoryOverviewComponent.tsx` into `app/components/overview/`:
  - `OverviewSidebar.tsx` — composition root (was `FactoryOverviewComponent`), renders the six sections in order.
  - `OutputsSection.tsx` — primary/byproduct output list.
  - `ConsumersSection.tsx` — per-output consumer allocation bars, uses hoisted `deriveConsumers`.
  - `InputsSection.tsx` — raw input list.
  - `IntermediatesSection.tsx` — intermediate part list.
  - `PowerSummary.tsx` — shared power-consumption row (avg or min–max MW), consumed by both the overview's Power & Modules section and `AssemblyLineControls.tsx` (replacing each file's own inline power-row JSX).
  - `SuppliersSection.tsx` — supplier factory list with remove action.
- Move `PartRateSummary.tsx` into `app/components/overview/` (it is overview-only today; no other importers).
- Hoist `deriveConsumers` (currently duplicated: inline in `FactoryOverviewComponent` and exported from `logistics/graph-model.ts`) into `app/models/consumer-links.ts` as the single implementation. Both `logistics/graph-model.ts` and the new `ConsumersSection.tsx` import from there.
- No behavior change: same DOM structure, same aria-labels/`data-testid`s, same rate math, same collapsible defaults.

## Capabilities

### New Capabilities
- `overview-sidebar-structure`: the overview sidebar is composed of single-purpose section components under `app/components/overview/`, each independently testable, with a behavior-freeze contract (same DOM/aria/testids/rate math as today).
- `consumer-links`: `deriveConsumers` (factory → per-output-part consumer list) has exactly one implementation, in `app/models/consumer-links.ts`, used by both the overview's Consumers section and the logistics graph model — no duplicated derivation logic.

### Modified Capabilities
(none — no existing spec folder covers overview rendering or consumer derivation today; both are new capability specs)

## Impact

- **Affected files:**
  - `app/components/FactoryOverviewComponent.tsx` → deleted, replaced by `app/components/overview/*.tsx`
  - `app/components/PartRateSummary.tsx` → moved to `app/components/overview/PartRateSummary.tsx`
  - `app/components/AssemblyLineControls.tsx` → power row swapped for shared `overview/PowerSummary.tsx`
  - `app/components/logistics/graph-model.ts` → `deriveConsumers` removed, imported from `app/models/consumer-links.ts` instead
  - New: `app/models/consumer-links.ts`
  - Any import site of `FactoryOverviewComponent` or `PartRateSummary` (e.g. the factory page/section composition) updated to new paths
- **Tests:** existing unit tests for `deriveConsumers`-equivalent logic (if any under `logistics/graph-model` tests) move/adapt to `consumer-links.ts`; new unit test for `consumer-links.ts` if none exists; integration test coverage for overview sections preserved under new file paths; no e2e selector changes expected (aria-labels/testids frozen).
- **No dependency changes.**
