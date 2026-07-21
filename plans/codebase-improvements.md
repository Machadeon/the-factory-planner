# Codebase Improvements (Beyond the Refactor Plans)

Status: PROPOSED backlog — companion to `component-refactor.md` and `model-refactor.md`. Those two plans cover structural refactoring only; this records everything else worth doing, with the evidence behind each item so a fresh session can act without re-deriving it. Written 2026-07-02 after a full read of `app/` (all components + all models), `tests/`, `tsconfig.json`, `package.json`, and the `bugs/` directory.

Sequencing references like "M2" / "Phase 1" point at the combined ordering table in `component-refactor.md` §7 = `model-refactor.md` §6.

**2026-07-12 consolidation** (Block B0.5, from [refactor-review.md](./refactor-review.md)): this file is the single backlog. Items previously scattered elsewhere, now cross-referenced:

- **Model read accessors / render-side contract** — fully specced in `plan.md` § Improvements ("Audit all model interfaces"); tracked as **D2** in [plan-order.md](./plan-order.md). Read-side counterpart of the M4 mutation contract; includes the `PartRateSummary` render-from-proxy fix.
- `plan.md` § Optimizations "why is deserializeFactory called in a render thread?" — same fix as **#8** below (deserialization caching); do not track twice.
- `plan.md` § Optimizations "prevent occasional freeze for some optimization runs" — same fix as **#6** below (solver worker + timeout).
- Bugs — GitHub issues (see #3 below); the `bugs/` directory is retired.
- Process rule (now in AGENTS.md): open non-blocking review findings must be filed as GitHub issues or added here **before** `/opsx:archive`.

## Priority order

1. CI pipeline (#1) — do first; everything else depends on it
2. Known bugs (#3)
3. Solver worker + library swap (#6, #7) — after model M2
4. Styling-system decision (#9) — during component Phase 1
5. Undo/redo (#11) — after model M4
6. Rest opportunistic. Small items (#2, #10, #14) slot between refactor phases anytime.

## Correctness & confidence

### 1. CI pipeline — biggest gap

*(DONE — A1 landed `ci.yml` (biome/tsc/unit/build blocking); B0.3 made e2e blocking; B0.4 added knip. Evidence below is historical.)*

**Evidence:** no `.github/workflows/` directory exists. Repo has a `Makefile` and full script set in `package.json` but nothing enforces them on push/PR.

Both refactor plans use "e2e suite is the safety net" as their core risk mitigation — currently that net is only as good as whoever remembers to run it. PR gate should run: `biome ci`, `tsc --noEmit`, `npm run test:run`, `npm run build`, `npm run test:e2e` (Playwright needs dev server or `next start` after build; see `playwright.config.ts`).

Caveat: the drawer loop bug (#3) can hang Playwright — may need fixing first or the e2e job needs aggressive timeouts.

### 2. Enable `noUncheckedIndexedAccess`

**Evidence:** `tsconfig.json` has `strict: true` but not `noUncheckedIndexedAccess`. Codebase is index-lookup-heavy with unguarded hits:

- `production-line.tsx` constructor: `recipeLookup[part.slug]` then `.length` — throws if part has no recipes.
- `factory.tsx setPartRate`: `this._productionLineLookup[part.slug]` dereferenced without check.
- `partSlugLookup[...]` / `recipeLookup[...]` unguarded across many components.

One noisy migration change (many `?.`/assertions to add). Best slotted right after model M3 (type-safety pass) while types are already in motion.

### 3. Known bugs backlog

*(2026-07-12: the `bugs/` directory is retired — bugs live in GitHub issues now, `gh issue list --label bug`.)*

- ~~`cannot_optimize_after_reject`~~ — FIXED 2026-07-03 by `fix-stale-production-line-lookup` (root cause was exactly the M0 #3 stale-lookup guess above); manual repro pass recorded in that change's review.
- ~~Drawer open/close infinite loop~~ — FIXED (guard in `handleOpenLibrary` + rAF-deferred focus restore, per agent memory); `tests/e2e/library/open-close-library.spec.ts` covers it, green in CI.
- Open bug issues (migrated/filed 2026-07-12 from the refactor-review audit):
  - [#23](https://github.com/Machadeon/the-factory-planner/issues/23) `splitRecipes` leaves `rateLookup` stale (B2.5 in plan-order — before B3)
  - [#24](https://github.com/Machadeon/the-factory-planner/issues/24) multi-maximize objective overwrite in rate solver (E0 — before E1)
  - [#25](https://github.com/Machadeon/the-factory-planner/issues/25) redundant manual `_productionLineLookup` bookkeeping
  - [#26](https://github.com/Machadeon/the-factory-planner/issues/26) triage `createBaseModel`'s "TODO fix for factories as recipes"

### 4. Silent storage failure = data loss

**Evidence:** `storage-service.ts` `writeAutosave()` catches quota-exceeded and silently ignores. User sees autosave toggle on, believes work is saved, isn't. `saveLibrary()` doesn't catch at all (throws to caller — callers don't catch either).

Fix direction: surface storage failures (keep dirty badge lit + warning toast), monitor serialized library size vs the ~5MB localStorage quota, warn as it grows. Longer-term: IndexedDB migration (also removes the quota ceiling for big libraries with many nested factories).

### 5. React ErrorBoundary

**Evidence:** zero error boundaries in the tree (`app/layout.tsx` → `page.tsx` → `FactoryComponent`). A corrupt library entry, a solver exception, or a deserialize edge case = white screen with no recovery.

One boundary around the factory page with a recovery UI ("export your data" button that dumps raw localStorage library to JSON — the machinery already exists in `downloadJson`).

## Performance

### 6. LP solver off the main thread

**Evidence:** both solvers run synchronously in `factory.tsx` (`autoCalculateRates`, `optimizeRecipes`) on every relevant edit. The optimizer's "eager" mode re-runs the full recipe-selection LP per edit; the UI itself warns "May be slow with many recipes" (`RecipeOptimizerPanel`).

Move solving into a Web Worker + debounce. Precondition: model M2 (solvers extracted into `models/solver/` as pure functions taking snapshots and returning results) — after that, worker-izing is transport, not refactor. Note `structuredClone(model)` already used in maximize path, so models are transferable-friendly.

### 7. Replace `javascript-lp-solver`

**Evidence:** `package.json` pins `javascript-lp-solver@^1.0.3` — unmaintained for ~6 years. Code already compensates for precision issues (fudge factor `* (1 - 1e-8)` on maximize-rate constraints in `optimizeRecipes`).

Candidate: `highs-js` (HiGHS compiled to WASM; actively maintained, much faster, proper MILP support — relevant because factory-as-recipe variables are declared integer via `ints` in `createBaseModel`). Swap is cheap only after M2 isolates the solver behind `models/solver/`; pairs naturally with #6 (WASM in worker).

### 8. Deserialization caching

**Evidence:** two hot spots deserialize the whole library repeatedly:
- `FactoryComponent.deserializedOtherFactories` — memo keyed by `JSON.stringify` of id+products signature (`otherFactoriesKey`).
- Consumer derivation (`FactoryOverviewComponent` + `logistics/graph-model.deriveConsumers`) — memo keyed by joined slug strings, biome-ignore'd exhaustive-deps.

After component plan's `models/consumer-links.ts` exists: single memoized deserialization store keyed by each factory's `updatedAt` (already serialized on every save), replacing the stringify-signature hacks.

## Consistency & UX

### 9. Pick one styling system

**Evidence:** MUI `sx` props and Tailwind utility classes interleaved on the same elements throughout (e.g. `AssemblyLineControls` sliders use `sx` color overrides inside Tailwind flex layouts; `FactoryHeader` TextField has a 12-line `sx` block next to `className` utilities; hardcoded hex `#f97316`/`#ec4899` in `sx` duplicating Tailwind palette values).

The component refactor standardizes *components*, not *styling* — without a decision, `components/ui/` primitives bake the mix in permanently. Decide during component Phase 1. Lean recommendation: Tailwind + headless behavior (keep MUI only for complex widgets — Autocomplete, Menu, Slider, Drawer) rather than full MUI commitment; most MUI usage here is already superficial.

### 10. Kill `alert()`

**Evidence:** 3 call sites, all in `FactoryComponent`: unrecognized import JSON, failed JSON parse, failed factory restore ("Could not restore factory…"). Blocking, unstyled, untestable. Replace with a snackbar/toast primitive in `components/ui/` (Phase 1 addition).

**Status:** Done — C2 `toast-primitive-kill-alert` (2026-07-20) added `app/components/ui/toast/` (`ToastProvider`/`useToast`, Top-Layer popover, error/success/info variants) and swapped all 3 `alert()` sites. **Follow-up for C3:** the toast reducer array is uncapped — unclosed sticky `error` toasts accumulate in state (only 3 render). Add a max-queue cap when the success/info call sites are wired in C3 (LOW, from C2 final review).

### 11. Undo/redo

**Evidence of need:** three "cannot be undone" confirm dialogs (reject-all, delete factory, delete folder) plus unsaved-changes prompts exist *because* nothing is reversible. Serialization already round-trips fully (`serializeFactory`/`deserializeFactory`).

Design: undo stack per user-visible mutation — valtio's `snapshot(factory)` gives cheap structurally-shared snapshots for free, or fall back to `SerializedFactory` snapshots via the existing round-trip. Preconditions: model M4 (mutation contract = clean snapshot points; every user action is one model-method call) and the M4 fix for `new Factory(old)` reference-aliasing (aliased children would corrupt snapshots — see model plan §2.5 #4). Removes most confirm-dialog friction.

### 12. Non-color status signaling + a11y rules

**Evidence:** production-rate status is conveyed by text color alone — amber/red/green from `getColorClassForProductionRate1/2` (`utils.tsx`), pink for slooped overrides (`ProductionLineComponent`, `RecipeComponent`). Nothing for colorblind users. Also `biome.json` has a11y rules disabled (noted in AGENTS.md), historically because `Clickable` was a div.

Fix: add icon/text affordance inside the `RateDisplay` primitive (component Phase 1 gives status display a single home — this becomes a one-file change). Re-enable Biome a11y rules after Phase 1 replaces `Clickable` with real buttons.

### 13. Share factories via URL

**Evidence:** factories live only in localStorage; the bookmarkable URLs (`?factory=slug`) resolve against local data and break on any other machine. Export machinery (`collectFactoryBundle` — self-contained bundle with transitive nested/supplier deps) already exists.

Feature: compress a bundle into the URL fragment (`lz-string` or native `CompressionStream`) for true cross-machine sharing; import path already handles bundle JSON (`rootId` auto-load). Watch URL length limits — large factories may need a "copy share link" that warns or falls back to file export.

## Housekeeping

### 14. Logging strategy

**Evidence:** `factory.tsx` contains ~25 commented-out `console.log`/`console.debug` lines (solver model dumps, timing measurements) plus live `console.warn`s. Delete during M2, or gate behind a debug flag (e.g. `sfp:debug` localStorage key) if the solver-timing dumps are still wanted.

*(2026-07-12: commented-out lines are gone — M2 deleted them (grep confirms zero). Remaining scope: decide a strategy for the ~10 live `console.warn`s in models/solver — keep as-is, or gate/collect. Small; B3 can absorb.)*

### 15. Game-data versioning

**Evidence:** `app/models/data.json` is parsed at module init by `library.tsx`; no record of which Satisfactory game version it reflects or how it was generated. Game patches change recipe rates silently. Record: game version, source (presumably a community data dump/docs.json extract), regeneration procedure. One markdown file + a version constant.

### 16. PWA manifest

Offline-capable planner = natural install target; app is fully client-side already (no server round-trips — URL sync deliberately avoids the Next router for this reason, per `FactoryComponent` comments). Manifest + service worker (next-pwa or hand-rolled) is a cheap win. Low priority.

### 17. Split-row hover affordance overstates clickable area

**Evidence:** From `fix-production-line-toggle-click-area` (2026-07-20, closes #22). `rowVisualClasses` (`app/components/ui/interactive-styles.ts`) paints hover/active background across the entire outer `<div>` of a split-row (e.g. `ProductionLineRow`, `LibraryFolderRow`, `LibraryFactoryRow`), including non-toggling sibling controls (rate fields, icon buttons) that sit outside the inner `ActionRow`. Hovering those controls shows the "clickable to toggle" tint even though clicking there doesn't toggle. Scoping hover precisely to `ActionRow`'s bounds requires splitting the bundled `interactiveWarningClass`/`interactiveDangerClass` strings (border+background+hover combined) into layerable pieces — a shared-primitive refactor touching every `rowVisualClasses` consumer. Considered and rejected as out-of-scope for that bug fix (see its `design.md` D4).

### 18. Weak-testability edge cases flagged during `fix-production-line-toggle-click-area` spec review

**Evidence:** Spec review (2026-07-20) flagged the R1.S5 click-drag-to-select scenario and the R1 exclusion-clause scenario (expanded assembly-line list content shouldn't toggle the row) as edge cases with weak jsdom testability. Resolved during implementation: R1.S5 covered via a `mousedown`/`mouseup`-without-`click` assertion (jsdom doesn't simulate native browser text-selection-suppresses-click behavior, so this tests the app-level contract instead); the exclusion clause covered via a sibling-component structural test in `tests/integration/ProductionLine.test.tsx`. No further action needed — recorded here to satisfy the archive gate's requirement to file non-blocking findings.

## Explicitly considered and rejected

- **i18n** — single-audience hobby tool; cost exceeds value now.
- **Immutable-state store (Redux/Zustand/Immer)** — plain-serializable-state assumptions contradict the mutable class model; adoption would force a model rewrite. The reactivity layer is valtio (mutable-model-native: proxies track the existing class graph unmodified), introduced in component Phase 2 and finished in model M4 — see the plans. MobX was the runner-up (computed values are stronger) but heavier: decorator/`makeAutoObservable` buy-in vs valtio's zero-touch classes.
- **Rate-engine unification** (imperative propagation vs LP) — flagged in model plan §2.7 as product decision, not tech debt; out of scope here too.
