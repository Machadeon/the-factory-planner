# Satisfactory Planner — Roadmap

Planned major changes, with notes on how each fits the existing domain model
(`Factory → ProductionLine → AssemblyLine → Recipe`) and state model (all state in `FactoryComponent`, mutations
committed via `factory.update()`).

---

## Testing Suite

**Stack:** Vitest + React Testing Library (unit + integration) · Playwright Test (E2E)

### Installation

```bash
npm install -D vitest @vitejs/plugin-react vite jsdom \
  @testing-library/react @testing-library/user-event @testing-library/jest-dom \
  @playwright/test
```

Replace the bare `playwright` devDependency with `@playwright/test`.

### Config files

**`vitest.config.ts`**
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

**`vitest.setup.ts`**
```ts
import '@testing-library/jest-dom'
```

**`playwright.config.ts`**
```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://localhost:3000' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
})
```

### npm scripts

```json
"test":     "vitest",
"test:run": "vitest run",
"test:e2e": "playwright test"
```

### Directory structure

```
tests/
  unit/
    models/
      assembly-line.test.ts
      production-line.test.ts
      factory.test.ts
      factory-recipe.test.ts
      storage-service.test.ts
    utils.test.ts
  integration/
    TextCalculatorField.test.tsx
    FactoryComponent.test.tsx
    AssemblyLineComponent.test.tsx
    FactoryOverviewComponent.test.tsx
  e2e/
    factory-workflow.spec.ts
    factory-library.spec.ts
    supply-chain.spec.ts
    import-export.spec.ts
```

### Unit tests (`tests/unit/`)

**`models/assembly-line.test.ts`**
- `getPartProductionRate()` — without sloops, with 1 slot, with max slots
- `getPartConsumptionRate()` — linear in rate, unaffected by sloops
- `setPartProductionRate()` / `setPartConsumptionRate()` — round-trip rate inversion
- `getMachineCount()` — `allowRemainder=false`: uniform clock; `allowRemainder=true`: remainder machine
- `getPowerConsumption()` — `(clock/100)^1.321928` exponent, sloop multiplier `(1+sloops/max)^2`
- `setSlooped()` — halves `rate` so `rate * quantity * 2` equals intended production rate

**`models/production-line.test.ts`**
- Constructor auto-creates one `AssemblyLine` when exactly one recipe exists
- Constructor skips auto-create with `suppressAutoRecipe=true` or multiple recipes
- `rate` reflects sum of all assembly line production rates for the part

**`models/factory.test.ts`**
- `_updateRates()` — sums consumption and production across all assembly lines
- `allOutputs()` / `allInputs()` / `allIntermediateParts()` — threshold 0.0001 edge cases
- `allInputs()` — accounts for supplier factory quantities before reporting deficit
- `autoCalculateRates()` LP scenarios:
  - Single recipe + fixed output → correct rate applied
  - Two recipes sharing an intermediate → LP balances intermediate to zero
  - Infeasible target → `solverError` set, rates zeroed
  - Recycled rubber/plastic circular loop → detected, skipped, warning logged
  - Solver returns `midpoint` field → rates applied from midpoint

**`models/factory-recipe.test.ts`**
- Factory net outputs become `products`; net inputs become `ingredients`
- `avgPowerPerInstance`, `shardsPerInstance`, `sloopsPerInstance` captured correctly

**`models/storage-service.test.ts`** (pure CRUD helpers only — no localStorage)
- `addFactory`, `updateFactory`, `removeFactory` — correct mutations, others untouched
- `addFolder`, `renameFolder`, `removeFolder`, `moveFactory` — tree mutations

**`utils.test.ts`**
- `calculate()` — `"60*2+30"` → 210, `"sqrt(144)"` → 12, `"min(30,60)"` → 30, invalid → error
- `displayNum()` — rounds to 1 decimal
- `getColorClassForProductionRate1/2` — correct Tailwind class for positive/negative/zero

### Integration tests (`tests/integration/`)

Mock `localStorage` via `vi.stubGlobal`. Use `@testing-library/user-event` for realistic input events.

**`TextCalculatorField.test.tsx`**
- Blur after `"60*3+30"` calls `onCalculate(210)`
- Invalid input shows error, does not fire `onCalculate`
- Escape resets to original value; Enter evaluates without blur

