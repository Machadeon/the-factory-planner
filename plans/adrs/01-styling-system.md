# ADR-0001: Styling system — Tailwind-first, MUI behind `components/ui/` for complex widgets only

- **Status:** Accepted
- **Date:** 2026-07-12
- **Deciders:** Machadeon (via grill-me session)
- **Scope:** Decision only. Physical retrofit is tracked separately as C1 in `plan-order.md`. This ADR fixes the *target end-state and the rules that enforce it*; it does not migrate any component.
- **Backlog item:** A2 in `plan-order.md` / #9 in `codebase-improvements.md`.

## Context

The app currently interleaves two styling systems on the same elements:

- **Tailwind v4** (`className`) — 62 files.
- **MUI v9 + emotion** (`sx` props, `styled`, theme) — 44 files, 16 `sx` blocks.

Concrete symptoms: `AssemblyLineControls` sliders carry `sx` color overrides inside Tailwind flex layouts; `FactoryHeader`'s `TextField` has a 12-line `sx` block next to `className` utilities; hardcoded hex (`#f97316`, `#ec4899`) in `sx` duplicates Tailwind palette values.

**Driver (from grill):** the pain is *developer clarity (c)* and *clean refactor diffs (d)* — not bundle size or theming. Every component edit reopens the question "`sx` or `className` here?", and the upcoming `components/ui/` primitives (component-refactor Phase 1) would otherwise **bake the mixed model in permanently**. Bundle/perf were explicitly ranked secondary, which removes Option A's main upside.

MUI is not used deeply. Real `@mui/material` component usage: `TextField` (7), `Tooltip` (6), `Switch` (5), `FormControlLabel` (4), `Button` (4), `IconButton` (3), `Dialog`/`DialogContent`/`DialogTitle`/`DialogActions` (2), `Autocomplete` (2), `Select`/`Menu`/`List`/`Radio` (1 each), `Slider` (1), `Chip` (1). Plus heavy `@mui/icons-material` usage (~40 distinct icons: Delete×9, Add×6, Edit×4, …).

Current integration (`app/layout.tsx`, `app/components/ThemeRegistry.tsx`): `AppRouterCacheProvider` (emotion cache) → `ThemeProvider(createTheme)` + `CssBaseline`. **No CSS cascade-layer configuration**, so emotion (runtime `<style>` injection) and Tailwind (build-time) race on specificity — a `className` on an MUI element can silently no-op.

## Options considered

