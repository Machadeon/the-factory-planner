## Context

This change closes out Block C in `plans/plan-order.md`: C1 (styling retrofit per ADR-0001), C3 (storage-failure surfacing + ErrorBoundary), C4 (RateDisplay non-color signaling + keyboard-accessible sidebar splitter), C5 (game-data versioning doc + live-site formal check). C2 (toast primitive) already landed 2026-07-20 and both C3 and C4 build on it.

Per explicit instruction, this change skips proposal/specs/spec-review/design-review/final-review ceremony. Only design → tasks → tasks-review → apply run. Scope for C1 is the **full** ADR-0001 retrofit (confirmed with the user), not just the systemic pieces — the ADR's allowlist (Autocomplete, Slider, Select, Menu, Dialog, Tooltip) plus wrap-and-hide plus full migration of non-allowlist widgets (Button, TextField, Switch, IconButton, FormControlLabel, Chip, Radio/RadioGroup, plus Drawer/Collapse/Popover/Alert/Tab-Tabs/List-ListItemButton/Badge/Typography/InputAdornment which the ADR didn't enumerate but which the actual `@mui/material` import survey below turned up).

### Current MUI import survey (outside `app/components/ui/`)

25 files import from `@mui/material`/`@mui/material/*` outside `ui/` (grep, 2026-07-21):

- **Button**: OptimizationSection, OptimizerPanel, ProductionTargetsBar, RecipeRejectDialog, StorageConsentDialog, FactoryJsonDialog
- **TextField**: FactoryHeader, FactoryIconPicker, ProductionTargetsBar, RecipeListPanel, PointValuesPanel, ProductionLineRow, SourceFactoriesEditor (Autocomplete's `renderInput`), MoveToFolderSelect (as `select`)
- **Switch**: FactoryHeader, AvailablePartsEditor, OptimizerPanel (×4), OptimizerRecipeFilters (×5), RecipeListPanel, AssemblyLineControls
- **IconButton**: ConstraintsPanel, PointValuesPanel, FactoryJsonDialog, ClockDisplay
- **FormControlLabel**: AvailablePartsEditor, OptimizerPanel (×3), OptimizerRecipeFilters (×5), AssemblyLineControls
- **Radio/RadioGroup**: OptimizerPanel
- **Chip**: SuggestedActions
- **Dialog/DialogTitle/DialogContent/DialogActions**: FactoryJsonDialog, StorageConsentDialog, FactoryPickerDialog, RecipeRejectDialog (allowlisted widget, but living outside `ui/`)
- **Tooltip**: FactoryHeader, ConstraintsPanel, AvailablePartsEditor, OptimizerPanel, PointValuesPanel, AssemblyLineControls, ClockDisplay (allowlisted, but living outside `ui/`)
- **Select/MenuItem**: OptimizerRecipeFilters, MoveToFolderSelect (allowlisted, but living outside `ui/`)
- **Menu/MenuItem/ListItemIcon/ListItemText**: LibraryFactoryMenu (allowlisted `Menu`, but living outside `ui/`)
- **Autocomplete**: SourceFactoriesEditor (already allowlisted + already the pattern `PartSelector` established)
- **Drawer**: LibraryDrawer — not on the ADR allowlist
- **Collapse**: LibraryFolderRow — not on the ADR allowlist
- **Popover**: FactoryIconPicker — not on the ADR allowlist
- **Alert, Tab, Tabs**: SectionTabs — not on the ADR allowlist
- **List, ListItemButton, ListItemText**: FactoryPickerDialog — not on the ADR allowlist
- **Badge**: FactoryHeader (dirty-save dot) — not on the ADR allowlist, trivial
- **Typography**: StorageConsentDialog — not on the ADR allowlist, trivial
- **InputAdornment**: PointValuesPanel, AssemblyLineControls — folds into the new TextField primitive, no separate wrapper

16 `sx={{...}}` usages exist today (`PointValuesPanel`, `ProductionTargetsBar`, `ProductionLineRow`, `LibraryFactoryMenu`, `ClockDisplay`, `RecipeListPanel`, `FactoryLinkNode`, `AssemblyLineControls` ×2, `FactoryIconPicker`, `FactoryHeader`, `LogisticsSection` ×2) — all disappear as their host widgets move to Tailwind-native primitives, except the two Slider `sx` blocks in `AssemblyLineControls` (Slider is allowlisted, `sx` is allowed inside its home, but `AssemblyLineControls` itself lives outside `ui/` — see D-C1.7).

`app/layout.tsx` has no `enableCssLayer`; `app/components/ThemeRegistry.tsx` mounts `CssBaseline`; `app/globals.css` has no `@layer` directives; `biome.json` has no `linter` section at all.

## Goals / Non-Goals

**Goals**
- C1: enforce ADR-0001 end to end — cascade-layer fix, CssBaseline removal, biome import rule, `m-[-2]` fix, every non-allowlist MUI widget migrated to a Tailwind `ui/` primitive, every allowlisted widget wrapped/re-exported from `ui/`.
- C3: no silent storage failure — `saveLibrary`/`writeAutosave` failures surface an error toast and leave the dirty indicator lit; a size-approaching-quota warning; one `ErrorBoundary` around the factory page with an export-your-data recovery action.
- C4: `RateDisplay` gets a non-color (icon) status affordance; `FactorySidebar`'s resize splitter becomes keyboard-operable.
- C5: a `docs/game-data.md` recording data.json's provenance/version/regeneration story; one manual live-site click-through pass closing the `github-pages-deploy` residual tasks.
- Close the C2 follow-up (uncapped toast queue) while touching `ToastProvider` for C3's new error toasts.

**Non-Goals**
- No behavior change to the LP solver, factory model, or serialization format.
- No pixel-perfect visual parity guarantee for widgets that had no accessible Tailwind equivalent already in the codebase (Collapse's slide animation, Popover's exact transform-origin animation) — functional parity is the bar; cosmetic motion is opportunistic.
- Undo/redo (F1), solver work (E-block) — untouched.

## Decisions — C1 (styling retrofit)

### D-C1.1 — Cascade layer order
`app/layout.tsx`: `<AppRouterCacheProvider options={{ enableCssLayer: true }}>`. `app/globals.css`: add `@layer mui;` as the very first statement (before `@import "tailwindcss";`). Layer priority in CSS is "last named wins"; declaring `mui` first and letting Tailwind's own `@layer theme, base, components, utilities;` (emitted internally by `@import "tailwindcss"`) register after it makes every Tailwind layer outrank `mui`. No per-conflict tuning needed — this is the ADR's "systemic, mandatory" fix.

### D-C1.2 — Drop `CssBaseline`
Remove `<CssBaseline />` from `ThemeRegistry.tsx`. Tailwind's preflight already normalizes box-sizing/margins/typography; running both resets is the redundancy ADR-0001 flagged as an open risk. Single source of truth = Tailwind preflight. `ThemeProvider`/`createTheme` stay (still needed for the allowlisted MUI widgets' theme context, e.g. dark-mode `palette.mode`).