**`FactoryComponent.test.tsx`**
- Selecting a part adds a `ProductionLineComponent`
- Setting output rate triggers LP solve and updates displayed rates
- Expand all / collapse all toggles all rows

**`AssemblyLineComponent.test.tsx`**
- Clock speed slider updates `machineSpeed` and re-renders machine count
- Machine count input back-calculates clock speed
- Somersloop slider with `outputRate > 0` triggers LP solve

**`FactoryOverviewComponent.test.tsx`**
- All sections render for a factory with outputs, inputs, intermediates, and power
- Intermediate parts show producer/consumer breakdown (post task: intermediate parts display)
- Show/hide toggle per section (post task: section visibility toggles)

### E2E tests (`tests/e2e/`)

Run against `localhost:3000`. Reset storage between tests:
```ts
test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})
```

**`factory-workflow.spec.ts`**
1. Dismiss consent dialog, add Iron Plate, verify recipe auto-selected
2. Set output rate to 60, verify machine count and clock speed render
3. Add Iron Rod at 120/min; verify LP distributes shared Iron Ore input correctly
4. Verify Iron Ore appears in the Inputs section of the overview

**`factory-library.spec.ts`**
1. Name and save a factory; open library drawer; verify it appears
2. Open a new factory; reload the saved one; verify state restored

**`supply-chain.spec.ts`**
1. Create "Iron Factory" producing Iron Plates at 60/min, save
2. In a new factory, add Iron Plate; supply from "Iron Factory"
3. Verify allocation shown in the Suppliers section of the overview

**`import-export.spec.ts`**
1. Import `test-data/mega-factory.json`; verify production lines and rates match fixture
2. Export to JSON; re-import; verify round-trip state is identical

### Mocking notes

- **LP solver** — pure JS, deterministic, fast; run real in all unit tests, no mock needed
- **`library.tsx`** — loads `data.json` at module init; Vitest imports it via `resolveJsonModule: true` in tsconfig
- **`downloadJson()`** — creates a DOM `<a>` and triggers a click; mock `document.createElement` in integration tests; use `page.waitForEvent('download')` in E2E
- **`console.clear()`** in `autoCalculateRates()` — remove it (see Marie Kondo task) before writing LP unit tests to avoid wiping test output mid-run
- **Biome** — add `tests/**` to `biome.json` includes so lint runs on test files; `a11y` rules already disabled

---

## Backlog

Tasks grouped by feature area, with model and effort recommendations.

---

## Group 1: UI/UX Polish

**Model: Haiku · Effort: low–medium**
*Targeted UI changes with low blast radius — no LP logic, no data model changes. Each task touches 1–2 component files.*

### 1. Intermediate parts: show producers/consumers, remove clutter

**Files:** `app/components/FactoryOverviewComponent.tsx`, `app/components/PartRateSummary.tsx`

- In `FactoryOverviewComponent.tsx`, for each intermediate part iterate `factory._assemblyLineLookup[part.slug]` to collect assembly lines that produce or consume it. Show "Produced by: [recipe] @ X/min, Consumed by: [recipe] @ Y/min."
- Add a producers/consumers display mode to `PartRateSummary.tsx`. The `Rate` interface already has `productionRate` and `consumpionRate`; surface the per-recipe breakdown using `_assemblyLineLookup`.
- Suppress the net "+/-0/min" display for intermediate parts (net is always ≈0 by definition).
- Remove "Add production line" and "Supply from factory" buttons from `PartRateSummary` for intermediate parts. Add a `hideActions?: boolean` prop or gate on net rate not being negative.

Edge cases: use `displayNum()` and the same 0.0001 guard as `allIntermediateParts()`. `_assemblyLineLookup` is rebuilt on every `factory.update()` so it's always fresh.

### 2. View/hide toggle on all FactoryOverview sections

**Files:** `app/components/FactoryOverviewComponent.tsx`

- Add `useState` booleans for each section: `showOutputs`, `showInputs`, `showIntermediates` (already exists), `showConsumers`, `showPower`, `showSuppliers`. Default all `true`.
- Render `VisibilityIcon` / `VisibilityOffIcon` buttons in each section header — same pattern already used for Intermediate Parts.
- **When hidden, use `content-visibility: hidden` on the list wrapper instead of unmounting it** (`{ show && <List> }`). This keeps React state alive, skips browser layout/paint work while hidden, and re-shows instantly without a remount. Apply via MUI `sx={{ contentVisibility: show ? 'visible' : 'hidden' }}` or a Tailwind class. Add a `@supports` fallback to `display: none` for very old browsers.

