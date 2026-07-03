# Component Architecture Refactor Plan

Status: PROPOSED — feeds the OpenSpec `spec-driven-reviewed` process; each phase below is intended to become one `/opsx:new` change.

Companion: `model-refactor.md` covers the model layer. The two plans share ownership of several `app/models/` files and a single combined sequencing table (section 7 / model plan section 6). Where a models file appears in both, the model plan owns its creation; this plan consumes it.

## 1. Goals

- **One file, one purpose.** Every file either renders one piece of UI, owns one piece of state logic, or exports one set of related pure functions.
- **Single home for common UI.** Icon buttons, confirm dialogs, inline-rename fields, "add item" reveals, collapsible sections, unit formatting — each exists exactly once.
- **Testability.** State logic moves out of JSX into hooks and model/service functions that vitest can exercise without mounting the whole app. Components become thin enough for React Testing Library.
- **Scoped re-renders.** Today every edit re-renders the entire tree (root version counter). Reactivity moves to valtio: components subscribe to the fields they read via `useSnapshot`, so a rate edit re-renders one row, not the page.
- **Consistency.** One naming convention, one directory taxonomy, one icon-rendering path, one interactive-element primitive (a real `<button>`), no `var`, no duplicated dialog boilerplate.
- **No behavior change.** This is a pure refactor. E2E suite is the safety net; aria-labels and `data-testid`s are frozen contract.

Out of scope: model-layer redesign — now covered by the companion `model-refactor.md` (god-class split, solver extraction, type-safety, notification seam). Also out of scope: visual redesign, new features.

## 2. Current-state findings

### 2.1 God component: `FactoryComponent.tsx` (1,159 lines)

Owns at least nine unrelated concerns:

| Concern | Evidence |
|---|---|
| Factory session state (name/id/slug/folder/dirty) | ~10 `useState` + `factoryRef` |
| Autosave debounce machinery | `scheduleAutosave`/`flushAutosave` + 5 refs mirroring state |
| URL/history sync (hash tabs, pushState, popstate) | 4 effects, `suppressNextUrlPush` rAF hack |
| Restore-on-mount priority chain | `restoreFactory` (URL → autosave → lastId) |
| Consent gating | `requireConsent`/`pendingAction` state machine |
| Save/load/new/clear flows + 3 confirm dialogs | `doSave`, `handleNewFactory`, inline `<Dialog>` ×3 |
| Import/export + id remapping | `remapImportedLibrary`, `importSingleFactory`, `importLibrary`, `collectFactoryBundle` wiring |
| Sidebar resize drag | `handleResizeDividerMouseDown` + document listeners |
| Page layout (tabs, sections, drawer pinning) | JSX at bottom |

The ref-mirroring (`autosaveEnabledRef`, `doSaveRef`, `buildSerializedRef`, `flushAutosaveRef`, `sidebarWidthRef`, `activeSectionRef`) exists because closures escape React's render cycle — a symptom of too much logic living in one component body.

The "restore a serialized factory into session state" block (set name/id/slug/folder/createdAt/dirty/version/persist) is **duplicated four times** with small variations: `restoreFactory` priority 1, priority 3, the popstate handler, and `loadFactoryFromSerialized`.

### 2.2 Other oversized components

- **`FactoryLibraryDrawer.tsx` (651)** — tree rendering (recursive folder/factory rows), rename editing, move-to-folder select, context menu, two delete-confirm dialogs, import/export, pin toggle, drawer-vs-pinned chrome. Six-plus purposes.
- **`RecipeOptimizerPanel.tsx` (636)** — optimizer config form **plus** non-trivial domain logic (`updatePhase`, `toggleCategory`, `toggleBuilding` cascade rules), module-level building grouping, part-availability editor, source-factory editor, point-values toggle.
- **`ProductionLineComponent.tsx` (599)** — expandable header row, dual rate fields, auto-calc/maximize toggles, suggestion accept/reject + reject-dialog choreography, recipe picker list, factory-candidate picker (with its own inline card markup), two `FactoryPickerDialog` instances, `splitRecipes` math.
- **`FactoryOverviewComponent.tsx` (415)** — five collapsible sections each with bespoke markup: outputs, consumers (with allocation bar), inputs, intermediates, power/modules, suppliers; plus expensive consumer-derivation memo.

### 2.3 Duplication inventory (targets for single-home extraction)

