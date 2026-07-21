<!-- Append-only. Each review pass adds a new ## Pass N section. Never delete or edit previous passes. -->

## Pass 1 — 2026-07-20

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass

### Findings
[R1] — "any part of the row that is not itself an interactive control" is untestable as written; no enumerated list of what counts as interactive vs non-interactive in R1 (only R2 enumerates controls). Reader must cross-reference.
[R1.S3] — "empty space within the row" ambiguous; padding of the row vs gaps between controls vs area under expanded assembly-line list not distinguished.
[R1.S4] — "matching the state before the click" is contradictory/confusing wording; a toggle changes state, so result cannot match state before the click. Likely means "returns to initial after even clicks" — reword.
[R2] — enumerated control list (Output Rate, Production Rate, Edit/Autocalculate, Maximize, Delete) duplicated across proposal and spec but not reconciled with R1's "text field, icon button" shorthand; risk of drift if controls added later.
[R3] — "appropriate role and tabIndex" is vague/untestable; no concrete role (button?) or expected tabIndex value specified, and no aria-expanded requirement despite expand/collapse semantics.
[R3] — missing scenario: does the row expose accessible expanded/collapsed state (aria-expanded) to screen readers? Proposal is silent, spec adds keyboard operability but not announced state.
[edge case] — no scenario for click/drag on the row that ends outside (text selection on rate text) — should selecting text toggle? Undefined.
[edge case] — no scenario for clicks landing on the expanded assembly-line list children below the row header; unclear if those bubble to toggle.
[scope] — R3 (full keyboard operability: focusable element, Enter/Space, nested focus isolation) exceeds proposal scope; proposal "What Changes" only covers click-to-toggle + stopPropagation, never mentions keyboard, tabIndex, or role. R3 is net-new capability not in proposal.
[scope] — R3.S3/R3.S4 nested keyboard focus isolation likewise absent from proposal's Impact/What Changes.

## Pass 2 — 2026-07-20

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass
[R1] untestable — RESOLVED. R1 now enumerates its own toggle zones (icon, name, rate-field whitespace, actual-rate text) and cross-references R2's enumerated control list as the exclusion set.
[R1.S3] ambiguous padding — RESOLVED. Reworded to "whitespace/gap areas between the part-name block and the rate controls," and R1 explicitly excludes expanded assembly-line list content.
[R1.S4] contradictory "matching" wording — RESOLVED. Now specifies four clicks from collapsed and enumerates the ordered result states (expanded, collapsed, expanded, collapsed).
[R2] control-list drift — RESOLVED. R1 no longer restates a shorthand list; it defers to R2's single enumerated list, removing the dual-source drift risk.
[R3] vague role/tabIndex, no aria-expanded — RESOLVED. R3 now specifies role="button", tabIndex={0}, and aria-expanded reflecting state concretely.
[R3] announced expanded/collapsed state — RESOLVED. New R3.S5 requires aria-expanded to update to "true"/"false" on state change.
[edge: click-drag text selection] — RESOLVED. New R1.S5 specifies drag-select on rate text does not toggle.
[edge: expanded-list children] — RESOLVED. R1 now states clicks on expanded list content below the header are out of scope and SHALL NOT toggle.
[scope: R3 keyboard operability] — RESOLVED. proposal.md "What Changes" now explicitly includes role/tabIndex/aria-expanded/Enter-Space and replacing the inner ActionRow's narrower keyboard support.
[scope: R3.S3/S4 nested isolation] — RESOLVED. "What Changes" now states nested interactive controls remain independently focusable/operable and do not trigger the row toggle.

### Findings
[R1] LOW — "rate fields' surrounding whitespace" as a toggle zone relies on an undefined boundary between a field's hit area and its surrounding whitespace; the same field-vs-whitespace line R2 excludes. Testable in practice (a scenario picks a specific pixel), but the requirement text leaves the boundary to implementation. Non-blocking.
[R1.S5] LOW — scenario is phrased in implementation terms ("releases outside the original mousedown position") rather than observable behavior (text got selected / no click fired). Doesn't block; consider rewording to the user-visible outcome. Non-blocking.
