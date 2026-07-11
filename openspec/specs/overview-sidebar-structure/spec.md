# overview-sidebar-structure

## Purpose

Defines the structure of the factory overview sidebar: one composition root (`OverviewSidebar`) rendering six single-purpose section components, plus the shared `PowerSummary` power-consumption row reused by `AssemblyLineControls`.

## Requirements

### Requirement: R1 — single composition root
The overview sidebar SHALL be rendered by exactly one composition component, `app/components/overview/OverviewSidebar.tsx`. It SHALL render, in order: Outputs, Consumers (conditional), Inputs, Intermediate Parts, Power & Modules, Suppliers (conditional). `OverviewSidebar` renders the Power & Modules `CollapsibleSection` container directly and composes `PowerSummary` (R3) inside it alongside the Power Shards and Somersloop total rows; no separate `PowerModulesSection.tsx` file exists. `app/components/factory/FactorySidebar.tsx` is the sole import site of `OverviewSidebar`.

#### Scenario: R1.S1 — composition renders all sections
- **WHEN** `OverviewSidebar` mounts for a factory with outputs, inputs, intermediates, consumers, and suppliers all present
- **THEN** all six sections render, each backed by its own component (`OutputsSection`, `ConsumersSection`, `InputsSection`, `IntermediatesSection`, a Power & Modules `CollapsibleSection` composing `PowerSummary`, `SuppliersSection`)

#### Scenario: R1.S2 — conditional sections omitted correctly
- **WHEN** a factory has no consumers (`consumersByPartSlug` is empty) or no supplier factories (`factory.supplierFactories.length === 0`)
- **THEN** the Consumers or Suppliers `CollapsibleSection` (identified by its `label` prop, e.g. `"Consumers"` or `` `Suppliers (${count})` ``) is absent from the rendered output, verified via RTL `queryByText` returning null for that section's label. `HorizontalDivider` (`app/components/Dividers.tsx`) is a bare unlabeled `<div>` with no independent test signal, so its presence/absence is not separately asserted — the section label check alone confirms the section (and, by construction of `OverviewSidebar`'s conditional block, its adjacent divider) was not rendered.

#### Scenario: R1.S3 — import site
- **WHEN** `app/components/factory/FactorySidebar.tsx` is inspected
- **THEN** it imports `OverviewSidebar` from `app/components/overview/OverviewSidebar` and declares no `onRebuild` prop; `app/components/factory/FactoryPage.tsx` does not pass `onRebuild` to `FactorySidebar`

### Requirement: R2 — single-purpose section files
Each section (Outputs, Consumers, Inputs, Intermediates, Suppliers) SHALL live in its own file under `app/components/overview/`, exporting one component per file. Verified by review (per AGENTS.md's "one exported component per file" convention), not by an automated lint rule.

#### Scenario: R2.S1 — file boundaries
- **WHEN** the `app/components/overview/` directory is inspected
- **THEN** it contains `OverviewSidebar.tsx`, `OutputsSection.tsx`, `ConsumersSection.tsx`, `InputsSection.tsx`, `IntermediatesSection.tsx`, `PowerSummary.tsx`, `SuppliersSection.tsx`, and `PartRateSummary.tsx`, each exporting exactly one component as its default export

### Requirement: R3 — shared power summary row
The power-consumption display row — rendering an `Icon` plus, when min equals max within 0.01, `` `{avg} MW` ``, else two `<span>` elements (`` `{avg} MW avg` `` and `` `· {min}–{max} MW` ``) — SHALL have exactly one implementation, `app/components/overview/PowerSummary.tsx`. Its scope is the power-consumption row only — it does NOT include the Power Shards or Somersloop total rows, which remain section-specific. Call sites with differing prior DOM (icon size, alt text, single vs. two-span text) pass a `variant`/`iconSize`/`iconAlt` prop to reproduce their own exact output rather than being forced into one shared format.

#### Scenario: R3.S1 — overview usage
- **WHEN** the Power & Modules section renders a factory's total power via `getTotalPower(factory)`
- **THEN** it renders through `PowerSummary` with `variant="detailed"` (default): a two-span DOM, `text-sm` styling, 24px icon with `alt="Power"`

#### Scenario: R3.S2 — assembly-line-controls usage
- **WHEN** `AssemblyLineControls` renders an assembly line's power via `assemblyLine.getPowerConsumption()`
- **THEN** it renders through `PowerSummary` with `variant="compact"`, `iconSize={16}`, `iconAlt=""`: a single combined-text span, matching its pre-refactor DOM exactly

### Requirement: R4 — behavior freeze
This structure SHALL NOT alter observable behavior: aria-labels and `data-testid`s are stable; rate/percentage math (allocation bars, unused/unfulfilled amounts, supplier demand) is unchanged. `OverviewSidebar` takes no props (reads factory/library/navigation state from context). `PartRateSummary`'s prop signature (`part`, `rate`, `highlight?`, `showDetail?`) is stable regardless of which directory it lives in.

#### Scenario: R4.S1 — suites green
- **WHEN** `npm run test:run` and `npm run test:e2e` run
- **THEN** all tests pass without any e2e selector depending on component file names

#### Scenario: R4.S2 — assertion parity
- **WHEN** an integration test renders `OverviewSidebar` for a fixed factory state and asserts on text content, icon `src`/`alt`, and allocation-bar width styles
- **THEN** every assertion matches the values the pre-split component produced for the same factory state