### D-C1.3 — Biome import rule
`biome.json` gains a `linter.rules.style.noRestrictedImports` (or `nursery` equivalent, whichever Biome's installed version exposes) forbidding `@mui/material` and `@mui/material/*`, with an `overrides` entry scoped to `app/components/ui/**` that turns the rule off. `@mui/icons-material` is never restricted (ADR item 4 — icons are inert SVG, no emotion/theme welding).

### D-C1.4 — `m-[-2]` fix
`app/components/ui/interactive-styles.ts:13,16`: `m-[-2]` → `m-[-2px]` in both `interactiveWarningClass`/`interactiveDangerClass`. Restores the intended 2px inward bleed (border sits flush instead of expanding the box by 2px on all sides) — a deliberate, low-risk visual fix per refactor-review §6.1 item 4's "restore intent" option. Affects every warning/danger split-row (production-line rows in an error state, etc.) by 2px; no functional change.

### D-C1.5 — New/refactored `ui/` primitives
| Primitive | Backing | Replaces |
|---|---|---|
| `ui/Button.tsx` | native `<button>`, Tailwind, variants `text\|outlined\|contained`, colors `primary\|warning\|danger` | all raw MUI `Button` (incl. inside `ConfirmDialog` — Button isn't allowlisted, so `ui/` files use the primitive too, not raw MUI) |
| `ui/Chip.tsx` | native `<span>` pill | `SuggestedActions`' `Chip` |
| `ui/Switch.tsx` | native checkbox styled as a toggle track; optional `label`, `tooltip` props (absorbs the `FormControlLabel`+`Switch`(+`Tooltip`) trio) | every `Switch`/`FormControlLabel` pairing |
| `ui/RadioGroup.tsx` | native radio inputs, `options: {value,label}[]` | `OptimizerPanel`'s `RadioGroup`/`Radio`/`FormControlLabel` |
| `ui/TextField.tsx` | native `<input>` + stacked/floating label (Tailwind peer-focus positioning), optional `endAdornment` | all raw MUI `TextField` |
| `ui/TextCalculatorField.tsx` (refactor, not new) | rebuilt on `ui/TextField.tsx` internally; external API unchanged for `onCalculate`/`onClear`/`allowClear`/`label`/`value` — the `onCalculate` callback contract is preserved verbatim, so the reads-from-snapshot/writes-to-proxy boundary is untouched (callers wire it to Factory mutators, not this refactor). Drops MUI `slotProps`/`sx`/`variant`/`size` passthrough; callers switch to flat props (`className`/`inputClassName`/`disabled`/`endAdornment`), with `inputClassName` expressing the `htmlInput: {className: "text-right"}` right-alignment several callers rely on | itself (internal swap) — **8 call sites**, not 7: `AvailablePartsEditor`, `ProductionTargetsBar`, `PointValuesPanel`, `ConstraintsPanel`, `ProductionLineRow`, `NestedFactoryRow`, `AssemblyLineControls`, `Recipe` |
| `ui/InlineEditText.tsx` (refactor) | rebuilt on `ui/TextField.tsx` | itself (internal swap) |
| `ui/Select.tsx` | thin wrap of MUI `Select`+`MenuItem` (allowlisted), `options: {value,label}[]` API | `OptimizerRecipeFilters`' game-phase `Select`, `MoveToFolderSelect`'s `TextField select` |
| `ui/Menu.tsx` | thin wrap of MUI `Menu`+`MenuItem`+`ListItemIcon`+`ListItemText` (allowlisted), `items: {label,icon,onClick,danger?}[]` API | `LibraryFactoryMenu`'s raw `Menu` |
| `ui/Tooltip.tsx` | thin wrap of MUI `Tooltip` (allowlisted), standalone (non-button) use | every raw `Tooltip` not already inside `ui/IconButton`/`ui/Icon` |
| `ui/Dialog.tsx` | barrel re-export of MUI `Dialog`/`DialogTitle`/`DialogContent`/`DialogActions` (allowlisted; focus-trap is the hard part MUI already solved, ADR keeps it) | every raw `Dialog*` import outside `ui/` |
| `ui/Drawer.tsx` | barrel re-export of MUI `Drawer` — **requires an ADR-0001 amendment** (D-C1.6) | `LibraryDrawer`'s raw `Drawer` |
| `ui/Tabs.tsx` | hand-rolled `role="tablist"`/`role="tab"` with roving tabindex + arrow-key nav (APG tabs pattern); small fixed set (3 tabs), safe to hand-roll | `SectionTabs`' MUI `Tab`/`Tabs` |
| `ui/Slider.tsx` | thin wrap of MUI `Slider` (allowlisted), keeps the `.MuiSlider-*` `sx` overrides isolated in `ui/` | `AssemblyLineControls`' two raw `Slider` usages (clock speed, Somersloop count) |
| `ui/FactorySelector.tsx` | same wrap-and-hide shape as `PartSelector.tsx` (raw MUI `Autocomplete`+`TextField` inside `ui/`, allowlisted) — a factory-id/label picker, added because `SourceFactoriesEditor`'s Autocomplete has a different options shape than `PartSelector` and routing MUI's `renderInput` params through the new flat `ui/TextField` would drop the combobox's internal ARIA/keyboard wiring | `SourceFactoriesEditor`'s `Autocomplete`+`TextField` renderInput |

`ui/IconButton.tsx` gains an optional `dotBadge?: boolean` prop (small absolutely-positioned dot, replacing `FactoryHeader`'s `Badge` wrap around the Save icon) — one extra prop on an existing primitive rather than a whole new `Badge` primitive for a single call site.

### D-C1.6 — ADR-0001 amendment: add `Drawer` to the allowlist
`LibraryDrawer` is exactly the surface the drawer-loop bug (fixed, see `bug_drawer_loop` memory) lived in — its accessible open/close/focus-restore behavior is hard-won and tested (`tests/e2e/library/open-close-library.spec.ts`). Hand-rolling a Tailwind off-canvas panel would re-implement a focus-trap-adjacent widget from scratch and risk reintroducing that exact class of bug, for a component that already has zero visual `sx` usage today (it's already nearly Tailwind-clean apart from the `Drawer` shell itself). Per the ADR's own reasoning for keeping `Dialog` (`"friendly to the re-enabled a11y rules... keeps MUI's accessible behavior for the widgets that are genuinely hard"`), `Drawer` fits the same bar. This change amends ADR-0001 §"MUI is allowed only for this closed allowlist" to add `Drawer`, with a one-paragraph rationale note added to the ADR itself (not just this design doc) so future readers don't hit the same "why is Drawer allowed" question. `ui/Drawer.tsx` is a thin re-export, `sx` stays out of it (width passed via a plain prop, not `sx`).

### D-C1.7 — `Collapse` → conditional render, no animation
`LibraryFolderRow`'s `<Collapse in={isExpanded} unmountOnExit>` already only renders children when expanded (`unmountOnExit`). Replacing it with `{isExpanded && <>{children}</>}` preserves 100% of the functional behavior and drops only the slide-open cosmetic transition. Given the ADR's driver is developer clarity, not visual polish, and a hand-rolled height-transition (`grid-template-rows: 0fr → 1fr`) adds real complexity (interaction with `overflow`, nested scroll containers) for a tree-row expand that fires rarely, this is the lowest-risk choice. Documented here so it doesn't read as an oversight.

### D-C1.8 — `Popover` (FactoryIconPicker) → anchored absolute panel
Wrap the trigger `IconButton` in a `relative` container; the panel becomes `absolute top-full left-0` inside it (matches the current `anchorOrigin: bottom-left` / `transformOrigin: top-left`). Close-on-outside-interaction reuses the same `onBlur` + `relatedTarget`/rAF-recheck technique `AddItemControl.tsx` already implements (no new hook extracted — this is the second use of the pattern, not yet a third, so keeping it inline in both places is still simpler than an extraction per "no premature abstraction").

### D-C1.9 — `Alert` (SectionTabs solver error) → plain banner
`<div role="alert" className="m-2 text-sm ...">` — no MUI. `role="alert"` alone (assertive live region) matches what `Alert severity="warning"` provided semantically; visual severity communicated via existing amber Tailwind classes, not a new component.

### D-C1.10 — `List`/`ListItemButton`/`ListItemText` (FactoryPickerDialog) → `ActionRow`
Each candidate factory row becomes an `<ActionRow>` (existing primitive, already used identically for clickable rows elsewhere, e.g. `LibraryFolderRow`) wrapped in a plain `<ul>`/`<li>`.

### D-C1.11 — `Typography`/`Badge` (StorageConsentDialog / FactoryHeader) → plain markup
`Typography` → `<p>` with existing Tailwind text utility classes (`text-sm text-gray-400` etc., matching `variant="body2" color="text.secondary"`). `Badge` → the new `ui/IconButton` `dotBadge` prop (D-C1.5).

## Decisions — C3 (resilience)

### D-C3.1 — `saveLibrary`/`writeAutosave` return success, don't throw
`storage-service.ts`: `saveLibrary(library): boolean` (wraps `localStorage.setItem` in try/catch, returns `false` on any exception instead of throwing) and `writeAutosave(...): boolean` (same shape, replacing the current silent-swallow). Both are pure functions with no React/toast access (module stays hook-free per AGENTS.md's error-handling convention — "storage ops: silent try/catch, return null/undefined on failure").

### D-C3.2 — Toast-surfacing lives in the two hooks that already centralize storage calls
`useLibrary.ts` already funnels every mutation through its own callback closures, each calling `saveLibrary` once. Add one internal helper `persist(lib): StorageLibrary` that calls the (now-boolean) `saveLibrary`, and on `false` calls `show({variant:'error', message: "Couldn't save your library — your browser's local storage may be full. Export a backup to avoid losing work."})`; all **9** existing callbacks (`replaceLibrary`, `updatePartPointOverrides`, `renameFactory`, `renameFolder`, `deleteFactory`, `deleteFolder`, `duplicateFactory`, `addFolder`, `moveFactory`) call `persist` instead of `saveLibrary` directly. `useFactorySession.ts` gets the same one-helper treatment for its own 3 call sites (slug-backfill save in `loadSerialized`, both branches of `doSave`) — and critically, `doSave` only calls `setIsDirty(false)` when the save actually succeeded, so a failed save leaves the dirty badge lit (the whole point of D-C3.1/2). That's 12 call sites across 2 files. A 13th call site — `saveLibrary(migrated)` inside `storage-service.ts:40`'s own `loadLibrary()` (the post-migration write-back) — is deliberately left non-surfacing: `storage-service.ts` is hook-free per AGENTS.md's error-handling convention and can't call `useToast()`. The boolean return is ignored there with a one-line comment explaining why, not silently dropped by accident.
`useAutosave.ts`'s `flush()` gets `useToast()` too: when autosave is disabled and `writeAutosave` returns `false`, show the same error toast — but **only on the interactive flush path** (the debounced-write-after-edit call), not the `beforeunload`/unmount cleanup calls to the same `flush()` (`useAutosave.ts:91,95`): the page is tearing down there, a toast can't paint, and setting React state during unmount is itself a footgun. `flush()` takes an internal `{ interactive: boolean }` distinction (or checks `document.visibilityState === "visible"`) so only the in-session path shows the toast.

### D-C3.3 — Quota-approaching warning
New `estimateStorageBytes(library): number` in `storage-service.ts` (`new Blob([JSON.stringify(library)]).size`), and a constant `LOCALSTORAGE_WARN_THRESHOLD_BYTES = 4_500_000` (90% of the conservative 5MB quota). `useLibrary.ts`'s `persist()` helper checks size after a successful save and shows a one-shot `info` toast ("Your factory library is approaching the browser storage limit... consider exporting a backup") gated by a `useRef<boolean>` "already warned" flag so it doesn't refire on every subsequent save this session.

### D-C3.4 — `ErrorBoundary`
New `app/components/ui/ErrorBoundary.tsx`, a class component (React requires this — no hook equivalent exists) with `componentDidCatch`/`getDerivedStateFromError`. Fallback UI: an error message + a "Try again" button (`setState({hasError:false})`) + an "Export your data" button that reads the raw library via the existing `loadLibrary()` (not through any of the now-possibly-broken render state) and calls the existing `downloadJson(lib, "satisfactory-factories-recovery.json")`. Mounted in `app/page.tsx` wrapping `<FactoryPage />` — the actual top-level app content, below `ToastProvider`/`ThemeRegistry` in `layout.tsx` (that ancestor chain must stay intact so a crash still gets themed, toast-capable fallback chrome, though the fallback itself doesn't call `useToast()` — it's a static recovery screen, not a toast).

### D-C3.5 — Close the C2 toast-queue follow-up
`ToastProvider.tsx`'s reducer: add `TOAST_MAX_QUEUE = 20`; on `"add"`, if `state.length >= TOAST_MAX_QUEUE`, drop the oldest entry (`state[0]`) before appending. Prevents unbounded growth from repeated sticky `error` toasts (e.g. a user with storage full who keeps editing) while preserving FIFO surfacing semantics from the C2 design.

## Decisions — C4 (a11y)

### D-C4.1 — `RateDisplay` icon affordance
`rate-status.ts`'s `rateStatusColor()` returns one of `text-green-500`/`text-amber-500`/`text-red-500`/`""` (balanced-and-neutral). `RateDisplay.tsx` gains a `status` prop derived the same way callers already derive `colorClass` (or callers keep passing `colorClass` for the text color and additionally pass a semantic `status: "surplus"|"deficit"|"balanced"|"slooped"`) rendering a small leading icon (reusing existing `@mui/icons-material` already in the bundle, e.g. `TrendingUpIcon`/`TrendingDownIcon`/`CheckIcon` — icons are exempt from the MUI-import ban) with `aria-hidden`, sitting before the numeric text. `ProductionLineRow.tsx` and `Recipe.tsx` — the two call sites that today inline color logic instead of using `RateDisplay` (per the explore-agent survey) — switch to rendering through `RateDisplay` so the icon fix has one home instead of three, per the AGENTS.md "single primitive home" pattern already established for this exact component. `PartRateSummary.tsx` (already using `RateDisplay`) gets the icon for free.

### D-C4.2 — Keyboard-accessible sidebar splitter
`FactorySidebar.tsx`'s resize handle becomes a real `<button type="button">` — or, more accurately, a `role="separator"` per the WAI-ARIA "window splitter" pattern (`aria-orientation="vertical"`, `aria-valuenow`/`aria-valuemin`/`aria-valuemax` mirroring `useDragResize`'s `MIN_WIDTH`/`sidebarWidth`/`MAX_WIDTH`) with `tabIndex={0}` and an `onKeyDown` handling `ArrowLeft`/`ArrowRight` (±10px per press, clamped) calling the same `setSidebarWidth`/persist path `useDragResize` already exposes for mouse drag. `useDragResize.ts` gains a `handleResizeKeyDown` alongside the existing `handleResizeDividerMouseDown`, sharing the same clamp/persist logic (`Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, ...))` then `persistSidebarWidth`). The `biome-ignore lint/a11y/noStaticElementInteractions` on line 10 is deleted — the element is now a properly-roled interactive element, not a static one with a handler bolted on.

## Decisions — C5 (docs)

### D-C5.1 — `docs/game-data.md`
New file recording: current data reflects Satisfactory (game version — pinned from the most recent `data.json` regeneration the user can confirm, or marked "unknown, predates this doc" if unrecoverable — see Open Questions), size (828KB / 26,191 lines, 7 top-level sections: items/buildings/generators/miners/recipes/resources/schematics), that no regeneration script exists in-repo today (confirmed via repo-wide search), and the manual procedure to regenerate (source likely a community `docs.json` extract — the doc records this as "presumed, unconfirmed" rather than inventing a false provenance chain, since the git history search found no origin comment). This is honest documentation of an unknown, not a retroactive invention of one.

### D-C5.2 — Live-site click-through
One manual pass hitting `https://machadeon.github.io/the-factory-planner/`: load, create a production line, confirm rates calculate, reload, confirm persistence, open library drawer + a dialog. Closes `github-pages-deploy` tasks 4.2b/5.4/5.5 formally (refactor-review §6.3) — recorded as a completed manual verification step in this change's tasks.md, not a new automated test (the two regression tests that change already added stay as the automated coverage).

## Risks / Trade-offs

- [Full C1 in one change = ~30 files touched] → mitigated by building primitives first, migrating file-by-file with `make verify` checkpoints, and keeping every primitive's external behavior (labels, ARIA, keyboard nav) equivalent to its MUI predecessor rather than redesigning.
- [Hand-rolled `ui/TextField.tsx` floating label ≠ pixel-identical to MUI outlined variant] → accepted; functional parity (label text, placeholder, disabled, adornment) is the bar, not pixel match, matching ADR's stated driver.
- [`ui/Tabs.tsx` hand-rolled keyboard nav could regress vs MUI's tested implementation] → small, fixed 3-tab set; APG pattern is well-documented; covered by an integration test (arrow-key moves focus + activates).
- [ADR amendment for `Drawer` is a scope call, not originally authorized] → flagged explicitly in this design; the alternative (rewriting the drawer, risking the historical focus-loop bug) is worse. If the user disagrees at tasks-review, this is the one decision to revisit before implementation.
- [`saveLibrary` signature change (`void` → `boolean`) is a breaking internal API change] → all call sites are inside this repo (grep-confirmed, ~11 sites across 2 files) and get updated in the same change; TypeScript makes any missed site a build error, not a silent bug.
- [Toast-based storage-failure UX could feel noisy if quota is chronically near-full] → the quota-warning is one-shot per session (D-C3.3); error toasts are already sticky/dismissible per the existing toast contract.

## Migration Plan

Additive-then-subtractive: build new `ui/` primitives first (pure additions, no existing call site touched), then migrate call sites file-by-file (each migration is a mechanical swap plus a compile/lint/test checkpoint), then delete the now-unused MUI imports. `make verify` after each logical group (primitives; then per-directory batch: optimization/, planning/, library/, factory/). No data/storage-format changes from C1. C3's `saveLibrary` signature change is the only cross-cutting non-additive edit and is done as its own task with all call sites updated together. Rollback = revert the change; nothing here is persisted state.

## Open Questions

- C5's exact game version string: if the user (or repo history) can't confirm which Satisfactory patch `data.json` reflects, `docs/game-data.md` records "unknown — predates this doc" rather than guessing. Not blocking.
- None of the above block implementation; the Drawer ADR amendment (D-C3.6/D-C1.6) is the one decision worth a second look at tasks-review before code is written.
