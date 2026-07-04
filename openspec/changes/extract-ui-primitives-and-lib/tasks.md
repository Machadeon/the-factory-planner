# Tasks: extract-ui-primitives-and-lib

Commit sequencing per design D9: each numbered implementation group = one green commit.

## 1. Test Stubs

Unit — `tests/unit/lib/`:

- [x] 1.1 Write unit test stub: `format.test.ts` — displayNum locale/fraction/-0 (lib-utilities R2.S1); formatRate `63 MW`/`63/min` spacing + rateUnit bare units (R3.S1)
- [x] 1.2 Write unit test stub: `rate-status.test.ts` — locked outputs both variants at 0.04/0.06/−0.06/0 (R4.S1); non-finite NaN/±Infinity branches (R4.S2)
- [x] 1.3 Write unit test stub: `base-path.test.ts` — env set/unset modes (R5.S1) (port from existing tests/unit/base-path.test.ts against new module path)
- [x] 1.4 Write unit test stub: `expression.test.ts` — golden results for `1 + 2 * 3`, `-2 ^ 2`, `min(3, 2) * 4`, `0 - 0` (expression R1.S1); error messages for `1..2`, `1 2`, `1 +* 2`, `abc`, `(1 + 2`, `1 + 2)`, `1 , 2` (R2.S1); empty/whitespace → NaN no-throw (R2.S2); port remaining golden cases from tests/unit/utils.test.ts

Integration — `tests/integration/ui/`:

- [x] 1.5 Write integration test stub: `IconButton.test.tsx` — renders `<button type="button">` with required aria-label + tooltip default (ui-primitives R2.S1); Enter/Space activation (R1.S1); danger/warning variant classes (R2.S3)
- [x] 1.6 Write integration test stub: `ActionRow.test.tsx` — role button, accessible name from content, Tab-reachable, Enter/Space activation (R2a.S1)
- [x] 1.7 Write integration test stub: `ConfirmDialog.test.tsx` — confirm fires once + closes (R3.S1); cancel/Escape/backdrop close without onConfirm (R3.S2); cancel button has initial focus (design D3)
- [x] 1.8 Write integration test stub: `InlineEditText.test.tsx` — Enter commits trimmed incl. unchanged (R4.S1); Escape reverts no-commit (R4.S2); blur commits (R4.S3); Escape-then-blur no-commit (R4.S4); empty-trim cancels (R4.S5)
- [x] 1.9 Write integration test stub: `AddItemControl.test.tsx` — reveal + collapse on completion (R5.S1); closeOnBlur true collapses / false stays open (R5.S2); partial input discarded, fresh child on reopen (R5.S3)
- [x] 1.10 Write integration test stub: `CollapsibleSection.test.tsx` — toggle + chevron icon swap ExpandMore/ChevronRight (R6.S1); defaultExpanded honored (R6.S2 unit-level)
- [x] 1.11 Write integration test stub: `FileImportButton.test.tsx` — file selection delivers file + input resets (R7.S1); cancel no callback (R7.S2)
- [x] 1.12 Write integration test stub: `RateDisplay.test.tsx` — ` MW` vs `/min` with displayNum value (R8.S1); caller-passed color class applied verbatim, none when absent (R8.S2)
- [x] 1.13 Write integration test stub: overview defaults — intermediates collapsed, other five expanded after migration (R6.S2; extend tests/integration/FactoryOverviewComponent.test.tsx)
- [x] 1.14 Write integration test stub: `Icon.test.tsx` — labeled (`label="Iron Plate"` → tooltip + alt) vs decorative (`label=""` → no tooltip, empty alt) importing from `ui/Icon` path (icon-rendering R2.S1)

## 2. Baseline & stub-failure gate

Execution-order note: 2.1 runs against the pre-stub tree (branch tip == main; if stubs from Group 1 are already written locally, stash them for the baseline run) — the green baseline is captured before any stub or implementation commit, per the proposal's acceptance contract.

