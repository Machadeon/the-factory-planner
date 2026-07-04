## Pass 1 — 2026-07-04

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass

_(first pass — none)_

### Findings

- [D1/R2a ActionRow] — `<button>` rows break on nested interactive content: FactoryLibraryDrawer factory/folder rows nest a Clickable icon button ("Actions", FactoryLibraryDrawer.tsx ~253) and a MUI TextField while renaming inside the row Clickable; `<button><button>`/`<button><input>` is invalid HTML and AT flattens descendants into the button's name. design must restructure these rows (e.g. grid row with a primary-action button spanning the label area + sibling icon buttons) or exclude them from ActionRow — and reconcile that with the pixel-identical and frozen-selector claims.
- [D2] — `style="default|warning|danger"` prop shadows React's `style: CSSProperties` on a real DOM-rendering primitive; type confusion and blocks ever passing inline styles. rename to `variant` (Clickable's existing `style` prop dies with it — refactor is the moment).
- [D1/Non-Goals] — "focus indicators native to real buttons" relies on UA default focus ring, which is low-contrast on this app's dark Tailwind surfaces; guidance requires explicit `:focus-visible` styling with sufficient contrast. add a shared focus-visible class to the button-reset constant.
- [D5] — focusout containment via `relatedTarget` misfires: `relatedTarget` is null when focus lands on a non-focusable node inside the wrapper (plain click on text/div) and on window blur, so the control closes while the user is still inside. specify `contains(relatedTarget ?? document.activeElement)` or a microtask/rAF recheck of `document.activeElement`, alongside the already-noted portal risk.
- [D3] — no initial-focus decision for ConfirmDialog: for `danger` dialogs the least-destructive action (cancel) should receive initial focus so Enter doesn't confirm destruction by default; MUI only traps, it doesn't choose. specify initial focus per danger flag.
- [D4] — `cancelledRef` lifecycle unspecified: if the flag isn't reset when a new edit session starts (focus/mount), the first commit after a cancelled edit is silently swallowed. state when the ref resets.
- [D7] — logo is a likely LCP candidate; modern guidance: eager alone is not enough, add `fetchpriority="high"` to the LCP image (attribute-only addition, does not violate behavior-purity).

## Pass 2 — 2026-07-04

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass

- [D1/R2a ActionRow] nested interactive content — resolved: split-row pattern added (outer div keeps Clickable visual classes, inner ActionRow button for the primary action, trailing controls as siblings; rename TextField replaces the inner button, never nests); selector impact addressed.
- [D2] `style` prop shadowing — resolved: renamed `variant` for IconButton and ActionRow, rationale documented.
- [D1/Non-Goals] UA-default focus ring — resolved: shared `focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-500` in the button reset (valid under this project's Tailwind v4, where outline-width utilities set solid style).
- [D5] null-relatedTarget false close — resolved: `wrapper.contains(relatedTarget ?? document.activeElement)` plus rAF/microtask activeElement recheck before closing.
- [D3] ConfirmDialog initial focus — resolved: cancel button `autoFocus` uniformly, least-destructive default for danger dialogs, rationale given.
- [D4] `cancelledRef` lifecycle — resolved: false on mount, reset on input focus; commit-swallowing case closed.
- [D7] LCP priority — resolved: logo gains fetch priority attribute.

### Findings

- [D1 split-row] — click-target shrink: inner button covers only the label region (`grow`), but today clicking the row's leading indent spacer or the factory icon also activates the row (outer div onClick, FactoryLibraryDrawer.tsx ~213-227); split-row silently drops pointer activation on that leading area, a behavior regression vs the behavior-pure claim. specify the inner button wraps all leading content (indent spacer + icon + label), leaving only trailing controls as siblings.
- [D7] — `fetchpriority="high"` is lowercase in the JSX sketch; project is React 19.2 where the prop is `fetchPriority` — lowercase draws an invalid-DOM-property console warning and risks the attribute not being applied. use `fetchPriority="high"` in implementation.

## Pass 3 — 2026-07-04

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass

- [D1 split-row] click-target shrink — resolved: inner ActionRow button now wraps all leading content (indent spacer, icon, label `grow`), matching today's full-row pointer activation; trailing controls stay siblings, verified behavior-equivalent because every trailing control already intercepts via `e.stopPropagation()` (FactoryLibraryDrawer.tsx:256, 354, 367, 380, 397 — confirmed against source).
- [D7] fetch-priority casing — resolved: sketch uses camelCase `fetchPriority="high"` with an explicit React 19 note that lowercase warns as an invalid DOM property.

### Findings

_none — all Pass 1 and Pass 2 concerns resolved; no new conflicts with codebase patterns, modern-web-guidance, or frontend-design floors found in the revised design._
