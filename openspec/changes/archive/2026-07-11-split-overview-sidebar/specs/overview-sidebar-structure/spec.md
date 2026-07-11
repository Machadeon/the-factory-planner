# overview-sidebar-structure

## ADDED Requirements

### Requirement: R1 — single composition root
The overview sidebar SHALL be rendered by exactly one composition component, `app/components/overview/OverviewSidebar.tsx`, which replaces `FactoryOverviewComponent.tsx`. It SHALL render, in order: Outputs, Consumers (conditional), Inputs, Intermediate Parts, Power & Modules, Suppliers (conditional) — matching today's section order. `OverviewSidebar` renders the Power & Modules `CollapsibleSection` container directly (as `FactoryOverviewComponent` does today) and composes `PowerSummary` (R3) inside it alongside the Power Shards and Somersloop total rows; no separate `PowerModulesSection.tsx` file is created. `app/components/factory/FactorySidebar.tsx`, the sole current import site of `FactoryOverviewComponent`, SHALL import `OverviewSidebar` from `app/components/overview/OverviewSidebar.tsx` instead.

#### Scenario: R1.S1 — composition renders all sections
- **WHEN** `OverviewSidebar` mounts for a factory with outputs, inputs, intermediates, consumers, and suppliers all present
- **THEN** all six sections render, each backed by its own component (`OutputsSection`, `ConsumersSection`, `InputsSection`, `IntermediatesSection`, a Power & Modules `CollapsibleSection` composing `PowerSummary`, `SuppliersSection`)

#### Scenario: R1.S2 — conditional sections omitted correctly
- **WHEN** a factory has no consumers (`consumersByPartSlug` is empty) or no supplier factories (`factory.supplierFactories.length === 0`)
- **THEN** the Consumers or Suppliers `CollapsibleSection` (identified by its `label` prop, e.g. `"Consumers"` or `` `Suppliers (${count})` ``) is absent from the rendered output, verified via RTL `queryByText` returning null for that section's label. `HorizontalDivider` (`app/components/Dividers.tsx`) is a bare unlabeled `<div>` with no independent test signal, so its presence/absence is not separately asserted — the section label check alone confirms the section (and, by construction of `OverviewSidebar`'s conditional block, its adjacent divider) was not rendered.

#### Scenario: R1.S3 — import site updated
- **WHEN** `app/components/factory/FactorySidebar.tsx` is inspected after the change
- **THEN** it imports `OverviewSidebar` from `app/components/overview/OverviewSidebar`, no longer references `FactoryOverviewComponent`, and no longer declares or accepts an `onRebuild` prop (dead now that `OverviewSidebar` drops it per R4); `app/components/factory/FactoryPage.tsx` no longer passes `onRebuild={session.rebuild}` to `FactorySidebar`

### Requirement: R2 — single-purpose section files
Each section (Outputs, Consumers, Inputs, Intermediates, Suppliers) SHALL live in its own file under `app/components/overview/`, exporting one component per file. Verified by review (per AGENTS.md's "one exported component per file" convention), not by an automated lint rule.

#### Scenario: R2.S1 — file boundaries
- **WHEN** the `app/components/overview/` directory is inspected
- **THEN** it contains `OverviewSidebar.tsx`, `OutputsSection.tsx`, `ConsumersSection.tsx`, `InputsSection.tsx`, `IntermediatesSection.tsx`, `PowerSummary.tsx`, `SuppliersSection.tsx`, and `PartRateSummary.tsx`, each exporting exactly one component as its default export

### Requirement: R3 — shared power summary row
The power-consumption display row — rendering an `Icon` plus, when min equals max within 0.01, `` `{avg} MW` ``, else two `<span>` elements equivalent to today's `` `{avg} MW avg` `` and `` `· {min}–{max} MW` `` — SHALL have exactly one implementation, `app/components/overview/PowerSummary.tsx`. Its scope is the power-consumption row only — it does NOT include the Power Shards or Somersloop total rows, which remain section-specific (rendered inline in `OverviewSidebar`'s Power & Modules block, and in `AssemblyLineControls`, respectively, per proposal.md scope).

#### Scenario: R3.S1 — overview usage
- **WHEN** the Power & Modules section renders a factory's total power via `getTotalPower(factory)`
- **THEN** it renders through `PowerSummary`, reproducing the current two-span DOM (single `{avg} MW` span when not variable; `{avg} MW avg` span plus `· {min}–{max} MW` span when variable)

#### Scenario: R3.S2 — assembly-line-controls usage
- **WHEN** `AssemblyLineControls` renders an assembly line's power via `assemblyLine.getPowerConsumption()`
- **THEN** it renders through the same `PowerSummary` component with identical avg/min-max formatting rules, replacing its current inline JSX block (lines 179-200)

### Requirement: R4 — behavior freeze
This change SHALL NOT alter observable behavior: all aria-labels and `data-testid`s are unchanged; rate/percentage math (allocation bars, unused/unfulfilled amounts, supplier demand) is unchanged; the full unit, integration, and e2e suites pass; `npm run build` is clean. `FactoryOverviewComponent`'s unused `onRebuild?: () => void` prop is dropped — `OverviewSidebar` takes no props (it reads factory/library/navigation state from context, as `FactoryOverviewComponent` already does). Because the prop is dropped at the leaf, the entire now-dead pass-through chain is removed with it: `FactorySidebar`'s `onRebuild` prop (and its `FactorySidebarProps` interface entry) and `FactoryPage`'s `onRebuild={session.rebuild}` call site are deleted (see R1.S3). `PartRateSummary`'s prop signature (`part`, `rate`, `highlight?`, `showDetail?`) is unchanged by its move into `overview/`. No other component prop contracts change.

#### Scenario: R4.S1 — suites green
- **WHEN** `npm run test:run` and `npm run test:e2e` run after the change
- **THEN** all tests pass without modifying any e2e selector; `tests/integration/FactoryOverviewComponent.test.tsx` is renamed to `tests/integration/overview/OverviewSidebar.test.tsx` (updated to import and render `OverviewSidebar`) and `tests/e2e/overview/sidebar-section-visibility.spec.ts` continues to pass unmodified (it drives the page via aria-labels/testids, not component names)

#### Scenario: R4.S2 — assertion parity
- **WHEN** an integration test renders `OverviewSidebar` for a fixed factory state and asserts on text content (via RTL `getByText`), icon `src`/`alt` (via `getByAltText`/DOM query), and allocation-bar width styles, comparing against the same assertions run against `FactoryOverviewComponent` before the change
- **THEN** every assertion produces the same value
