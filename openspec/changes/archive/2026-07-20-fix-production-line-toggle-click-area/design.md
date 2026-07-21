## Context

`ProductionLineRow` (`app/components/planning/ProductionLineRow.tsx`) renders one row per production line. Today only the inner `ActionRow` (wrapping the chevron/icon/part-name) is clickable and carries `aria-expanded`; it renders a real `<button>`. The rest of the row — the "Actual: rate" text, whitespace between controls, and the row's own padding — has no click handler, so #22 reproduces: name toggles, rate text doesn't.

`ActionRow` (`app/components/ui/ActionRow.tsx`) is documented as "must not contain other interactive elements — rows that need trailing controls use the split-row pattern (outer div carries the visual classes, ActionRow wraps only the leading/primary-action content)." The row already follows that pattern: outer `<div>` has `rowVisualClasses`, inner `ActionRow` wraps only the leading block.

## Goals / Non-Goals

**Goals:**
- Any click on non-interactive-control header content (icon, part name, "Actual: rate" text, header whitespace) toggles expand/collapse.
- Keyboard users can toggle via a single focusable element with `aria-expanded`.
- No change to nested control behavior (Output Rate field, Production Rate field, Edit/Autocalculate, Maximize, Delete).

**Non-Goals:**
- Making the row's trailing controls (TextFields, IconButtons) part of the same tab stop as the toggle — they stay independently focusable, as today.
- Clicks on the expanded assembly-line list content below the row header.

## Decisions

**D1: Extend the existing `ActionRow` to wrap the full non-control header content, rather than adding `role="button"`/`tabIndex`/`onKeyDown` to the outer `<div>`.**

Putting `role="button"` + `tabIndex` on the outer `<div>` while it still contains real `<button>` and `<input>` descendants (the rate fields, Edit/Maximize/Delete buttons) creates an ARIA interactive-in-interactive violation — screen readers do not support focusable/interactive descendants inside an element exposed with the `button` role, and it conflicts with `ActionRow`'s own documented constraint ("must not contain other interactive elements").

Instead: restructure the row so `ActionRow` (still `bare`, still a real `<button>`, still carrying `aria-expanded`) wraps everything in the header that is *not* one of the R2-enumerated controls — icon, part name, the "Actual: rate" text/diff, and the layout whitespace between them — while the rate `TextField`/`TextCalculatorField`s and the four `IconButton`s move to live as siblings *after* the `ActionRow` inside the same outer flex row (as they already visually are), not nested inside it.

This satisfies spec R1/R3 as written: R1's "not itself an interactive control" and R3's "entire `ProductionLineRow` header" are scoped by R2's enumeration, and a native `<button>` gets Enter/Space/`aria-expanded` for free — no custom `role`/`tabIndex`/`onKeyDown` needed. Alternative considered: outer-div `role="button"` — rejected for the ARIA-nesting violation above.

**D2: Reorder the flex layout so `ActionRow` grows to fill the space currently occupied by the bare `<p className="grow">`.**

The "Actual: rate" block currently sits after the rate controls in DOM/flex order (`ActionRow` → SuggestedActions → rate controls block → Actual `<p>` → Delete button). Move the Actual `<p>` content inside `ActionRow`, immediately after the icon/name block, so the single clickable `<button>` visually spans icon + name + actual-rate, matching the issue's reproduction steps (name and rate both toggle). Rate controls and Delete stay in their current visual position, outside `ActionRow`. `ActionRow`'s payload (icon, part name, unit spans, rate-diff spans) is all non-interactive markup, so this is compliant with `ActionRow`'s documented "must not contain other interactive elements" constraint — confirmed by reading the moved JSX, no `<input>`/`<button>` descendants are introduced.

The outer `<div>`'s `grow` class moves from the `<p>` to `ActionRow` itself (`className` prop already supported), so `ActionRow` — now the widened button — takes over the flex-grow slot the `<p>` previously held. Row height and wrap behavior on narrow viewports are unchanged: the flex container (`flex flex-row items-center gap-x-2`) and its children's widths are otherwise untouched; only which element carries `grow` changes, from `<p>` to `<button>`.

Alternative considered: keep DOM order and instead wrap icon+name+actual-rate in a `<button>` styled with `display: contents` — rejected as unnecessary complexity; moving the JSX achieves the same visual result with less styling risk.

**D3 (dropped): `stopPropagation` on `IconButton`s.** Originally proposed to guard against bubbling into a row-level toggle. Under D1/D2 the outer `<div>` never gets a click handler — only `ActionRow` toggles, and the `IconButton`s sit outside it as plain siblings. No listener exists above them to bubble into, so `stopPropagation` would be dead code. Not adding it.

**D4 (considered, rejected): scope hover/active affordance to `ActionRow` only.** `rowVisualClasses` (`app/components/ui/interactive-styles.ts`) is documented in-file as the established pattern for split-rows: outer `<div>` carries row-wide hover/border/background while an inner bare `ActionRow` is the actual control. Narrowing hover to just `ActionRow`'s bounds would require splitting the bundled `interactiveWarningClass`/`interactiveDangerClass` strings (border+background+hover combined) into separate layerable pieces — a shared-primitive refactor touching every other split-row consumer of `rowVisualClasses`, out of scope for this bug fix. Row-wide hover slightly overstating the clickable area is an existing, accepted characteristic of the split-row pattern elsewhere in the codebase, not a regression introduced here; left as a trade-off (see Risks).

## Risks / Trade-offs

[Row-wide hover/active background (`rowVisualClasses` on the outer `<div>`) continues to cover the rate fields and `IconButton`s, which — after this change — are non-toggling siblings of the now-narrower `ActionRow` control. Hovering there still shows the row's hover tint even though clicking there doesn't toggle.] → Accepted trade-off: this is the pre-existing, documented behavior of the split-row pattern used elsewhere in the codebase (see `rowVisualClasses` comment), not a regression introduced by this change. Splitting the bundled variant classes to scope hover precisely was considered (D4) and rejected as out-of-scope shared-primitive work for a bug fix.

[Restructuring `ActionRow`'s children changes visual layout (icon/name/actual-rate now grouped together, rate controls now visually separate group)] → Confirmed acceptable with user during spec grill; covered by existing visual regression via manual check per `AGENTS.md` UI-change testing guidance, no dedicated visual snapshot test in this repo.

[`SuggestedActions` (accept/reject buttons for auto-created lines) currently renders as a sibling after `ActionRow` — must stay outside the new `ActionRow` bounds too] → Verify placement unaffected; it already sits outside `ActionRow` today, no change needed there.

[Moving the "Actual" text inside a `<button>` changes its accessible name if `aria-label` isn't set — a `<button>` with `aria-expanded` and no `aria-label` gets its accessible name from visible text content, which now includes "Actual: <rate>", making the accessible name longer/noisier for screen readers] → Add an explicit static `aria-label` (e.g. `"${part.name} production line"`, no "expand"/"collapse" wording baked in) to `ActionRow`, and rely on `aria-expanded` alone — not a hand-toggled label string — to convey open/closed state, per standard ARIA disclosure-button practice. This avoids a stale label if `aria-expanded` and label text ever fall out of sync.

## Migration Plan

Single-PR change, no data migration. No feature flag — `ActionRow` restructuring is behavior-only and covered by the new integration test before merge.

## Open Questions

None outstanding — scope confirmed via grill-me during proposal and specs phases.