| Pattern | Occurrences |
|---|---|
| `Tooltip > span > Clickable(p-1) > MUI icon` icon-button | ~30 across 10 files |
| Confirm dialog (title/message/cancel/action) | 5: unsaved-load, clear-confirm, delete-factory, delete-folder, reject-all |
| Inline rename TextField (Enter commit / Escape cancel / blur commit) | 2 in FactoryLibraryDrawer (folder + factory) |
| "Add X" reveal (AddIcon button ⇄ inline selector w/ onBlur close) | 5: PlanningSection, ConstraintsPanel, ProductionTargetsBar, RecipeOptimizerPanel ×2 |
| Hidden `<input type="file">` + ref + onChange import | 2: FactoryHeader, FactoryLibraryDrawer |
| Filename sanitize `name.replace(/[^a-z0-9]/gi, "_")` | 2: FactoryComponent, FactoryLibraryDrawer |
| Consumer-factory derivation (deserialize library, net-rate filter) + slug-key memo hack | 2: FactoryOverviewComponent, logistics `deriveConsumers` |
| Power/shards/sloops icon-row display | 2: AssemblyLineControls, FactoryOverviewComponent |
| `slug === "power" ? "MW" : "/min"` unit branching | 4+: ProductionLineComponent, RecipeComponent, PartRateSummary, ProductionTargetsBar |
| Shard-from-clock math `Math.ceil((speed - 100) / 50)` | 2 in AssemblyLineControls (`setSpeed`, `setMachineCount`) |
| Collapsible section header (label + chevron toggle) | FactoryOverviewComponent `SectionHeader` (local), same pattern implicit elsewhere |
| Icon rendering | 3 competing paths: `Icon` (plain img + Tooltip), raw `next/image` (8 files), raw `<img>` (FactoryLibraryDrawer) |
| Suggestion accept/reject wiring (`autoCreated` flag clearing, reject-slug collection) | ProductionLineComponent + OptimizationSection reimplement each other |

### 2.4 Structural and quality issues

- **`Clickable` is a `<div onClick>`** — no keyboard activation, no focus, no role. It is the base of nearly every interactive element, silently violating the project's own test-selector policy (semantic elements + aria-labels preferred). MUI menus are anchored to it via casts.
- **`app/utils.tsx`** mixes three unrelated things: number formatting (`displayNum`), rate color classes (`getColorClassForProductionRate1/2` — names carry zero meaning), and a 300-line expression calculator (tokenize/shunting-yard/RPN).
- **Business logic in JSX files:** reject-all mutation walk (OptimizationSection), `splitRecipes` ratio math and `getProductionRateForRecipe` (ProductionLineComponent), machine-count↔clock-speed↔shard math (AssemblyLineControls), import id-remapping (FactoryComponent), library CRUD orchestration (FactoryLibraryDrawer duplicates storage-service call+save+notify triple around every operation).
- **Prop drilling:** `factory`, `library`, `currentFactoryId`, `onNavigateToFactory` thread through 5 levels (FactoryComponent → PlanningSection → ProductionLineComponent → AssemblyLineComponent → NestedFactoryRow / PartRateSummary → FactoryPickerDialog).
- **Naming inconsistency:** `XxxComponent` suffix on 5 files, none on the other 28. Flat `components/` dir with 33 files plus one `logistics/` subdir that already demonstrates the better structure.
- **Whole-tree re-renders:** every model mutation funnels through `factory.update()` → a single version counter at the root → React reconciles the entire page (all production lines, overview sidebar, logistics wrapper) on every keystroke in a rate field. There is no render scoping anywhere; cost grows linearly with factory size and is worst with the optimizer's eager mode.
- **Misc:** `var` declarations (ProductionLineComponent, RecipeComponent, Clickable); `useEffect`-to-sync-derived-state (`needMoreProduction → setShowRecipes`); `FactoryPickerDialog` instantiated twice with different semantics ("use as recipe" vs "supply from"); `ProductionTargetsBar` accepts dead props "for compatibility".

## 3. Target architecture

