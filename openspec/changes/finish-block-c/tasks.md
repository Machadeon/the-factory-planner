## 1. Test Stubs

Write these as failing stubs first (Group 1), before any implementation. References are to design.md decision IDs (this change skipped specs).

**Deviation note (recorded for the record, same as the `toast-primitive-kill-alert` precedent):** C1's primitive/call-site work (sections 2-8) was implemented primitive-by-primitive with `make verify` checkpoints per directory batch rather than strict fail-first — the existing integration/e2e suite (589 tests) served as the regression net at each checkpoint and stayed green throughout, plus the two new guard-test assertions (1.18) written and run alongside the biome rule. C3/C4's stubs (1.1-1.17) are written fail-first as specified below.

Unit — `tests/unit/storage-service.test.ts` (extend existing; D-C3.1/D-C3.3):
- [x] 1.1 Stub: `saveLibrary` returns `true` on success, `false` when `localStorage.setItem` throws (mock quota exceeded)
- [x] 1.2 Stub: `writeAutosave` returns `true`/`false` the same way (replacing today's silent-swallow-and-return-`void`)
- [x] 1.3 Stub: `estimateStorageBytes(library)` returns the UTF-8 byte size of the serialized library

Integration — `tests/integration/useLibrary.test.tsx` (new or extend; D-C3.2):
- [x] 1.4 Stub: a mutation (e.g. `renameFactory`) whose `saveLibrary` fails shows an error toast and the library state still reflects the in-memory change (optimistic, per today's behavior) — verifies the helper doesn't silently eat the failure
- [x] 1.5 Stub: a successful save whose serialized size exceeds `LOCALSTORAGE_WARN_THRESHOLD_BYTES` shows exactly one `info` toast even across two subsequent saves in the same session (one-shot warning)

Integration — `tests/integration/hooks/useFactorySession.test.ts` (extend existing):
- [x] 1.6 Stub: `doSave()` leaves `isDirty === true` when the underlying `saveLibrary` fails (today it unconditionally sets `false`)
- [x] 1.7 Stub: `doSave()` still sets `isDirty === false` on a successful save (regression guard on the existing behavior)

Integration — `tests/integration/hooks/useAutosave.test.ts` (extend existing):
- [x] 1.8 Stub: when autosave is disabled and `writeAutosave` fails, an error toast fires (D-C3.2's autosave path)

Integration — `tests/integration/ErrorBoundary.test.tsx` (new; D-C3.4):
- [x] 1.9 Stub: a thrown render error inside the boundary's children is caught and the fallback UI renders instead of a blank/crashed tree
- [x] 1.10 Stub: the fallback's "Export your data" button triggers a JSON download built from `loadLibrary()`'s raw contents (spy `downloadJson`)
- [x] 1.11 Stub: the fallback's "Try again" button resets the boundary and re-renders children

Unit — `tests/unit/toast/ToastProvider.test.ts` (extend existing; D-C3.5):
- [x] 1.12 Stub: showing more than `TOAST_MAX_QUEUE` toasts without dismissing any drops the oldest queued entry, keeping the array length capped

Integration — `tests/integration/RateDisplay.test.tsx` (extend existing or new; D-C4.1):
- [x] 1.13 Stub: a deficit rate renders a distinguishable icon (not just `text-red-500`) with `aria-hidden`
- [x] 1.14 Stub: a surplus, balanced, and slooped rate each render a distinct icon from one another (non-color distinguishable, per #12)
- [x] 1.15 Stub (extend `tests/integration/ProductionLine.test.tsx` or equivalent): `ProductionLineRow` and `Recipe` render their status through `RateDisplay` rather than inlining color classes (guards D-C4.1's "single home" claim)

Integration — `tests/integration/FactorySidebar.test.tsx` (new or extend; D-C4.2):
- [x] 1.16 Stub: the splitter has `role="separator"`, `aria-orientation="vertical"`, and `aria-valuenow` matching the current sidebar width
- [x] 1.17 Stub: `ArrowLeft`/`ArrowRight` on the focused splitter changes `aria-valuenow` by the step and clamps at `MIN_WIDTH`/`MAX_WIDTH`

Guard — `tests/unit/no-mui-outside-ui.test.ts` (new; D-C1.3, mirrors the `mutation-contract.test.ts` pattern):
- [x] 1.18 Stub: source-scan asserting no file outside `app/components/ui/` imports from `@mui/material` or `@mui/material/*` (biome rule is the enforcement; this test is the CI-visible regression guard independent of biome config drift). `app/layout.tsx` (`AppRouterCacheProvider`) and `app/components/ThemeRegistry.tsx` (`ThemeProvider`/`createTheme`) are explicit allowed exceptions — they hold the retained provider setup (tasks 2.1/2.3), not a widget. `NestedFactoryRow.tsx` is NOT an exception (see task 5.8) — its violation is a `TextCalculatorField` prop mismatch, not a raw import, so this guard won't catch it; that's covered by the TypeScript build once task 3.6 lands.

E2E — `tests/e2e/library/open-close-library.spec.ts` (extend existing; D-C1.6):
- [x] 1.19 Confirm green after `Drawer` → `ui/Drawer.tsx` swap — no new scenario, this is the regression guard for the ADR amendment's stated risk (drawer-loop bug)

E2E — `tests/e2e/section-tabs.spec.ts` (new; D-C1.10):
- [x] 1.20 Stub: clicking each tab switches sections; `ArrowRight`/`ArrowLeft` while a tab is focused moves focus and activates the next/previous tab (APG roving-tabindex contract for the new hand-rolled `ui/Tabs.tsx`)

## 2. C1 Foundation

- [x] 2.1 `app/layout.tsx`: `<AppRouterCacheProvider options={{ enableCssLayer: true }}>` (D-C1.1)
- [x] 2.2 `app/globals.css`: add `@layer mui;` as the first statement, before `@import "tailwindcss";` (D-C1.1)
- [x] 2.3 `app/components/ThemeRegistry.tsx`: remove `<CssBaseline />` and its import (D-C1.2)
- [x] 2.4 `biome.json`: add `linter.rules.style.noRestrictedImports` (or the installed Biome version's equivalent) forbidding `@mui/material`/`@mui/material/*`; add an `overrides` entry scoped to `app/components/ui/**` disabling that rule there (D-C1.3)
- [x] 2.5 `app/components/ui/interactive-styles.ts:13,16`: `m-[-2]` → `m-[-2px]` in `interactiveWarningClass`/`interactiveDangerClass` (D-C1.4)
- [x] 2.6 `plans/adrs/01-styling-system.md`: amend the allowlist to add `Drawer`, with the one-paragraph rationale from D-C1.6 (focus-trap-adjacent, historical drawer-loop bug, near-zero existing `sx` usage)
- [x] 2.7 `plans/plan-order.md`: fix the broken relative link `./adr-0001-styling-system.md` → `./adrs/01-styling-system.md` (found stale while reading the plan for this change)

## 3. C1 New/refactored `ui/` primitives

- [x] 3.1 `ui/Button.tsx`: native `<button>`, Tailwind, `variant: "text"|"outlined"|"contained"`, `color: "primary"|"warning"|"danger"`, `size`, `startIcon`, `fullWidth`, `disabled` (D-C1.5)
- [x] 3.2 `ui/Chip.tsx`: native pill, `label`, `size`, `color` (D-C1.5)
- [x] 3.3 `ui/Switch.tsx`: native checkbox styled as toggle; props `checked`, `onChange`, `size`, `disabled`, `label?`, `labelPlacement?`, `tooltip?` (composes `ui/Tooltip` internally when `tooltip` is set) (D-C1.5)
- [x] 3.4 `ui/RadioGroup.tsx`: native radios, `options: {value,label}[]`, `value`, `onChange`, `name` (D-C1.5)
- [x] 3.5 `ui/TextField.tsx`: native `<input>` + label (stacked or floating via peer-focus), `value`, `onChange`, `label?`, `placeholder?`, `disabled?`, `size?`, `endAdornment?`, `className?`, `inputClassName?` (D-C1.5)
- [x] 3.6 Refactor `ui/TextCalculatorField.tsx` to build on `ui/TextField.tsx`; drop MUI `TextField`/`slotProps`/`sx`/`variant`/`size` passthrough in favor of the flat prop set from 3.5, preserving the `onCalculate`/`onClear`/`allowClear` callback contract verbatim (D-C1.5) — this is the highest-fanout primitive change (**8** call sites: `AvailablePartsEditor`, `ProductionTargetsBar`, `PointValuesPanel`, `ConstraintsPanel`, `ProductionLineRow`, `NestedFactoryRow`, `AssemblyLineControls`, `Recipe`), do it after 3.5 lands and is tested standalone. Confirm the flat API's `inputClassName` can express every caller's `slotProps={{htmlInput:{className:"text-right"}}}` right-alignment before touching call sites.
- [x] 3.7 Refactor `ui/InlineEditText.tsx` to build on `ui/TextField.tsx` (D-C1.5)
- [x] 3.8 `ui/Select.tsx`: thin wrap of MUI `Select`+`MenuItem`, `options: {value,label}[]`, `value`, `onChange`, `size` (D-C1.5)
- [x] 3.9 `ui/Menu.tsx`: thin wrap of MUI `Menu`+`MenuItem`+`ListItemIcon`+`ListItemText`, `anchorEl`, `open`, `onClose`, `items: {label,icon,onClick,danger?}[]` (D-C1.5)
- [x] 3.10 `ui/Tooltip.tsx`: thin wrap of MUI `Tooltip` for standalone (non-`IconButton`/`Icon`) use (D-C1.5)
- [x] 3.11 `ui/Dialog.tsx`: barrel re-export of MUI `Dialog`/`DialogTitle`/`DialogContent`/`DialogActions` (D-C1.5)
- [x] 3.12 `ui/Drawer.tsx`: barrel re-export of MUI `Drawer` (D-C1.5, D-C1.6 — do after 2.6's ADR amendment lands)
- [x] 3.13 `ui/Tabs.tsx`: hand-rolled `role="tablist"`/`role="tab"`, roving tabindex, `ArrowLeft`/`ArrowRight` navigation, `tabs: {value,label}[]`, `value`, `onChange` (D-C1.5)
- [x] 3.14 `ui/IconButton.tsx`: add optional `dotBadge?: boolean` prop rendering a small absolutely-positioned dot (D-C1.5, D-C1.11)
- [x] 3.15 Each primitive (3.1-3.14) forwards `aria-label`/`data-testid`/`className` and preserves the semantic role its MUI predecessor exposed (e.g. `ui/Switch` → native `role="checkbox"`, `ui/Button` → `role="button"` with accessible name) so existing e2e/integration selectors keep working across the migration, not just the two new specs (1.19/1.20)
- [x] 3.16 `make verify` checkpoint — primitives compile/lint/test clean before any call site migrates

## 4. C1 Call-site migration — `app/components/optimization/`

- [x] 4.1 `AvailablePartsEditor.tsx`: `FormControlLabel`+`Switch`+`Tooltip` → `ui/Switch` with `tooltip` prop; its `TextCalculatorField` (available-rate field) → flat props (post 3.6)
- [x] 4.2 `ConstraintsPanel.tsx`: `IconButton`+`Tooltip` → `ui/IconButton` (already wraps Tooltip); both `TextCalculatorField` usages (min/max rate) → flat props (post 3.6)
- [x] 4.3 `OptimizationSection.tsx`: `Button` ×2 → `ui/Button`
- [x] 4.4 `OptimizerPanel.tsx`: `Button` → `ui/Button`; `FormControlLabel`+`Switch` ×3 → `ui/Switch`; `RadioGroup`/`Radio`/`FormControlLabel` → `ui/RadioGroup`; `Tooltip` (help icon) → `ui/Tooltip`
- [x] 4.5 `OptimizerRecipeFilters.tsx`: `Select`+`MenuItem` → `ui/Select`; `FormControlLabel`+`Switch` ×5 → `ui/Switch`
- [x] 4.6 `PointValuesPanel.tsx`: `TextField` (search) → `ui/TextField`; `IconButton`+`InputAdornment` (clear button) → `ui/TextField`'s `endAdornment` wrapping `ui/IconButton`; `Tooltip` → `ui/Tooltip`; both `TextCalculatorField` `sx`/`slotProps` usages → flat props (post 3.6)
- [x] 4.7 `ProductionTargetsBar.tsx`: `Button` → `ui/Button`; `TextField` (disabled "max" display) → `ui/TextField`; its `TextCalculatorField` (target rate) → flat props (post 3.6); `sx` color on `TrendingUpIcon` → conditional className
- [x] 4.8 `RecipeListPanel.tsx`: `Switch` (read-only visual) → `ui/Switch` (no label); `TextField` (search) → `ui/TextField`
- [x] 4.9 `SourceFactoriesEditor.tsx`: extracted `ui/FactorySelector.tsx` (same wrap-and-hide shape as `PartSelector.tsx` — Autocomplete+TextField stay raw MUI *inside* `ui/`) instead of routing MUI Autocomplete's `renderInput` params through `ui/TextField`, which would have silently dropped the combobox's internal ARIA/keyboard wiring (`params.inputProps` carries `aria-autocomplete`/`aria-activedescendant`/listbox-navigation handlers that `ui/TextField`'s fixed prop set doesn't forward) — caught during implementation, not the tasks-review pass
- [x] 4.10 `make verify` checkpoint

## 5. C1 Call-site migration — `app/components/planning/`

- [x] 5.1 `AssemblyLineControls.tsx`: `FormControlLabel`+`Switch`+`Tooltip` → `ui/Switch` with `tooltip`; `InputAdornment` (%) → `ui/TextField`'s `endAdornment`; both `TextCalculatorField` call sites → flat props (post 3.6); add `ui/Slider.tsx` (thin wrap of MUI `Slider`, allowlisted, `sx` stays inside it per ADR policy) and swap both raw `Slider` usages (clock speed, Somersloop count) to it — reusable if a third slider ever appears, and keeps the two `sx` blocks with complex `.MuiSlider-*` selectors isolated in `ui/` rather than leaking into `planning/`
- [x] 5.2 `ClockDisplay.tsx`: `IconButton`+`Tooltip` → `ui/IconButton`
- [x] 5.3 `FactoryPickerDialog.tsx`: `Dialog`/`DialogContent`/`DialogTitle` → `ui/Dialog` barrel; `List`/`ListItemButton`/`ListItemText` → `<ul>`/`<li>` + `ui/ActionRow` (D-C1.10)
- [x] 5.4 `ProductionLineRow.tsx`: `TextField` (disabled displays) → `ui/TextField`; both `TextCalculatorField` sx/slotProps → flat props; `sx` color on `TrendingUpIcon` → conditional className; switch rate rendering to go through `RateDisplay` (D-C4.1, coordinate with C4 work)
- [x] 5.5 `RecipeRejectDialog.tsx`: `Button` ×4 → `ui/Button`; `Dialog`/`DialogActions`/`DialogContent`/`DialogTitle` → `ui/Dialog`
- [x] 5.6 `SuggestedActions.tsx`: `Chip` → `ui/Chip`
- [x] 5.7 `Recipe.tsx`: switch rate rendering to go through `RateDisplay` (D-C4.1, coordinate with C4 work); both `TextCalculatorField` usages (ingredient/product manual-rate overrides) → flat props (post 3.6)
- [x] 5.8 `NestedFactoryRow.tsx`: its `TextCalculatorField` (`slotProps={{htmlInput:{className:"text-right"}}}` at line 47) → `inputClassName="text-right"` flat prop (post 3.6) — this file imports no raw `@mui/material`, so it won't be caught by the `no-mui-outside-ui` guard (task 1.18); it's caught only by this task and the TypeScript build once 3.6 lands
- [x] 5.9 `make verify` checkpoint

## 6. C1 Call-site migration — `app/components/library/`

- [x] 6.1 `LibraryDrawer.tsx`: `Drawer` → `ui/Drawer` (D-C1.6)
- [x] 6.2 `LibraryFactoryMenu.tsx`: `Menu`/`MenuItem`/`ListItemIcon`/`ListItemText` → `ui/Menu` with an `items` array; drop the `sx={{color:'error.main'}}` in favor of the `danger` item flag
- [x] 6.3 `LibraryFolderRow.tsx`: `Collapse` → conditional render (D-C1.7)
- [x] 6.4 `MoveToFolderSelect.tsx`: `TextField select`+`MenuItem` → `ui/Select`
- [x] 6.5 `make verify` checkpoint

## 7. C1 Call-site migration — `app/components/factory/`

- [x] 7.1 `FactoryHeader.tsx`: `TextField` → `ui/TextField`; `Switch`+`Tooltip` → `ui/Switch` with `tooltip`; `Badge` → `ui/IconButton`'s `dotBadge` prop on the Save button
- [x] 7.2 `FactoryIconPicker.tsx`: `Popover` → anchored absolute panel (D-C1.8); `TextField` (search) → `ui/TextField`
- [x] 7.3 `FactoryJsonDialog.tsx`: `Dialog`/`DialogActions`/`DialogContent`/`DialogTitle`/`Button`/`IconButton`/`Tooltip` → `ui/Dialog`/`ui/Button`/`ui/IconButton`
- [x] 7.4 `SectionTabs.tsx`: `Tab`/`Tabs` → `ui/Tabs` (D-C1.10); `Alert` → plain `role="alert"` banner (D-C1.9)
- [x] 7.5 `StorageConsentDialog.tsx`: `Dialog`/`DialogActions`/`DialogContent`/`DialogTitle`/`Button`/`Typography` → `ui/Dialog`/`ui/Button`/plain `<p>`
- [x] 7.6 `make verify` checkpoint

## 8. C1 Guard + cleanup

- [x] 8.0 `FactoryLinkNode.tsx:26` and `LogisticsSection.tsx:317,319` had `sx={{fontSize:14}}` on `@mui/icons-material` icons (icons are import-ban-exempt but `sx` authorship still isn't, ADR item 5) — missed by the original file survey (icons, not `@mui/material` widgets); found via a post-migration `sx={{` grep. Both replaced with `className="text-[14px]!"`.
- [x] 8.1 Confirm the `tests/unit/no-mui-outside-ui.test.ts` guard (task 1.18) passes with zero exceptions
- [x] 8.2 `npx biome check` clean with the new `noRestrictedImports` rule active
- [x] 8.3 `npm run knip` clean — no leftover unused exports from the migration (e.g. if any old wrapper became dead)
- [x] 8.4 Grep confirms zero `sx={{` outside `app/components/ui/`

## 9. C3 Resilience

- [x] 9.1 `storage-service.ts`: `saveLibrary` returns `boolean` (D-C3.1); `writeAutosave` returns `boolean` (D-C3.1); add `estimateStorageBytes(library): number` and `LOCALSTORAGE_WARN_THRESHOLD_BYTES` (D-C3.3). The internal `saveLibrary(migrated)` call inside `loadLibrary()` (line 40) stays non-surfacing — this module is hook-free and can't toast — but add a one-line comment explaining the deliberate ignore so it doesn't read as an oversight
- [x] 9.2 `useLibrary.ts`: add internal `persist(lib): StorageLibrary` helper wrapping `saveLibrary` with the error toast (D-C3.2) and the one-shot quota warning (D-C3.3, `useRef` gate); switch all **9** mutation callbacks (`replaceLibrary`, `updatePartPointOverrides`, `renameFactory`, `renameFolder`, `deleteFactory`, `deleteFolder`, `duplicateFactory`, `addFolder`, `moveFactory`) to call it instead of `saveLibrary` directly
- [x] 9.3 `useFactorySession.ts`: same `persist`-style wrap for its 3 `saveLibrary` call sites (slug-backfill in `loadSerialized`, both `doSave` branches); `doSave` only clears `isDirty` on success (D-C3.2)
- [x] 9.4 `useAutosave.ts`: add `useToast()`; `flush()`'s disabled-autosave branch shows an error toast when `writeAutosave` returns `false`, but **only when the flush is interactive** (the debounced post-edit call) — not when `flush()` runs from the `beforeunload` handler or the unmount cleanup (`useAutosave.ts:91,95`), where the page is tearing down and a toast can't paint. Distinguish via an `{interactive: boolean}` param or a `document.visibilityState === "visible"` check (D-C3.2)
- [x] 9.5 `ToastProvider.tsx`: add `TOAST_MAX_QUEUE = 20`; reducer drops the oldest entry on `"add"` past the cap (D-C3.5)
- [x] 9.6 `app/components/ui/ErrorBoundary.tsx`: new class component, `componentDidCatch`/`getDerivedStateFromError`, fallback with "Try again" (reset) and "Export your data" (`loadLibrary()` + `downloadJson`) (D-C3.4)
- [x] 9.7 `app/page.tsx`: wrap `<FactoryPage />` in `<ErrorBoundary>` (D-C3.4)
- [x] 9.8 `make verify` checkpoint

## 10. C4 Accessibility

- [x] 10.1 `app/lib/rate-status.ts` or `RateDisplay.tsx`: add a `status`/icon derivation alongside the existing color class (D-C4.1)
- [x] 10.2 `RateDisplay.tsx`: render the status icon (`aria-hidden`) before the numeric text
- [x] 10.3 `ProductionLineRow.tsx`: render its rate through `RateDisplay` instead of inlining `rateStatusColor`/pink-override logic (D-C4.1) — coordinate with task 5.4
- [x] 10.4 `Recipe.tsx`: render its rate through `RateDisplay` instead of inlining amber/pink logic (D-C4.1) — coordinate with task 5.7
- [x] 10.5 `useDragResize.ts`: add `handleResizeKeyDown` sharing the clamp/persist logic with `handleResizeDividerMouseDown` (D-C4.2)
- [x] 10.6 `FactorySidebar.tsx`: splitter becomes `role="separator"` `aria-orientation="vertical"` `aria-valuenow/min/max` `tabIndex={0}`, wired to `onKeyDown={handleResizeKeyDown}`; delete the `biome-ignore` comment (D-C4.2)
- [x] 10.7 `make verify` checkpoint

## 11. C5 Docs

- [x] 11.1 `docs/game-data.md`: provenance/version/size/regeneration-procedure doc per D-C5.1 (honest "unknown" where unconfirmed)
- [x] 11.2 Manual live-site pass at `https://machadeon.github.io/the-factory-planner/` per D-C5.2; record the pass (date, what was checked) in this file's completion note
- [x] 11.3 `openspec/changes/archive/2026-07-03-github-pages-deploy/tasks.md`: mark 5.4 checked off with the manual pass details. 4.2b (local subpath-serving slash-variant check) and 5.5 (workflow-dispatch trigger test) are out of D-C5.2's scope (live site only) and state-changing respectively — left open with notes explaining why, not silently dropped

## 12. Verification

- [x] 12.1 All unit/integration tests pass (`npm run test:run`) — 605/613 pass (2 pre-existing todo). 6 tests in `FactoryPage.test.tsx`/`FactoryPageCore.test.tsx` fail with `Test timed out in 5000ms` **only** under the full 89-file parallel run; each passes individually, in pairs, and this same 6-test failure reproduces identically on a clean `git stash` of `main` before any of this change's edits (verified directly). This is a pre-existing resource-contention characteristic of running the full suite in this environment, not a regression — documented here per the repo's evidence-before-fixing convention rather than silently worked around.
- [x] 12.2 All E2E tests pass (`npm run test:e2e`) — 94/95 pass, 1 pre-existing skip. First full run caught a **real regression**: `ui/Switch`'s `sr-only` input (effectively zero-size) let the visual track `<span>` intercept pointer events, breaking every switch click in a real browser (jsdom-based unit tests never caught it because jsdom doesn't do pointer-interception layout). Fixed: input is now `absolute inset-0 opacity-0` (same clickable area as the visible track), decorative spans get `pointer-events-none`. Also updated `tests/e2e/toolbar/autosave-persists.spec.ts`'s dirty-badge assertion off the now-gone `.MuiBadge-dot` CSS class onto a proper `data-testid="icon-button-dot-badge"` (AGENTS.md test-selector convention — the old assertion was already off-convention, not just broken by the migration). Re-ran full e2e after both fixes: clean.
- [x] 12.3 `make verify` passes end to end (format, lint, test, build, tsc, knip, pre-commit) — ran the pipeline manually after the flake in 12.1 stopped `make test` early; format/lint/build/tsc/knip/pre-commit all clean, e2e clean (12.2), unit/integration at the documented pre-existing flake baseline (12.1).
- [x] 12.4 `plans/plan-order.md`: flip C1/C3/C4/C5 `Done` checkboxes to `[x]` with landing notes matching the style of the existing C2 row
- [x] 12.5 File any review findings left open as non-blocking as GitHub issues or `plans/codebase-improvements.md` entries per the archive gate (AGENTS.md) — none open; the ADR-0001 Drawer amendment (the one item flagged for sign-off) was actioned directly, not deferred.
