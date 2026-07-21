## Pass 1 — 2026-07-20

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass
(none — first design pass)

### Findings
- [D3/D5 — Top Layer] — Toast region is a normal fixed-position div inside the `ThemeRegistry`/`FactoryProvider` subtree; MUI Dialogs/Drawers (used elsewhere: LibraryDrawer, ConfirmDialog) render in their own portal/Top Layer and will paint over the toast via z-index/stacking-context. Modern guidance mandates `popover="manual"` (Top Layer) for stackable toasts precisely to escape parent z-index. Decide: either use the Popover API (with feature-detect polyfill fallback) or pin a documented z-index above all MUI modal layers and justify it.
- [D5 — focus management] — Design replaces a blocking `alert()` (which forcibly took focus and required acknowledgment) with a non-focusing toast, but no decision covers focus. A sticky error's close button is never focused and there is no keyboard path to it documented; keyboard/AT users lose the forced-acknowledgment the alert gave. State whether focus moves to the error's close control (or the toast) and how Esc/Tab reach it. This is a genuine regression risk, not polish.
- [Non-Goals / D-none — reduced motion] — Non-Goals promise a "reduced-motion-safe entrance" but no decision specifies HOW: no `prefers-reduced-motion` media query, no mention of `transition-behavior`/discrete transitions for enter/exit. A gap against the quality floor; add a decision pinning the reduced-motion behavior.
- [D5 — role=alert semantics] — `role="alert"` on a *sticky* toast that contains an interactive close button is semantically wrong: `alert` is a non-interactive live advisory and screen readers may not expose the nested control reliably; a persistent, actionable error is closer to `role="alertdialog"` or an assertive live region wrapping non-interactive text with the button outside the announced node. Also `role="alert"` re-announces on any subtree mutation. Clarify the announced node vs the interactive node.
- [D5 — double-announce] — D2 renders one ordered array through one mapped container, but D5 puts errors as standalone `role="alert"` items *and* info/success inside an `aria-live="polite"` wrapper. If the polite wrapper wraps the whole mapped list, error items live inside a polite region while also being alerts (double region) — or if only some items are wrapped, the "single visual stack" needs two container nodes. Specify the exact DOM: which node is the polite live region and confirm alert items are not nested inside it.
- [D4 — timer + StrictMode] — Per-item `useEffect` setTimeout is correct for cleanup, but React 18 StrictMode double-invokes effects in dev; the design should note the timer is idempotent under double mount (it is, via cleanup) so reviewers don't read it as a leak — and confirm fake-timer tests account for it. Minor, but call it out.
- [D1 — provider scope vs FactoryContext] — `ToastProvider` mounts in `layout.tsx` above `FactoryProvider`; fine, but confirm `useToast()` consumers (`useFactorySession`, `useFactoryPageFlows`) are rendered *below* the layout boundary and inside the `"use client"` tree — a hook calling `useToast` from a component that is not a descendant of the client `ToastProvider` throws (R1.S2). Note the boundary explicitly.
- [Open Question — placement/stacking] — Bottom-right default left open; the visual stack direction (new-on-top vs new-on-bottom) interacts with the R3 FIFO surfacing order and must be internally consistent so the oldest queued item surfaces in a predictable slot. Not blocking but pin before build to avoid a visual/spec mismatch.

## Pass 2 — 2026-07-20

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass
- [D3/D5 — Top Layer] — Resolved by new D7: `ToastRegion` renders as `popover="manual"` promoted to Top Layer via `showPopover()`, escaping MUI Dialog/Drawer portals; feature-detected fallback to `position: fixed; z-index: 1500` (above MUI's 1300 modal layer). Matches the modern-web-guidance mandated pattern and its documented fallback. Risks section also records the intended over-Dialog paint.
- [D5 — focus management] — Resolved by new D8: follows WAI-ARIA APG toast convention (does not steal focus); forced-acknowledgment replaced by sticky errors + assertive announcement; close control is a Tab-reachable `<button>`; `role="alertdialog"` explicitly considered and rejected with rationale. Standards-aligned, not a regression.
- [Reduced motion] — Resolved by new D9: opacity+translate gated by `motion-reduce:transition-none` with no transform under reduced-motion; DOM add/remove avoids needing `allow-discrete`. Meets the quality floor.
- [D5 — role=alert semantics] — Resolved: announced node holds only non-interactive message text; error message node `role="alert"`, close `<button>` is a sibling outside the announced node. Interactive control no longer nested in the alert node.
- [D5 — double-announce] — Resolved: no wrapping live region around the list; politeness set per-item on the message node (`role="alert"` vs `role="status"`); container is a non-live `<section aria-label="Notifications">`; icon `aria-hidden`. Single ordered list preserved without double-announce.
- [D4 — StrictMode] — Resolved: D4 notes the effect is idempotent under dev double-invoke via cleanup; tests advance timers in a single `act`.
- [D1 — provider scope] — Resolved: D1 explicitly confirms both `useToast()` consumers render below the client `ToastProvider` boundary, so R1.S2 throw is never hit in normal flow.
- [Open Question — placement/stacking] — Resolved: D3 pins bottom-right, oldest-on-top, newest-enters-bottom, consistent with the D2 array/FIFO order. Open Questions now none blocking.

### Findings
None. Design is architecturally consistent (valtio/context untouched, ui/ Tailwind-first, one-component-per-file), free of the flagged anti-patterns, and aligned with modern toast a11y and Top-Layer guidance.

Non-blocking implementation note for the builder (not a gate): D9's "transition runs on mount via a mounted-state class" needs a paint/`requestAnimationFrame` gap after `showPopover()` so the initial-state class actually transitions rather than snapping — a well-known enter-transition detail, no design change required.