```
app/
  lib/                          # pure functions, zero React
    format.ts                   # displayNum, formatRate(part, rate) → "63/min" | "63 MW"
    rate-status.ts              # rateStatus(diff) → 'surplus'|'deficit'|'balanced' + color map
    filenames.ts                # sanitizeFilename(name)
    expression/                 # calculator engine, moved verbatim
      tokenize.ts
      shunting-yard.ts
      rpn.ts
      index.ts                  # calculate()
  models/                       # restructured by model-refactor.md; this plan touches:
    optimizer-config.ts         # CREATED by model M2 (config types + bulk-set fns from factory.tsx);
                                # this plan (4c) moves the updatePhase/toggleCategory/toggleBuilding
                                # cascades from RecipeOptimizerPanel into it
    suggestions.ts              # CREATED by model M2 (reject policy from factory.tsx); this plan (4b)
                                # moves accept/reject-all walks from OptimizationSection +
                                # ProductionLineComponent into it
    assembly-line.ts            # model M1 exports shardsForClock + totalMachines(); this plan (4d)
                                # consumes them from AssemblyLineControls/MachineCountDisplay —
                                # no separate machine-tuning.ts needed
    consumer-links.ts           # OWNED HERE: deriveConsumers + memo key builder (hoisted from
                                # logistics/graph-model, shared with overview)
    library-ops.ts              # OWNED HERE (Phase 2): import remapping from FactoryComponent;
                                # model M5 later absorbs it into the storage/migrations area
  hooks/
    useFactorySession.ts        # valtio proxy store + name/id/slug/folder/dirty + load/new/clear (the ONE restore path)
    useAutosave.ts              # subscribe(factory)-driven debounce, flush-on-unload, enable/toggle, consent-aware
    useFactoryUrlSync.ts        # hash tabs + pushState/popstate + restore-from-URL
    useLibrary.ts               # StorageLibrary state + persisting mutators (rename/move/delete/duplicate/import/export)
    useConsentGate.ts           # requireConsent(action) state machine
    useDragResize.ts            # sidebar divider drag + persistence
  contexts/
    FactoryContext.tsx          # distributes the valtio proxy — replaces factory prop drilling
    LibraryContext.tsx          # { library, currentFactoryId, mutators }
    NavigationContext.tsx       # { navigateToFactory } — replaces onNavigateToFactory drilling
  components/
    ui/                         # design-system primitives; no domain imports allowed
      IconButton.tsx            # <button> + Tooltip + aria-label (kills Tooltip>span>Clickable)
      ActionRow.tsx             # generic clickable row, <button>/role-correct (Clickable successor)
      ConfirmDialog.tsx         # title/message/confirmLabel/danger?/onConfirm/onCancel
      InlineEditText.tsx        # Enter/Escape/blur rename field
      AddItemControl.tsx        # "+ Add X" ⇄ inline child reveal
      CollapsibleSection.tsx    # header + chevron + content-visibility body
      FileImportButton.tsx      # hidden input + trigger button
      Icon.tsx                  # THE icon path (moved; next/image call sites migrate to it)
      Dividers.tsx
      TextCalculatorField.tsx   # moved
      PartSelector.tsx          # moved (game-flavored but reusable input)
      RateDisplay.tsx           # value + unit + status color (single home for MW|/min + colors)
    factory/
      FactoryPage.tsx           # composition root (was FactoryComponent): providers + layout only
      FactoryHeader.tsx
      FactoryToolbar.tsx        # header action buttons split from FactoryHeader
      FactoryIconPicker.tsx
      FactoryJsonDialog.tsx     # extracted from FactoryComponent
      SectionTabs.tsx           # tabs + solver-error alert
      StorageConsentDialog.tsx
    overview/
      OverviewSidebar.tsx       # composition of the five sections
      OutputsSection.tsx
      ConsumersSection.tsx      # incl. AllocationBar
      InputsSection.tsx
      IntermediatesSection.tsx
      PowerSummary.tsx          # shared with AssemblyLineControls' totals row
      SuppliersSection.tsx
      PartRateSummary.tsx
    library/
      LibraryDrawer.tsx         # drawer/pinned chrome only
      LibraryTree.tsx           # sorting + recursion
      LibraryFolderRow.tsx
      LibraryFactoryRow.tsx
      LibraryFactoryMenu.tsx    # context menu
      MoveToFolderSelect.tsx
    planning/
      PlanningSection.tsx
      ProductionLineRow.tsx     # header row: name, rates, toggles (was 1st half of ProductionLineComponent)
      ProductionLineDetails.tsx # expanded body: assembly lines + pickers (2nd half)
      RecipePicker.tsx          # candidate recipe + candidate factory list
      FactoryRecipeCard.tsx     # the inline candidate-factory card markup
      AssemblyLine.tsx
      AssemblyLineControls.tsx
      MachineCountDisplay.tsx
      ClockDisplay.tsx
      Recipe.tsx                # was RecipeComponent
      RecipePartsGrid.tsx       # ingredient/product grid halves of RecipeComponent
      NestedFactoryRow.tsx
      SuggestedActions.tsx
      RecipeRejectDialog.tsx
      FactoryPickerDialog.tsx   # gains explicit `mode: 'recipe' | 'supplier'` label text
    optimization/
      OptimizationSection.tsx
      SuggestionsPanel.tsx      # accept/reject-all block extracted
      ProductionTargetsBar.tsx  # dead props removed
      ConstraintsPanel.tsx
      OptimizerPanel.tsx        # slimmed: objective/run-mode/overwrite only
      OptimizerRecipeFilters.tsx# phase/category/building switches
      AvailablePartsEditor.tsx
      SourceFactoriesEditor.tsx
      PointValuesPanel.tsx
      RecipeListPanel.tsx
      RecipeOverrideRow.tsx
    logistics/                  # already well-factored; only naming/context alignment
      ...
```