Edge cases: Consumers and Suppliers are already conditionally rendered (only when `library` and `currentFactoryId` are present). The `content-visibility` toggle is an additional layer, not a replacement for that guard. Note: `content-visibility: hidden` removes the section from the accessibility tree while hidden — this is acceptable for a user-initiated toggle but verify with a screen reader.

### 3. Move expand/collapse all to a better location

**Files:** `app/components/FactoryComponent.tsx`

- Current location: a dedicated toolbar row between the header and the production line list.
- Move into `FactoryHeader` (right-aligned, near Save) or inline next to the "Add product" button.
- If moving into `FactoryHeader`: pass `onExpandAll` / `onCollapseAll` callbacks as props.
- Disable both buttons when `factory.productionLines.length === 0`.

### 4. Fix: "Set all equal" does not update clock speed slider and text input

**Files:** `app/components/AssemblyLineComponent.tsx`

- "All equal" sets `assemblyLine.machineSpeed` on all lines and calls `factory.update()`, but `ClockDisplay` holds local `useState` initialized from `assemblyLine.machineSpeed` without a sync effect.
- Add `useEffect(() => { setSpeed(assemblyLine.machineSpeed); }, [assemblyLine.machineSpeed])` inside `ClockDisplay`, or make the slider fully controlled by reading `assemblyLine.machineSpeed` directly.

Edge cases: slider fires `onChange` on every tick — verify the existing debounce/blur pattern still applies after the fix.

---

## Group 2: Performance

**Model: Sonnet · Effort: medium**
*Requires understanding React's memoization APIs and the rendering lifecycle. Root causes are clear but fixes must not break reactivity.*

### 5. Expand/collapse all is slow for large factories

**Files:** `app/components/FactoryComponent.tsx`, `app/components/ProductionLineComponent.tsx`

- **Root cause 1 — expensive per-render computation:** `ProductionLineComponent` computes `factoryCandidates` (calls `deserializeFactory` for every library factory) on every render, even when the factory picker is closed. Wrap in `useMemo(() => ..., [library.factories])` and gate behind `showFactoryPicker`.
- **Root cause 2 — synchronous cascade:** All `ProductionLineComponent`s re-render synchronously when `forceExpanded` changes. Wrap in `React.memo`; pass `forceExpanded` as a stable primitive (boolean/null).
- **Root cause 3 — layout reflow cascade:** When any row changes size, the browser reflows all sibling rows. Apply `content-visibility: auto` + `contain-intrinsic-size: auto none auto 120px` (estimated row height) to each `ProductionLineComponent` wrapper. This adds CSS containment boundaries so a mutation inside one row cannot trigger a global reflow. Visible rows still render normally; off-screen rows are skipped entirely.
- **Root cause 4 — animation cost:** Replace MUI `Collapse` with native CSS `@starting-style` + `transition-behavior: allow-discrete`. This moves expand/collapse animation off the JS thread entirely (GPU-accelerated). Define the collapsed state with `content-visibility: hidden`; the expanded state with `@starting-style` providing the from-values. Wrap `setForceExpanded` in `React.startTransition` as a secondary measure for the React re-render cascade.

```css
/* On the collapsible inner content div */
.assembly-lines {
  transition: opacity 0.2s ease-out, translate 0.15s ease-out;
  transition-behavior: allow-discrete;
  opacity: 1;
  translate: 0;
}
@starting-style {
  .assembly-lines { opacity: 0; translate: 0 -8px; }
}
.assembly-lines[data-collapsed] {
  display: none; opacity: 0; translate: 0 -8px;
}
@media (prefers-reduced-motion: reduce) {
  .assembly-lines { transition-duration: 0.05s; }
}
```

`@starting-style` is Baseline since Aug 2024 (Chrome 117+, Firefox 129+, Safari 17.5+). Fallback: elements toggle instantly — acceptable.

Edge cases: `React.memo` skips re-renders when props are referentially equal. Since `factory` is the same object reference between renders, pass `version` explicitly as a prop so `React.memo` sees the change after `factory.update()`. Verify keyboard navigation still reaches off-screen rows using `content-visibility: auto` (some AT configurations may exclude them until focused).

