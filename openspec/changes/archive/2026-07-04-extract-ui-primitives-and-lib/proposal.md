# Proposal: extract-ui-primitives-and-lib

## Why

Common UI patterns are duplicated across the component tree (~30 hand-rolled `Tooltip > span > Clickable` icon buttons, 5 bespoke confirm dialogs, 3 competing icon-rendering paths), and the interactive base primitive `Clickable` is a `<div onClick>` — no keyboard activation, no focus, no role — silently violating the project's own test-selector policy. `app/utils.tsx` mixes number formatting, meaninglessly named rate-color helpers, and a 300-line expression calculator in one file. This is Phase 1 of `plans/component-refactor.md`: it must land first because every later phase (god-component decomposition, context introduction, big-four splits) composes these primitives and lib modules.

## What Changes

This is a **pure refactor** — zero visual change, zero behavior change, with one deliberate exception: interactive elements become real `<button>`s and gain keyboard activation (improvement, explicitly allowed).

1. **Split `app/utils.tsx` into `app/lib/`** with intention-revealing APIs:
   - `lib/format.ts` — `displayNum`, new `formatRate(part, rate)` as single home for the `slug === "power" ? "MW" : "/min"` branching (4+ call sites).
   - `lib/rate-status.ts` — replaces `getColorClassForProductionRate1/2` with a named API (e.g. `rateStatusColor(diff, { surplusIsGood })`); unit tests lock current class outputs before rename.
   - `lib/expression/` — calculator engine (tokenize / shunting-yard / RPN) moved with behavior locked by tests.
   - `withBasePath` (present in utils.tsx but absent from the plan) gets a `lib/` home as part of the same split.
2. **Build `app/components/ui/` primitives**, each with integration tests: `IconButton` (real `<button>`, required `aria-label`), `ActionRow`, `ConfirmDialog`, `InlineEditText`, `AddItemControl`, `CollapsibleSection`, `FileImportButton`, `RateDisplay`. `ui/` is strictly domain-free.
3. **Migrate all existing call sites** (grill decision: all-sites, not plan-literal subset): ~30 icon-button sites, 5 confirm dialogs, AddItemControl ×5, FileImportButton ×2, InlineEditText ×2, RateDisplay unit-branching sites, CollapsibleSection in overview.
4. **Delete `Clickable`** at end of change (deprecated shim permitted only mid-change, must not survive to merge).
5. **Standardize icons** (grill decision: everything, including `page.tsx`): all game-asset images route through `ui/Icon`; **all** `next/image` usage is removed (7 feature components + the `page.tsx` logo, which becomes a plain `<img>` via the base-path helper). The custom image loader (`image-loader.ts` + `next.config.ts` `images` block) becomes dead and is deleted — this modifies the `static-export` spec (loader requirement removed).

Not breaking: no public API, no storage schema, no model changes.

## Capabilities

### New Capabilities

- `ui-primitives`: behavioral contracts of the shared UI primitives — semantic elements, required aria-labels, keyboard activation (Enter/Space on buttons, Enter/Escape/blur on InlineEditText), single-home usage rule (no hand-rolled duplicates of a primitive's pattern).
- `lib-utilities`: pure-function contracts for number formatting (`displayNum`), rate formatting/unit selection (`formatRate`), rate-status color mapping (locked to current class outputs), and base-path prefixing.
- `expression-calculator`: calculator engine behavior (tokenize → shunting-yard → RPN evaluation) preserved verbatim through the move, locked by unit tests.
- `icon-rendering`: one icon path (`ui/Icon`) for all game-asset images; no direct `next/image`/`<img>` for game assets in feature components.

### Modified Capabilities

- `static-export`: R2 (subpath correctness) currently mandates a custom `next/image` loader. With all `next/image` usage removed, the loader requirement is dropped; the single base-path helper becomes the only mechanism for all image sources. Scenarios R2.S2/R2.S5 removed, R2 text updated.

Other existing specs (`rate-solver`, `ui-prefs`, `library-button-visibility`, etc.) have no requirement-level changes; touched components change internals only. Frozen contract: existing aria-labels and `data-testid`s do not change except where enumerated in the spec deltas.

## Impact

- **Affected code**: `app/utils.tsx` (dissolved), `app/components/Clickable.tsx` (deleted), `app/components/Icon.tsx` (moves to `ui/`), ~10+ feature components as call-site migrations (including the big four that Phase 4 later rewrites — accepted double-touch per grill decision), `tests/` imports.
- **New directories**: `app/lib/`, `app/lib/expression/`, `app/components/ui/`.
- **Deleted**: `image-loader.ts`, `next.config.ts` `images` block, `tests/unit/image-loader.test.ts` (base-path coverage moves to the helper's tests); `app/page.tsx` logo switches to plain `<img>` (eager load preserved).
- **Dependencies**: none added.
- **E2E risk**: `Clickable`→`<button>` changes DOM; `getByRole('button')` matches more elements — selector-uniqueness audit required; every changed selector/aria-label must be enumerated in the spec (unlisted change = review reject).
- **Acceptance contract** (grill decision): (a) e2e baseline captured green on main before first implementation commit; (b) `npm run test:run` + `npm run test:e2e` + `npm run build` green; (c) enumerated selector changes only; (d) zero visual change; keyboard activation allowed as new behavior.
- **Sequencing**: M0 bug fixes already archived (prereq met). This change blocks component Phases 2–5.