Component naming: drop the `Component` suffix everywhere; PascalCase files; one exported component per file (existing rule). Directory groups by feature, `ui/` strictly domain-free (enforceable with a lint rule or review convention).

### State pattern: valtio

The domain stays a mutable class graph (`Factory`/`ProductionLine`/`AssemblyLine` — load-bearing for the LP solver), and valtio provides the reactivity layer over it. Valtio is chosen because it is mutable-model-native: `proxy()` wraps the existing class instances unmodified (no decorators, no immutable rewrite — which is why Redux/Zustand are non-starters here), mutations are tracked automatically, and `useSnapshot` gives per-property subscriptions.

Rules of the architecture:

- `useFactorySession` creates the store: `proxy(new Factory())` (or `proxy(deserializeFactory(...))` on restore). It is the only place a Factory instance is created or swapped.
- `FactoryContext` distributes the **proxy**. Components call `useSnapshot(factory)` for anything they render, and call model methods / assign fields on the **proxy** (never the snapshot) to mutate. Reads-from-snapshot, writes-to-proxy is the single convention to enforce in review.
- The root version counter does not exist. Re-render scope = the fields a component's snapshot actually read.
- Autosave and dirty-tracking hang off `subscribe(factory, cb)` (batched, debounced) instead of being smuggled through `factory.update`.
- Transitional shim: until model M4 internalizes derived-state recompute, `useFactorySession` assigns `factory.update = () => factory._updateRates()` — recompute only, no React coupling. The rebuilt `rateLookup` is itself a tracked write, so dependent components re-render naturally. Model M4 deletes the shim along with the `update` field. Nothing else in the component tree may touch `factory.update`.
- Snapshot semantics with class methods: pure read methods (`getPartProductionRate`, `getMachineCount`, …) are called on snapshots and must stay side-effect-free; valtio preserves prototypes on class snapshots. Solver scratch state gets `ref()`-exempted from tracking in model M4.

## 4. Phases

Each phase is an independent OpenSpec change, lands green (unit + integration + e2e), and is shippable alone. Order minimizes rebasing: primitives first, then the god component, then consumers of both.

### Phase 1 — `lib/` extraction + UI primitives (foundation)

1. Split `app/utils.tsx` → `lib/format.ts`, `lib/rate-status.ts`, `lib/expression/*`. Old import sites updated; `getColorClassForProductionRate1/2` renamed to intention-revealing API (`rateStatusColor(diff, { surplusIsGood })` or similar) with unit tests locking current class outputs.
2. Build `components/ui/`: `IconButton` (real `<button>`, required `aria-label`), `ActionRow`, `ConfirmDialog`, `InlineEditText`, `AddItemControl`, `CollapsibleSection`, `FileImportButton`, `RateDisplay`. Each gets an integration test (render, click, keyboard for IconButton/ActionRow, Enter/Escape for InlineEditText).
3. Migrate the ~30 `Tooltip>span>Clickable` icon-button call sites and the 5 confirm dialogs to the primitives. Delete `Clickable` at the end of the phase (or keep temporarily as deprecated shim if call-site count forces splitting the change).
4. Standardize icons: all small game-asset images go through `ui/Icon`; remove per-file `next/image`/raw-`img` variants.

Risk note: `Clickable`→`<button>` changes DOM structure. E2E selectors use roles/testids so `getByRole('button')` starts matching *more* elements — audit selectors that assume uniqueness. Keyboard activation becomes newly possible (improvement, not regression).