### 6. Memoize `deserializeFactory` in overview and dialogs

**Files:** `app/components/FactoryOverviewComponent.tsx`, `app/components/FactoryPickerDialog.tsx`

- `FactoryOverviewComponent`: Consumers section calls `deserializeFactory` for every library factory on every render. Wrap in `useMemo(() => ..., [library.factories, currentFactoryId])`.
- `FactoryPickerDialog`: same — wrap `candidates` computation in `useMemo`.
- Remove `console.clear()` from `autoCalculateRates()` in `factory.tsx` — it fires on every LP solve and wipes the dev console.

---

## Group 3: LP Solver / Optimization

**Model: Opus · Effort: high**
*Mistakes in constraint construction produce silently wrong results. Requires deep familiarity with the two-phase LP setup in `factory.tsx`. High blast radius — a bug affects every factory using auto-calculate.*

### 7. Add per-part constraints (max throughput, resource limits)

**Files:** `app/models/factory.tsx`, `app/components/FactoryOverviewComponent.tsx` (or new dialog)

- Add `constraints: { partSlug: string; max?: number; min?: number }[]` to `Factory`. Serialize/deserialize alongside `productionLines`.
- In `buildBaseConstraints()`, add LP row constraints per entry after intermediate and output constraints.
- For raw resource limits: constrain the part slug's LP coefficient ≤ user's availability.
- UI: "Constraints" section or button in `FactoryOverviewComponent`. Show each input/output part with optional min/max `TextCalculatorField`.
- **Dialog:** Prefer native `<dialog>` with the Invoker Commands API (`commandfor` / `command="show-modal"`) over MUI Dialog for this new constraints dialog. Load `invokers-polyfill` conditionally: `if (!('commandForElement' in HTMLButtonElement.prototype)) import('invokers-polyfill')`. This eliminates JS event-listener boilerplate and gives free focus management and `aria-expanded` handling. Invoker Commands is Baseline since Dec 2025; polyfill required for older browsers.

Edge cases: contradictory constraints make Phase 1 infeasible — Phase 2 catches it and sets `solverError`. Also fix the pre-existing bug where `solverError` is stored on `Factory` but never displayed in the UI.

### 8. Add "maximize output" mode for a production line

**Files:** `app/models/production-line.tsx`, `app/models/factory.tsx`, `app/components/ProductionLineComponent.tsx`

- Add `maximizeOutput: boolean` to `ProductionLine` (mutually exclusive with `outputRate > 0`).
- In `autoCalculateRates()`: when `pl.maximizeOutput === true`, add the part's LP column to the objective (maximize production) instead of a fixed `{ equal: rate }` constraint.
- Guard: if no resource constraints exist and `maximizeOutput` is set, emit `solverError` asking the user to set resource limits first (otherwise the LP is unbounded).
- UI: toggle in `ProductionLineComponent` header. Disable rate input when active; show solved rate as read-only.

Edge cases: multiple `maximizeOutput` lines → LP optimizes the sum, not each individually. Switching off resets `outputRate` to the last solved value (or 0).

### 9. Auto-production-line filler

See [plan:auto-recipe.md](plan:auto-recipe.md).

---

## Group 4: New Factory View Modes

**Model: Opus · Effort: high**
*Significant new architecture. Both items have high surface area and design decisions that ripple through the codebase.*

### 10. "Auto mode" / "lazy mode" factory builder

**Files:** `app/models/factory.tsx`, new `app/components/AutoFactoryComponent.tsx`

- Implement as a `mode: "manual" | "auto"` flag on `Factory` (reuses serialization and LP solver).
- In "auto" mode: user picks output parts + rates + recipe per part. LP fills intermediate lines. UI hides manual assembly-line controls.
- New `AutoFactoryComponent`: two-column view — left: "what do you want to make?" (part + rate pairs, recipe selector); right: `FactoryOverviewComponent`.
- Toggle in `FactoryHeader` to switch modes. Switching manual → auto is immediate; auto → manual prompts "This will lock the calculated factory. Continue?" — use native `<dialog>` with Invoker Commands API (same pattern as task 7) rather than MUI Dialog.
- Serialization: `mode` field in `SerializedFactory`; default `"manual"` for backwards compat.
- Store recipe selections as `{ partSlug: recipeSlug }` map on the factory.

