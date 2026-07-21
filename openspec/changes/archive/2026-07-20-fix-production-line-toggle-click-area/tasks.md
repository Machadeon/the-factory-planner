## 1. Test Stubs

- [x] 1.1 Write integration test stub (tests/integration/): R1.S1 — click part icon/name toggles expand
- [x] 1.2 Write integration test stub: R1.S2 — click "Actual: rate" text toggles expand
- [x] 1.3 Write integration test stub: R1.S3 — click header whitespace/gap toggles expand
- [x] 1.4 Write integration test stub: R1.S4 — four sequential clicks alternate expanded/collapsed/expanded/collapsed
- [x] 1.5 Write integration test stub: R1.S5 — click-drag text selection on rate text does not toggle. Note: jsdom has limited native text-selection drag simulation; if the stub can't meaningfully assert this in tests/integration/, fall back to an E2E stub in tests/e2e/ instead
- [x] 1.5b Write integration test stub: R1 exclusion clause — clicking content inside the expanded assembly-line list (when row is already expanded) does not toggle the row closed
- [x] 1.6 Write integration test stub: R2.S1 — click Output Rate field does not toggle
- [x] 1.7 Write integration test stub: R2.S2 — click Delete button does not toggle, fires remove-product
- [x] 1.8 Write integration test stub: R2.S3 — click Edit/Autocalculate and Maximize buttons does not toggle, fires own action
- [x] 1.9 Write integration test stub: R3.S1/S2 — Enter and Space toggle when row has focus
- [x] 1.10 Write integration test stub: R3.S3/S4 — tabbing into and activating a nested control does not toggle
- [x] 1.11 Write integration test stub: R3.S5 — aria-expanded attribute reflects state after click/keyboard toggle
- [x] 1.11b Write integration test stub: R3 — rendered toggle element exposes `role="button"` and is keyboard-focusable (`tabIndex` 0 or implicit via native `<button>`)
- [x] 1.12 Confirm all new stubs fail against current `ProductionLineRow.tsx` before implementing (6/14 failed as expected: R1.S2, R1.S3, R1.S4, R3.S1/S2, R3.S5, R3 role/focus)

## 2. Restructure ProductionLineRow layout (design D1/D2)

- [x] 2.1 Move "Actual: rate" `<p>` content inside `ActionRow`, immediately after the icon/name block; move `grow` class from `<p>` to `ActionRow`
- [x] 2.2 Verify rate control TextFields, IconButtons, and Delete button remain as siblings outside `ActionRow`, in current visual position
- [x] 2.3 Add static `aria-label` (e.g. `"${part.name} production line"`) to `ActionRow`, remove reliance on visible text content for accessible name
- [x] 2.4 Confirm `ActionRow`'s `aria-expanded` prop still receives `isExpanded` and no interactive descendants were introduced into its children

## 3. Verify no dead propagation-stopping code (design D3)

- [x] 3.1 Confirm outer `<div>` in `ProductionLineRow.tsx` has no `onClick` handler (toggle lives only on `ActionRow`)
- [x] 3.2 Leave existing `IconButton`/`TextCalculatorField` click handlers as-is; do not add new `stopPropagation` calls

## 4. Verification

- [x] 4.1 All new integration tests from Group 1 pass
- [x] 4.2 All unit/integration tests pass (`npm run test:run`)
- [x] 4.3 All E2E tests pass (`npm run test:e2e`) — covered by `make verify`
- [x] 4.4 `make verify` passes (Biome, unit tests, build)
- [x] 4.5 Manual check in dev server: click part name, rate text, and row whitespace each toggle; click rate fields/buttons do not toggle; Tab+Enter/Space toggles; hover affordance behaves per design Risks (accepted trade-off, not a regression) — verified via chrome-devtools MCP against motor-factory: rate text click toggled expand/collapse, Autocalculate button click fired its own action without toggling