Stub lifecycle (reconciles Group 1 stubs with design D9's green-per-commit invariant): all 14 stub files are written in the working tree during Group 1 and confirmed failing at 2.2, but each stub file is **staged and committed with its implementing group's commit** — 1.1–1.4 land in commit 1 (Group 3), 1.5–1.12 in commit 2 (Group 4), 1.13 in commit 3 (Group 5), 1.14 in commit 4 (Group 6). Green gates (3.5, 4.6, 5.9, Group 7) run against the **committed tree**: later-group stub files are held uncommitted (stash or unstaged) at gate time, so every commit's suite is green while every stub still proves failure-then-pass within its own group.

- [x] 2.1 Capture green baseline on main-equivalent tip: `npm run test:run` + `npm run test:e2e` + `npm run build` all green; record result
- [x] 2.2 Run new stubs (1.1–1.14) in the working tree and confirm each fails before implementation begins

## 3. lib/ split (commit 1)

- [x] 3.1 Create `app/lib/format.ts` (displayNum, rateUnit, formatRate), `app/lib/rate-status.ts` (`rateStatusColor(rate, { surplusIsGood })`), `app/lib/base-path.ts` (withBasePath)
- [x] 3.2 Create `app/lib/expression/` — `operators.ts` (tables + minus0Hack), `tokenize.ts`, `shunting-yard.ts`, `rpn.ts`, `index.ts` (calculate); mechanical move per design D6
- [x] 3.3 Update all importers of `@/app/utils` to new lib paths; replace `getColorClassForProductionRate1` call site with `rateStatusColor(rate, { surplusIsGood: false })`
- [x] 3.4 Delete `app/utils.tsx`; migrate/retire `tests/unit/utils.test.ts` (cases live in 1.1–1.4 files); delete old `tests/unit/base-path.test.ts` if superseded
- [x] 3.5 Green gate: `npm run test:run` + `npm run build` + `npm run lint-fix`

## 4. ui/ primitives (commit 2)

- [x] 4.1 Create `ui/IconButton.tsx` + `ui/ActionRow.tsx` — button reset + shared focus-visible class + Clickable class constants (design D1/D2; `variant` prop, `type="button"`)
- [x] 4.2 Create `ui/ConfirmDialog.tsx` (cancel autoFocus, onClose→onCancel, danger styling)
- [x] 4.3 Create `ui/InlineEditText.tsx` (cancelledRef lifecycle per D4)
- [x] 4.4 Create `ui/AddItemControl.tsx` (focusout containment per D5, closeOnBlur prop)
- [x] 4.5 Create `ui/CollapsibleSection.tsx` (locked markup per R6), `ui/FileImportButton.tsx`, `ui/RateDisplay.tsx`
- [x] 4.6 Green gate: stubs 1.5–1.12 now pass; `npm run test:run` + `npm run build`

## 5. Call-site migration + Clickable deletion (commit 3)

- [x] 5.1 Migrate ~30 icon-button sites across 12 files to `IconButton` (aria-label = former Tooltip title verbatim, R2.S2)
- [x] 5.2 Migrate 5 confirm dialogs (unsaved-load, clear-confirm, delete-factory, delete-folder, reject-all) to `ConfirmDialog`
- [x] 5.3 Migrate FactoryLibraryDrawer folder/factory rows to split-row pattern (design D1: inner ActionRow wraps indent+icon+label; trailing controls siblings); rename fields → `InlineEditText`
- [x] 5.4 Migrate 5 "Add X" reveals to `AddItemControl` (ConstraintsPanel with `closeOnBlur={false}`)
- [x] 5.5 Migrate remaining non-icon Clickable uses to `ActionRow` (RecipeComponent, ProductionLineComponent, PartRateSummary, FactoryOverviewComponent SectionHeader → CollapsibleSection, etc.)
- [x] 5.6 Migrate FactoryHeader + FactoryLibraryDrawer imports to `FileImportButton`; value+unit sites to `RateDisplay`; standalone unit spans to `rateUnit`
- [x] 5.7 Delete `app/components/Clickable.tsx`; grep-verify zero imports (R1.S2)
- [x] 5.8 E2E selector audit: run `npm run test:e2e`; enumerate any forced selector change in ui-primitives R10 before proceeding
- [x] 5.9 Green gate: `npm run test:run` + `npm run test:e2e` + `npm run build`; stub 1.13 passes

## 6. Icon standardization + loader removal (commit 4)

- [x] 6.1 `git mv app/components/Icon.tsx app/components/ui/Icon.tsx`; update importers; stub 1.14 now passes
- [x] 6.2 Migrate 7 feature files off `next/image` to `ui/Icon` (`label=""` at currently-tooltip-free sites per D7 caveat)
- [x] 6.3 `page.tsx` logo → plain `<img>` with withBasePath, eager, `fetchPriority="high"` (camelCase)
- [x] 6.4 Delete `image-loader.ts`, `next.config.ts` `images` block, `tests/unit/image-loader.test.ts`
- [x] 6.5 Grep-verify: zero `next/image` imports in `app/` (icon-rendering R3.S1); no game-asset `<img>` outside ui/Icon (R1.S1); no `"MW" : "/min"` ternaries outside lib (lib R3.S2)
- [x] 6.6 Subpath build check: `NEXT_PUBLIC_BASE_PATH=/the-factory-planner npm run build` succeeds; spot-check logo + icon srcs in `out/` contain base path exactly once (static-export R2.S1, icon-rendering R2.S2/R3.S2)

## 7. Verification

- [ ] 7.1 All unit/integration tests pass (`npm run test:run`)
- [ ] 7.2 All E2E tests pass (`npm run test:e2e`)
- [ ] 7.3 Production build clean (`npm run build`), `npm run lint-fix` no diffs
- [ ] 7.4 ui/ domain-free import audit (R9.S1); `@/app/utils` gone (lib R1.S1)
- [ ] 7.5 Lighthouse audit (UI changed) — no regression vs baseline; confirm logo LCP unharmed
- [ ] 7.6 Visual spot-check migrated screens vs main (zero visual change contract; new focus rings keyboard-only)
