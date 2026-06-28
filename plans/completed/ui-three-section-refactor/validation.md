# Validation — UI Refactor: Three Sections

Acceptance criteria → test mapping. Test types: unit (vitest/jsdom models), integration
(vitest + RTL components), E2E (Playwright). Seed helper: `tests/e2e/seed.spec.ts` pattern.

## New tests

### Integration — `tests/integration/FactoryComponent.test.tsx` (extend)
- **T1 (AC1):** renders three tabs `Planning` / `Optimization` / `Logistics`; Planning active by default.
- **T2 (AC1):** clicking Optimization shows targets + constraints + optimizer panels; clicking
  Planning shows production lines. Overview headings (`Outputs`, `Inputs`) present the whole time.
- **T3 (AC1, remount-safety):** all sections stay in the DOM (hidden via `content-visibility`),
  not unmounted — assert inactive section wrapper has `contentVisibility: hidden`.

### Integration — `tests/integration/OptimizationSection.test.tsx` (new)
- **T4 (AC3/AC4):** renders targets bar, constraints panel, optimizer config, recipe list,
  suggestion actions — all inline, **no element with `role="dialog"`** for these (the reject-all
  confirm only appears after clicking Reject all).
- **T5 (AC4, live-write):** editing a constraint max writes to `factory.constraints` immediately
  (no Apply click); deleting a row removes it.
- **T6 (AC4):** changing objective radio writes `factory.optimizer.objective` immediately.
- **T7 (AC7-adjacent):** Solve disabled with no targets; enabled + calls `optimizeRecipes` with one.

### Integration — `tests/integration/LogisticsSection.test.tsx` (new)
- **T8 (AC7):** renders the placeholder text; no controls.

### E2E — `tests/e2e/sections/` (new dir)
- **T9 (AC1):** `tab-navigation.spec.ts` — seed, see tabs, switch each, assert section content
  and that the overview sidebar (`Outputs`) stays visible across all three.
- **T10 (AC6):** `no-substantive-modals.spec.ts` — open Optimization; assert constraints +
  optimizer + recipe-list controls are visible inline and that no `role="dialog"` is present
  before any confirm action.

## Existing tests to update

### Integration
- **`FactoryOverviewComponent.test.tsx`** — remove/relocate any assertion about Constraints or
  Recipe Optimizer panels. Current file (read) only asserts Outputs/Inputs/Intermediates/Power
  + visibility toggles → **no change needed** unless a constraints/optimizer assertion is added
  later. Keep as-is; re-run to confirm still green after panel removal.
- **`ProductionTargetsBar.test.tsx`** — still valid (targets bar keeps targets + Solve). Verify
  it no longer asserts an "Advanced options" launch (it doesn't today). Keep.

### E2E — rewrite for inline panels (selectors change from dialog → panel; live-write)
- `tests/e2e/constraints/*` (10 specs): replace `getByText("Edit constraints")` →
  open Optimization tab; replace `getByRole("dialog", {name:"Resource Constraints"})` → inline
  panel region. **Delete/rewrite** the staged-edit specs now invalid under live-write:
  - `cancel-discards-changes.spec.ts` → **remove** (no Cancel).
  - `delete-then-cancel.spec.ts` → **remove** (no Cancel) or convert to plain delete.
  - `dialog-resyncs-on-open.spec.ts` → **remove** (no open/resync; always visible).
  - `apply-saves-constraint.spec.ts` → rewrite to live-write (no Apply; assert immediate save).
  - `apply-min-rate.spec.ts`, `delete-constraint.spec.ts`, `default-limits-shown.spec.ts`,
    `constraint-hides-default.spec.ts`, `open-dialog.spec.ts`, `sidebar-visibility-toggle.spec.ts`
    → re-point selectors to the Optimization-tab inline panel; drop dialog assumptions.
- `tests/e2e/auto-fill/configure-auto-fill.spec.ts` → replace "Configure" → open Optimization
  tab; replace `getByRole("dialog", {name:"Recipe Optimizer Options"})` → inline panel; drop
  Apply (live-write); keep persistence-across-reload assertions on `factory.optimizer`.
- **Audit conclusion (grep-verified):** the ONLY E2E specs coupled to moved UI are
  `tests/e2e/constraints/*` (10 files) and `tests/e2e/auto-fill/configure-auto-fill.spec.ts`.
  No other dir references constraints/optimizer/targets/dialog/objective-summary. `overview/*`,
  `products/*`, `recipes/*`, `rates/*`, `machines/*`, `toolbar/*`, `library/*`,
  `expand-collapse/*` are unaffected → expected green with no edits.
- **Removal ownership:** the 3 staged-edit specs (`cancel-discards-changes`,
  `delete-then-cancel`, `dialog-resyncs-on-open`) are **deleted in the same implementation step
  that lands `ConstraintsPanel`** — never left to run against the inlined panel. AC2 (Planning
  add-product) is covered by the existing `tests/e2e/products/add-product.spec.ts` (Planning is
  the default tab, so it needs no tab-open step).

## Pass conditions
- All new tests pass; all retained/rewritten tests green: `npm run test:run && npm run test:e2e`.
- `npm run lint-fix` clean.
- No `role="dialog"` for constraints / optimizer / recipe-list at rest.
- AC1–AC8 each have ≥1 covering test above.

## Stubs
New integration test files (T4–T8) and E2E `sections/` specs (T9–T10) are written as failing
stubs before implementation. Existing-test rewrites happen in the implementation loop as each
panel lands (so the suite isn't red on unrelated churn mid-flight).