Prerequisite from model plan: model M0 bug fixes land first (see combined sequencing, §7) so refactor commits stay behavior-pure and don't silently absorb the `_obj` accumulation / stale-lookup fixes.

### Phase 2 — decompose `FactoryComponent` into hooks + composition root

1. Extract pure/model logic first (no React): `models/library-ops.ts` (`remapImportedLibrary`, single-factory/library import merge), filename sanitize to `lib/filenames.ts`. Unit tests. (`library-ops.ts` is transitional — model M5 later folds it into the storage/migrations area; the extraction and its tests carry over unchanged.) Model M1 has already moved `downloadJson` out of storage-service by this point — import it from its `lib/` home.
2. Extract hooks one at a time, each with its own change-safe commit: `useConsentGate`, `useAutosave`, `useLibrary`, `useDragResize`, `useFactorySession`, `useFactoryUrlSync` (last — it depends on session). The four duplicated "restore serialized → session state" blocks collapse into one `loadSerialized(sf, lib)` inside `useFactorySession`.
3. This phase introduces the valtio store (adds the `valtio` dependency): `useFactorySession` wraps the Factory in `proxy()`, deletes the version counter and the React-coupled `factory.update` body (transitional recompute-only shim per §3 State pattern), and `useAutosave` moves from update-callback plumbing to `subscribe(factory, …)`. At this point `FactoryPage` still renders via one root `useSnapshot`, so re-render behavior is unchanged — fine-grained scoping arrives as Phases 3–4 push `useSnapshot` down the tree.
4. `FactoryComponent` becomes `factory/FactoryPage.tsx`: calls the hooks, mounts providers, renders layout. Target ≤150 lines. Extract `FactoryJsonDialog`, `SectionTabs` as part of this.
5. Hook tests via `renderHook` (vitest + jsdom): autosave debounce/flush timing driven by valtio `subscribe` (fake timers + real proxy mutations), consent-pending action replay, URL restore priority chain (URL → autosave → lastId), popstate suppress behavior. These are currently only covered indirectly by e2e; this phase is the testability payoff.

### Phase 3 — contexts (kill prop drilling, scope re-renders)

1. Introduce `FactoryContext` (distributes the valtio proxy), `LibraryContext`, `NavigationContext`; provided by `FactoryPage`.
2. Migrate consumers top-down: sections stop forwarding `factory`/`library`/`currentFactoryId`/`onNavigateToFactory`; leaf components read contexts. Props that remain are the ones that genuinely vary per instance (`part`, `assemblyLine`, `productionLine`, `rate`…).
3. As each consumer migrates, it takes its own `useSnapshot` (of the factory or of the specific sub-object it renders, e.g. `useSnapshot(assemblyLine)`) and the root-level snapshot shrinks correspondingly — this is where the every-edit-redraws-everything problem actually dies, measurably: add a before/after render-count integration test on "edit one rate field" (expect: that row re-renders, sibling rows and overview sections do not).
4. Remove dead compatibility props (`ProductionTargetsBar` library/currentFactoryId passthrough).

### Phase 4 — split the remaining big four

