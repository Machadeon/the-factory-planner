# Design: extract-ui-primitives-and-lib

## Context

Phase 1 of `plans/component-refactor.md`. Specs (approved in spec-review Pass 2) define four new capabilities (`ui-primitives`, `lib-utilities`, `expression-calculator`, `icon-rendering`) and one modified capability (`static-export`, image-loader mandate removed). The change is behavior-pure except the sanctioned improvement: interactive elements become real `<button>`s with keyboard activation.

Current state: `Clickable` (`<div onClick>`) underpins ~30 icon buttons and assorted clickable rows across 12 files; 5 confirm dialogs hand-roll MUI `<Dialog>`; `app/utils.tsx` mixes formatting, rate colors, base-path, and a 300-line calculator; icons render via three competing paths (`Icon`, `next/image` ×7 files + page.tsx, raw `<img>`).

## Goals / Non-Goals

**Goals:**

- One home per pattern: `app/lib/` for pure functions, `app/components/ui/` for domain-free primitives.
- Kill `Clickable`, `next/image`, the custom image loader, and `app/utils.tsx` in one change.
- Land the e2e selector audit exactly once.

**Non-Goals:**

- No model-layer changes (model plan owns those), no valtio, no contexts, no component splits (Phases 2–4).
- No naming sweep of feature components (Phase 5).
- No new visual design; pixel-identical output except focus indicators, which are new and explicitly styled (see D1 — UA-default rings are low-contrast on the app's dark surfaces, so the shared reset includes a `focus-visible` outline with sufficient contrast).

## Decisions

### D1 — Button primitives carry Clickable's exact class strings

`IconButton` and `ActionRow` are `<button type="button">` elements composing the same Tailwind class strings Clickable exports today (`cursor-pointer rounded-sm`, hover/active grays, danger/warning borders), plus a button-reset (`appearance-none bg-transparent border-0 p-0 m-0 text-inherit font-inherit text-left`) and a shared explicit focus style (`focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-500`, no outline suppression for keyboard users) so the DOM swap is visually inert for pointer users and clearly focusable for keyboard users. The class constants move into `ui/` (Clickable's file dies with its consumers).

**Rows with interactive descendants do not become single buttons.** A `<button>` cannot contain other interactive elements (invalid HTML; AT flattens descendants into the button's accessible name). Affected sites — FactoryLibraryDrawer folder/factory rows (nest the "Actions" icon button, and a rename `TextField` while editing) and any similar row found during migration — use a **split-row pattern**: the outer `<div>` keeps Clickable's visual classes (hover/active highlight spans the full row, pixel-identical), an inner `ActionRow` button wraps **all leading content** — indent spacer, icon, and label (`grow`) — so the pointer click target matches today's full-row activation everywhere except the trailing controls, which are siblings of that button, not children (they already intercepted clicks via `stopPropagation` today, so net pointer behavior is unchanged). During rename, the `TextField` replaces the inner button — it is never nested inside one. Selector impact: row text moves inside the inner button, so text/name-based queries still resolve; any testid stays on the outer row div.

*Alternative considered*: MUI `IconButton`/`ButtonBase` — rejected: brings MUI ripple/padding/styling that would change appearance and require overrides at every site; the project's styling is Tailwind-first.

- `type="button"` is mandatory (default `type="submit"` would fire form submits — some buttons sit near inputs).
- Tooltip attaches directly to the `<button>` (buttons hold refs natively — the `<span>` wrapper existed only because MUI Tooltip needs a ref-forwarding child and Clickable's div wasn't wrapped consistently). No disabled-button tooltip handling needed: no current icon-button site uses `disabled` (FactoryHeader's "disabled-look" buttons are visually dimmed but active today and stay that way — behavior-pure; the real disabled semantics are a logged follow-up bug, per plan §5).

### D2 — IconButton API

```tsx
<IconButton aria-label="Delete factory" title={optional — defaults to aria-label}
            onClick={fn} variant="default|warning|danger" className?>
  <DeleteIcon fontSize="small" />
</IconButton>
```

Required `aria-label` (compile-time via required prop). Tooltip title defaults to the aria-label, satisfying ui-primitives R2.S1/R2.S2 with one prop at most sites. The style-variant prop is named `variant`, not `style` — Clickable's `style` prop shadowed React's `style: CSSProperties`, which is a type trap on a real DOM-rendering primitive; the rename dies with Clickable (`ActionRow` uses `variant` too).

### D3 — ConfirmDialog wraps MUI Dialog, close reason folded to cancel

Props: `open, title, message (ReactNode), confirmLabel, cancelLabel = "Cancel", severity? = "default" | "warning" | "danger", secondaryLabel?, onSecondary?, onConfirm, onCancel`. MUI `onClose` (backdrop + Escape) routes to `onCancel` — matches R3.S2. `severity` maps the contained confirm button to MUI color primary/warning/error, matching today's delete (error) and reject-all (warning) dialogs; the optional secondary action reproduces the three-choice unsaved-load/clear-confirm dialogs (Cancel / Discard / Save-and-continue) without visual change. The 5 dialogs' current copy moves verbatim into props. *(Amended during implementation — supersedes the earlier `danger?` boolean.)*

Initial focus: the cancel button receives `autoFocus` in every ConfirmDialog (MUI traps focus but doesn't choose a target). For `danger` dialogs this is the a11y-correct least-destructive default — Enter never confirms destruction by accident; for non-danger dialogs it matches MUI's first-focusable behavior with cancel listed first, so it's uniform rather than per-flag.

### D4 — InlineEditText suppresses blur-commit after Escape via ref flag

Internal draft state seeded from `value`; `onCommit(trimmed)` on Enter/blur (fires regardless of change, per R4), `onCancel()` on Escape and on empty-trim commit. Escape sets a `cancelledRef` before parent unmount/state change so the trailing blur is a no-op (R4.S4) — same net behavior as today's `if (!editState) return` guard, but owned by the primitive. Ref lifecycle: `cancelledRef` initializes `false` on mount and resets to `false` whenever the input receives focus (each edit session is one mount in current usage, but the focus reset makes reuse safe — a commit after a previous cancelled session is never swallowed).

*Alternative*: parent-controlled editing state with null-guard (status quo) — rejected: leaves the ordering bug class at every future call site.

### D5 — AddItemControl owns open state; blur-close via focusout containment

`children` is a render prop receiving `close()`. `closeOnBlur` (default `true`) uses a wrapper `onBlur` (focusout) that closes only when focus has genuinely left the wrapper: check `wrapper.contains(relatedTarget ?? document.activeElement)`, and because `relatedTarget` is null both for clicks on non-focusable content inside the wrapper and for window blur, confirm via a rAF/microtask recheck of `document.activeElement` before closing. Net behavior equivalent to today's child-level `onBlur` closes, without the false-close cases. ConstraintsPanel passes `closeOnBlur={false}` (R5.S2 locks its current stay-open behavior). Child content is unmounted on collapse, so partial input discards for free (R5.S3).

### D6 — lib/ layout and APIs

```
app/lib/format.ts        displayNum, rateUnit(part), formatRate(part, rate)
app/lib/rate-status.ts   rateStatusColor(rate, { surplusIsGood: boolean })
app/lib/base-path.ts     withBasePath(path)
app/lib/expression/      tokenize.ts, shunting-yard.ts, rpn.ts, index.ts (calculate)
```

- `rateStatusColor(rate, { surplusIsGood: false })` = old `getColorClassForProductionRate1` (amber surplus, green balanced); `{ surplusIsGood: true }` = old `...Rate2` (green surplus, `""` balanced). One function, one option — the boolean *is* the intention the old numeric suffixes hid. Both variants stay because both are spec-locked (R4), even though variant 2 is currently only test-referenced.
- Expression split is mechanical: `tokenize.ts` exports `tokenize` + the operator/function tables it needs; `shunting-yard.ts` and `rpn.ts` import the tables from a shared `operators.ts` if circularity appears — otherwise tables live in `tokenize.ts`'s sibling `operators.ts` from the start (cleanest: `operators.ts` holds `operators`, `functions`, `minus0Hack`; the three algorithm files import it; `index.ts` re-exports `calculate` plus anything tests need).
- Moves use `git mv` where a file survives mostly intact (utils.tsx → the expression files is the only candidate; history preservation is best-effort).

### D7 — Icon path and next/image removal

- `git mv app/components/Icon.tsx app/components/ui/Icon.tsx`; no API change (R2 icon-rendering locks current contract).
- 7 feature files: `next/image` → `ui/Icon` with `size` = current `width`, `label` = current `alt` where a tooltip is wanted, `label=""` for decorative (preserves current tooltip presence/absence per site — audit each site during migration; `next/image` sites have no tooltip today, so they migrate to tooltip-free usage: `label=""` + visible text, or keep `alt` semantics via label only where the image is the sole content).
- `page.tsx` logo: plain `<img src={withBasePath(...)} alt="Satisfactory logo" width={300} height={20} fetchPriority="high">` — eager (no `loading="lazy"`, R3 icon-rendering) and prioritized as the likely LCP image (attribute-only, behavior-pure), `decoding="async"` fine. Note the camelCase `fetchPriority` — React 19 JSX; lowercase warns as an invalid DOM property.
- Delete `image-loader.ts`, `next.config.ts` `images` block, `tests/unit/image-loader.test.ts`. `tests/integration/icon-base-path.test.tsx` stays (covers the helper path).

**Tooltip-regression caveat**: current `next/image` icons render *without* tooltips; `ui/Icon` adds a tooltip when `label` is non-empty. To stay behavior-pure, migrated sites pass `label=""` and keep their existing text labels — the a11y tree keeps the same names it has today.

### D8 — Test placement

- Primitives: `tests/integration/ui/<Primitive>.test.tsx` (RTL + vitest; keyboard via `userEvent.keyboard`).
- lib: `tests/unit/lib/*.test.ts`; expression golden tests port the existing utils.test.ts cases plus spec scenarios; utils.test.ts dies with utils.tsx.
- E2E: no new e2e; baseline capture on main (all specs green) recorded in review.md before implementation commit 1; suite re-run per workstream commit.

### D9 — Commit sequencing (single change, 4 reviewable commits)

1. `lib/` split + tests (imports updated; utils.tsx deleted).
2. `ui/` primitives + integration tests (no call sites yet; Clickable still alive).
3. Call-site migration (icon buttons, dialogs, add-reveals, rename fields, rate displays, collapsible sections, file imports) + delete Clickable.
4. Icon standardization + image-loader removal + static-export spec sync.

Each commit leaves the suite green; a mid-change deprecated Clickable shim exists only between commits 2 and 3 and never merges.

## Risks / Trade-offs

- [`getByRole('button')` now matches ~30 more elements] → audit e2e specs for bare role-button selectors before commit 3; all project selectors use accessible names/testids per policy, so exposure should be near zero — verify, don't assume.
- [Button reset CSS misses a site → visual diff] → the class constants are shared, not copied; spot-check each migrated screen against main (manual + e2e screenshots where they exist).
- [focusout containment behaves differently from child-level onBlur for portaled children (MUI Select dropdown renders in a portal, outside the wrapper)] → PartSelector's popup is the risk; test the add-reveal flows in e2e; if portal blur fires, fall back to `closeOnBlur={false}` + explicit close-on-select at that site (matches current net behavior).
- [Expression split introduces import cycles] → `operators.ts` as leaf module (D6) prevents it by construction.
- [Tooltip attach-to-button changes hover target size] → tooltip anchors to the same box the span occupied (button wraps identical content + padding); e2e hover assertions unaffected (none exist today).

## Migration Plan

Sequential commits (D9) on branch `refactor/extract-ui-primitives-and-lib`; PR to main after review.md APPROVED. Rollback = revert the merge commit; no storage schema, no data migration, no dependency changes.

## Open Questions

- None blocking. During commit 3, if any e2e selector must change, it gets enumerated in ui-primitives R10 before merge (spec is the changelog).