| Option | Summary | Verdict |
|---|---|---|
| **A. Full Tailwind + headless primitives** (Radix / React Aria), drop MUI entirely | Smallest bundle, zero style-engine conflict, one system. But forces rebuilding the hardest-to-get-right widgets (Autocomplete/combobox, Slider, Select/Menu listbox) on headless libs — high churn, contradicts driver (d), and lands right as a11y biome rules are re-enabled (#12/C4). Its main upside (bundle) is worth little given the driver. | Rejected |
| **B. Tailwind-first + MUI for complex widgets only** | Keeps MUI for the 4–5 behavior-heavy widgets, Tailwind for everything else. Lowest churn; matches how MUI is already (superficially) used. Risk: the "which system?" boundary must be a bright line, not a per-element judgment call, or it fails to solve driver (c). | **Accepted** (with enforcement below) |
| **C. Full MUI** (`sx`/`styled` everywhere, drop Tailwind) | One system, but the opposite migration — rip out 62 files of Tailwind, commit fully to emotion runtime styling. Largest churn, heaviest runtime, and abandons the utility-CSS model the team already reaches for. | Rejected |
| **D. Status quo (mixed freely)** | Zero work, but is exactly the ambiguity A2 exists to kill and would be frozen into `components/ui/`. | Rejected |

## Decision

Adopt **Option B**, made enforceable by a **wrap-and-hide** boundary so "which system" becomes a lint rule instead of a judgment call:

1. **Tailwind is the default.** All layout and presentational styling uses Tailwind `className`. New components are Tailwind unless they need a widget on the allowlist below.

2. **MUI is allowed only for this closed allowlist of behavior-heavy widgets** (accessible behavior we won't hand-roll):
   - `Autocomplete` (combobox)
   - `Slider`
   - `Select` / `Menu` (listbox/popover)
   - `Dialog` (focus trap)
   - `Tooltip` (positioning + a11y)
   - `Drawer` (focus trap on an off-canvas panel) — **added 2026-07-21 during C1** (`finish-block-c`). `LibraryDrawer` is exactly the surface the drawer-loop bug (fixed, see `bugs`/agent-memory history) lived in; its accessible open/close/focus-restore behavior is hard-won and covered by `tests/e2e/library/open-close-library.spec.ts`. Hand-rolling a Tailwind off-canvas panel would re-implement a focus-trap-adjacent widget from scratch for no `sx`/styling gain (the component was already nearly Tailwind-clean apart from the `Drawer` shell) and risks reintroducing that exact class of bug. Same bar as `Dialog` above.

   Simple widgets currently on MUI — `Button`, `TextField`, `IconButton`, `Switch`, `FormControlLabel`, `Chip`, `Radio`/`RadioGroup` — are **not** on the allowlist and move to Tailwind during C1. Adding a new MUI component to the allowlist requires amending this ADR.

3. **Wrap-and-hide.** Every allowlisted MUI widget lives behind a `components/ui/` primitive (e.g. a `Combobox` wrapping MUI `Autocomplete`). **App code outside `components/ui/` never imports `@mui/material` directly.** This makes the boundary greppable.

4. **Enforcement (biome).** Add a rule forbidding `@mui/material` (and `@mui/material/*`) imports outside `app/components/ui/`. A violation = an unwrapped MUI widget leaking into app code. `@mui/icons-material` is **exempt** — icons are pure SVG components with no emotion/theme welding; routing ~40 icons through wrappers is churn for zero clarity gain.

5. **`sx` policy.** `sx` is **banned in app code**, **allowed inside `components/ui/` wrappers** only. The wrapper is precisely where welded MUI styling is acceptable; the import rule already isolates it.

6. **Emotion/Tailwind cascade ordering (systemic, mandatory).** Fix the specificity race at the framework level, not per-conflict:
   - Set `AppRouterCacheProvider options={{ enableCssLayer: true }}` in `app/layout.tsx` so MUI/emotion emits into a CSS cascade layer.
   - Declare explicit `@layer` order in `app/globals.css` so Tailwind's `utilities` layer wins over MUI's layer (e.g. `@layer mui, theme, base, components, utilities;` — exact ordering finalized in C1).

   Without this, Option B *feels* broken during retrofit (Tailwind overrides silently no-op). It is therefore an ADR-level decision, not a mid-migration discovery.

## Consequences

**Positive**
- "Which system for this element?" becomes a mechanical rule: not in `ui/` → Tailwind, no `@mui`, no `sx`. Solves drivers (c) and (d).
- `components/ui/` primitives are built on the *decided* model, so Phase 1 doesn't fossilize the mix.
- Keeps MUI's accessible behavior for the widgets that are genuinely hard (combobox, focus trap) — friendly to the re-enabled a11y rules (#12/C4).
- Lowest migration churn of the one-system options.

**Negative / costs**
- Two dependencies remain (`tailwindcss`, `@mui/material` + emotion). No bundle win — accepted, since perf isn't the driver.
- The allowlist needs discipline; growth requires ADR amendment (intentional friction).
- The CSS-layer config touches app-wide setup and must land early in C1.

**Deferred to C1 (retrofit), explicitly out of A2 scope**
- Migrating the non-allowlist MUI widgets (`Button`, `TextField`, `Switch`, `IconButton`, `Chip`, `Radio`) to Tailwind primitives.
- Writing the `components/ui/` wrappers for the allowlisted widgets.
- **`CssBaseline` vs Tailwind preflight** — both reset styles and can conflict. Flagged as a known C1 risk; **not decided here** (retrofit-time concern).
- Finalizing the exact `@layer` ordering string and verifying overrides.
- Adding and tuning the biome import rule.

## References
- `plans/codebase-improvements.md` §9
- `plans/plan-order.md` (A2 decision, C1 retrofit)
- `app/layout.tsx`, `app/components/ThemeRegistry.tsx` (current integration)
- `app/components/ui/` (primitive home)