1. **Library drawer** → `library/` per the tree above; CRUD orchestration (mutate → save → notify) moves into `useLibrary` mutators so rows call `library.renameFactory(id, name)` instead of hand-rolling the triple.
2. **Production line** → `ProductionLineRow` + `ProductionLineDetails` + `RecipePicker` + `FactoryRecipeCard`; suggestion accept/reject slug-collection logic moves into `models/suggestions.ts` (file already exists after model M2 — extend it, sharing with OptimizationSection's accept-all/reject-all). Replace the `useEffect(needMoreProduction → setShowRecipes)` sync with derived rendering + a user-intent state ("manually opened picker").
3. **Optimizer panel** → `OptimizerPanel` + `OptimizerRecipeFilters` + `AvailablePartsEditor` + `SourceFactoriesEditor`; cascade rules (`updatePhase`, `toggleCategory`, `toggleBuilding`) move into `models/optimizer-config.ts` (created by model M2) with unit tests (they're pure config→config functions and currently untested).
4. **Overview** → per-section components in `overview/`; `deriveConsumers` becomes the single shared implementation in `models/consumer-links.ts` (logistics already has it — hoist, don't duplicate); power/shards/sloops row becomes `PowerSummary` shared with `AssemblyLineControls`; machine-count/shard call sites switch to `shardsForClock` + `totalMachines()` exported from `models/assembly-line` in model M1 (no new file). If model M3 has landed, use the discriminated `MachineCount` instead of `"fullMachines" in count` probes.

### Phase 5 — naming, layout, and sweep

1. Move remaining files into feature directories; drop `Component` suffixes; update imports (mechanical, `git mv` to preserve history).
2. Sweep: remove `var`, remove re-exported `clickableClass` string constants (RecipeComponent/ProductionLineComponent compose `ActionRow` instead), delete dead code, `npm run lint-fix`.
3. Update `AGENTS.md` (state-pattern section documents the valtio pattern — proxy in `useFactorySession`, reads-from-snapshot/writes-to-proxy, contexts; directory map) and integration-test imports.

## 5. Testing & verification strategy

- **Freeze the contract first.** Before Phase 1, capture the full e2e suite green as baseline. Aria-labels and `data-testid`s must not change; any selector that must change (Clickable→button) is called out in that change's spec.
- **Per-phase gates:** `npm run test:run` + `npm run test:e2e` green; `npm run build` clean.
- **New tests land with their phase:** ui primitives (Phase 1), hooks (Phase 2), extracted model logic — optimizer cascades, suggestion walks, consumer-links, library ops (Phases 2/4). These are net-new coverage on logic that today hides inside JSX. (Solver/metrics/shard-math tests belong to the model plan's phases, not here.)
- **No mixed changes:** a refactor commit never alters behavior; behavior bugs found along the way (e.g. `FactoryHeader` disabled-look expand buttons still clickable via keyboard once buttons are real) are logged as separate bug changes, not fixed inline.

## 6. Risks

| Risk | Mitigation |
|---|---|
| Clickable→button DOM/selector fallout | Phase-1-only change; e2e audit in spec; role-based selectors get *more* correct |
| Missed re-renders after valtio migration (component reads proxy instead of snapshot, or mutation bypasses the proxy) | Reads-from-snapshot/writes-to-proxy convention enforced in review; render-count integration tests (Phase 3.3); Phase 2 keeps one root snapshot so behavior is bitwise-identical until scoping starts |
| Snapshot vs class-instance edge cases (frozen snapshots passed where mutation expected, method identity, MUI props) | Pure-read discipline on model methods; spike test in Phase 2 covering `getMachineCount`/`getPartProductionRate` via snapshot; escape hatch: read via proxy + `subscribe` for any component that misbehaves |
| Proxy tracking overhead on solver-heavy operations | Solver mutates plain model objects, not the proxy, except `_applyRates`; model M4 `ref()`-exempts scratch state; profile eager mode before/after Phase 2 |
| URL/popstate hook extraction breaks history edge cases | Port the existing comments/invariants as test cases first (suppress-push rAF, hash-only nav, deleted-factory save-as-new) |
| Autosave timing regressions | `useAutosave` unit tests with fake timers before migrating call sites |
| Long-running branch drift | Phases are independent and land to main sequentially; no mega-branch |

## 7. Sequencing summary (combined with model plan)

Single interleaved order — matches `model-refactor.md` §6:

| Order | Change | Plan | Size | Depends on |
|---|---|---|---|---|
| 1 | M0 bug fixes (3 small changes) | model | S | — |
| 2 | Phase 1 `extract-ui-primitives-and-lib` | component | L | — |
| 3 | M1 `model-hygiene` | model | M | — |
| 4 | M2 `split-factory-god-class` | model | L | M0, M1 |
| 5 | Phase 2 `decompose-factory-page` (introduces valtio store) | component | L | 1, M1 |
| 6 | Phase 3 `introduce-app-contexts` | component | M | 2 |
| 7 | M3 `model-type-safety` | model | M | M2 |
| 8 | Phase 4a `split-library-drawer` | component | M | 1–3 |
| 8 | Phase 4b `split-production-line` | component | M | 1–3, M2 |
| 8 | Phase 4c `split-optimizer-panel` | component | M | 1–3, M2 |
| 8 | Phase 4d `split-overview-sidebar` | component | M | 1–3, M1 |
| 9 | M4 `model-reactivity-cleanup` | model | M | M2, Phase 2 |
| 10 | M5 `storage-migrations` | model | M | M2, Phase 2 |
| 11 | Phase 5 `component-naming-and-layout` | component | S | all |

4a–4d are parallelizable once Phase 3 lands (4b/4c also need M2's `suggestions.ts`/`optimizer-config.ts`, which lands earlier at order 4). M3 is independent of the component splits but landing it before Phase 4 lets 4d use the discriminated `MachineCount` directly.
