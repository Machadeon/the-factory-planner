<!-- Append-only. Each review pass adds a new ## Pass N section. Never delete or edit previous passes. -->

## Pass 1 — 2026-07-20

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass
(leave empty, first pass of design-review)

### Findings
[D3] — Doc itself admits stopPropagation on IconButtons is a no-op once D1/D2 land (nothing above them listens for clicks except the now-non-toggling outer div). Shipping dead defensive code contradicts AGENTS.md "no comments unless why non-obvious" spirit and adds untestable no-op branches; either drop D3 or state a concrete future trigger, not "kept just in case."
[Risk: visual/interaction mismatch] — `rowVisualClasses` (interactive-styles.ts:32) applies the row-wide hover/active background to the *entire* outer `<div>`, including the rate-fields and IconButton area that D1 explicitly excludes from the toggle button. After D1/D2, hovering over the Output Rate field or Delete button will show the row's "clickable to toggle" highlight even though clicking there does not toggle — a discoverable, testable UX defect design.md's Risks section doesn't mention (it only covers layout regrouping, SuggestedActions placement, and accessible-name length).
[D2] — Moving `<p>Actual: rate</p>` inside the `<button>` changes it from a block-level sibling to inline button content; no mention of whether `TextCalculatorField`'s `w-40`/`w-32` siblings plus the now-larger button (icon+name+actual-rate, `grow` semantics unaddressed) preserves the existing row height/wrap behavior on narrow viewports — the current `<p className="grow">` owns the flex-grow slot which D2 relocates into the button without stating what element carries `grow` afterward.
[ActionRow doc contract] — ActionRow.tsx's own comment says "must not contain other interactive elements." D2 nests only non-interactive content (icon, text, spans) so this is honored, but design.md doesn't explicitly call out that it verified none of the `unit`/`productionRateDiffStr` spans introduce interactive descendants (they don't, but the doc's D1 rationale leans entirely on this constraint without confirming D2's payload against it).
[Accessible name] — Risks section adds `aria-label` to stabilize the button's accessible name, but doesn't specify the label text's relationship to the live `aria-expanded` state ("expand"/"collapse" toggle wording) — screen reader users may hear a static "expand" label even when the row is already expanded (should toggle wording or rely on aria-expanded semantics alone, which is standard practice and preferable to a hand-toggled label string).

## Pass 2 — 2026-07-20

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass
[D3] — RESOLVED. D3 renamed "(dropped)" with explanation of why stopPropagation is dead code under D1/D2; not shipped.
[Risk: visual/interaction mismatch] — RESOLVED. New D4 explicitly splits `rowVisualClasses` static coloring (stays on outer div) from hover/active interactive classes (move to ActionRow's own bounds), directly addressing the finding.
[D2 grow/layout] — RESOLVED. D2 now states `grow` moves from `<p>` to `ActionRow` via its existing `className` prop, and asserts flex container/children widths are otherwise unchanged.
[ActionRow doc contract] — RESOLVED. D2 now explicitly states the payload (icon, name, unit/rate-diff spans) was checked for interactive descendants and has none.
[Accessible name] — RESOLVED. Risks section now specifies a static label with no toggle wording, relying on `aria-expanded` alone — matches standard ARIA disclosure-button practice, avoids stale-label risk.

### Findings
[D4] — Underspecified mechanics: D4 says to "move the hover/active interactive classes... onto ActionRow alone" and "verify rowVisualClasses and ActionRow's internal classing don't both add hover treatment to the same region," but `ActionRow` is invoked with `bare` (ProductionLineRow.tsx:91), and `bareButtonClasses` (interactive-styles.ts:52) currently has **no hover/active class at all** — only reset + focus-visible. `interactiveClasses` (the function that does carry hover/active) is used for the non-bare variant. D4 doesn't say whether ActionRow drops `bare` and switches to `interactiveClasses`, or whether `bareButtonClasses` itself gains a hover branch — this is a real open implementation decision, not just a "verify no double-apply" checklist item as currently phrased. Left as-is, an implementer could satisfy D4 by leaving `ActionRow` on `bareButtonClasses` (no hover anywhere) or by wiring hover onto it — the doc doesn't commit to which, and the two produce different UX outcomes (row that never highlights vs. row that highlights only over the button bounds, which is the stated goal).
[D4] — variant/danger-warning class handling gap: `rowVisualClasses` currently branches on `variant` (danger/warning) to pick border+hover-adjacent colors (`interactiveDangerClass`/`interactiveWarningClass` include both border and their own hover/active backgrounds per interactive-styles.ts:12-16). D4 says the outer div keeps "static state coloring (danger/warning border, background)" — but `interactiveDangerClass`/`interactiveWarningClass` bundle border+background+hover together in one string; splitting "static" from "hover" pieces of the *same* variant class requires restructuring those constants (or duplicating them), which D4 doesn't mention as required work.

## Pass 3 — 2026-07-20

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass
[D4 underspecified mechanics] — RESOLVED (by removal). D4 dropped entirely rather than fixed; its "considered, rejected" replacement doesn't attempt the hover split, so the bare/`bareButtonClasses`-vs-`interactiveClasses` ambiguity no longer applies — there's no relocation to specify.
[D4 variant/danger-warning bundling gap] — RESOLVED (by removal). Same disposition: rejecting the split means `interactiveDangerClass`/`interactiveWarningClass` stay untouched and bundled, so the restructuring work the finding flagged as missing is no longer required at all.

Verified the rejection rationale against the codebase: `rowVisualClasses` is consumed by two other split-row components (`app/components/library/LibraryFolderRow.tsx`, `app/components/library/LibraryFactoryRow.tsx`) beyond `ProductionLineRow.tsx`, corroborating the claim that row-wide hover-over-non-toggling-controls is a pre-existing, multi-consumer pattern rather than an invented justification. The trade-off is now explicitly logged in the Risks section rather than left implicit.

### Findings
No findings.