### 11. Graphical view (nodes = assembly lines, edges = logistics)

**Files:** new `app/components/FactoryGraphView.tsx`, `app/components/FactoryComponent.tsx`

- Install `@xyflow/react` (React Flow) — interactive node-graph with custom node types.
- Map model to graph: `AssemblyLine` → node (recipe name, building icon, rate, machine count); part flows → edges (part name + rate); raw resource inputs → source nodes; factory outputs → sink nodes.
- Add "Graph view" toggle in `FactoryComponent`. `FactoryGraphView` replaces the production line list.
- Auto-layout via dagre or ELK adapter (ELK handles cycles better).
- Read-only initially; clicking a node navigates to that assembly line in list view.
- `FactoryRecipe` assembly lines render as special sub-factory nodes, clickable to navigate to the supplier.

Edge cases: cycles in intermediate parts — ELK preferred. Large factories (50+ nodes) — expose zoom controls and minimap (built into React Flow).

---

## Group 5: Refactoring & Housekeeping ✓ COMPLETE

**Model: Haiku · Effort: low (CLAUDE.md, component split) / medium (Marie Kondo)**

### 12. Component refactor: one component per file ✓

**Files:** `app/components/AssemblyLineComponent.tsx` → split

- ✓ Extract `NestedFactoryRow`, `ClockDisplay`, `MachineCountDisplay`, `AssemblyLineControls` into their own files under `app/components/`.
- ✓ Update imports in `AssemblyLineComponent.tsx`.
- ✓ Audit other files for multiple exported components and split similarly (no additional splits needed; `Dividers.tsx` and `TextCalculatorField.tsx` have related exports that should stay together).

### 13. Update CLAUDE.md ✓

- ✓ Add rule: "One component per file. Internal sub-components must be extracted to their own files in `app/components/`."
- ✓ Document `_assemblyLineLookup` and `_productionLineLookup` fast-access maps on `Factory`.

### 14. Marie Kondo refactor ✓

**Files:** `app/models/factory.tsx`, `app/components/FactoryOverviewComponent.tsx`, `app/components/PartRateSummary.tsx`

- ✓ **Remove `console.clear()`** from `autoCalculateRates()` — wipes the browser console on every LP solve.
- ✓ **Fix typo `consumpionRate` → `consumptionRate`** in the `Rate` interface and all usages. `Rate` is runtime-only (not serialized), so no data migration needed.
- ⊘ **Memoize `deserializeFactory` calls** — deferred to Group 2, task 6 (overlaps).
- ⊘ **Remove double `_updateRates()` call** — verified there is only one call (in constructor); no action needed.
- ✓ **Unused imports** — ran `npm run lint` and applied fixes via biome.

---

## Summary

| Group | Tasks | Model | Effort |
|-------|-------|-------|--------|
| Testing Infrastructure | install, config, 18 test files | Sonnet | high (setup) / low–med (ongoing) |
| UI/UX Polish | 1–4 | Haiku | low–medium |
| Performance | 5–6 | Sonnet | medium |
| LP Solver / Optimization | 7–9 | Opus | high |
| New Factory View Modes | 10–11 | Opus | high |
| Refactoring & Housekeeping | 12–14 | Haiku | low–medium |

## Recommended sequencing

1. **Group 5 (Refactoring)** — clean codebase first. Component split and typo fix reduce friction for everything else. Remove `console.clear()` before writing LP tests.
2. **Testing Infrastructure** — establish coverage early so every subsequent group ships with tests.
3. **Group 2 (Performance)** — a slow UI makes iterating on features painful.
4. **Group 1 (UI/UX Polish)** — quick wins; integration tests can be written alongside.
5. **Group 3 (LP Solver)** — constraints and maximize-output unlock auto-fill; LP unit tests already designed.
6. **Group 4 (New Modes)** — highest complexity, builds on everything above.

---

## New Backlog

The following items are work in addition to the plans above.

### Features

- add the ability to set default constraints for a folder
- update page URL to enable bookmarks for specific factories and forward/back functionality
- support custom game modes such as randomized resource nodes, recipe cost, power usage, etc.

### Improvements

- Why is deserializeFactory being called in a render thread? (Discovered in Task 5)
- Constraints dialog should show global defaults
- Source factories section in AutoFillDialog should match "Add available part" style (button that turns into autocomplete)
