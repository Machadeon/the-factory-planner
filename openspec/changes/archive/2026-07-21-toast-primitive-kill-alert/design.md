## Context

Three blocking `alert()` calls surface failures (`useFactorySession.ts:137` restore failure; `useFactoryPageFlows.ts:165/168` import errors). Both are hooks called from `FactoryPage` (`FactoryPage.tsx:33,47`). There is no shared transient-feedback surface. This change adds a Tailwind toast primitive (`toast-notifications` spec) and swaps the three sites; it also becomes the surface C3 (storage-failure) reuses.

Provider tree today: `layout.tsx` → `AppRouterCacheProvider` → `ThemeRegistry` → `{children}` → `page.tsx Home` → `FactoryPage` (mounts `FactoryProvider`, calls the two hooks). App contexts live under `app/contexts/`.

## Goals / Non-Goals

**Goals:**
- `ToastProvider` + `useToast()` per spec R1, mounted once above `FactoryPage`.
- Replace the 3 `alert()` calls with error toasts, same message text.
- Tailwind-only primitive (ADR-0001), no MUI widget.
- Variants error/success/info exist; only error sites wired now.
- Testable via fake timers + stable Playwright/RTL handles.

**Non-Goals:**
- Wiring success/info call sites (future / C3).
- Storage-failure surfacing (C3), ErrorBoundary (C3).
- Animation polish beyond a simple reduced-motion-safe entrance.
- Centralizing message-string literals (deferred; today they stay inline at call sites, matching current behavior).

## Decisions

### D1 — Provider placement: `app/layout.tsx`, wrapping `ThemeRegistry`'s children
Mount `ToastProvider` at the app root so it is an ancestor of every route and of `FactoryPage` (which calls the alerting hooks). Placing it in `page.tsx` around `FactoryPage` would also work but re-scopes per route; the spec says "mounted once at the app root," and layout is the single home. `ToastProvider` is a client component (`"use client"`), rendered inside the server `layout` as a client boundary — same pattern as `AppRouterCacheProvider`/`ThemeRegistry`. Boundary check: the only `useToast()` consumers this change adds are `useFactorySession` and `useFactoryPageFlows`, both invoked from `FactoryPage`, which renders below the layout's client `ToastProvider` — so they are descendants and `useToast()` resolves (never hits the R1.S2 throw). The throw path exists only to catch future misuse outside the provider.

### D2 — State: reducer over a `Toast[]` list; visible/queued derived by slice
State is one ordered array of `{ id, message, variant }` in insertion order. `show()` appends. The first `TOAST_MAX_VISIBLE` (3) entries are "visible" (rendered); the rest are queued. Dismissing a visible entry removes it, and the next queued entry becomes visible automatically — FIFO falls out of array order with zero extra bookkeeping (satisfies R3.S2/S3). `id` from a monotonic counter (`useRef`) — no crypto/UUID dependency, stable for keys. Alternative considered: separate visible/queue arrays — rejected as redundant state that can desync.

### D3 — File layout under `app/components/ui/toast/`
Per one-exported-component-per-file:
- `ToastProvider.tsx` — `"use client"`; context, reducer, `ToastProvider`, `useToast`, and the constants `TOAST_AUTO_DISMISS_MS = 5000`, `TOAST_MAX_VISIBLE = 3`. Renders `<ToastRegion />`.
- `ToastRegion.tsx` — the top-layer container (D7); maps the visible slice to `ToastItem`.
- `ToastItem.tsx` — one toast: icon + message + close button; owns its auto-dismiss timer.
`useToast` throws if no provider (R1.S2).

Stacking direction (pins the Open Question): the visible slice is the first `TOAST_MAX_VISIBLE` entries in insertion order, rendered top→bottom, so the oldest visible toast sits at the top and the newest enters at the bottom. When a slot frees, the next queued (older) entry appears at the bottom of the visible group. Region is anchored bottom-right. This keeps the on-screen order identical to the D2 array order, so R3's FIFO surfacing is visually unambiguous.

### D7 — Top-layer rendering via the Popover API (`popover="manual"`)
`ToastRegion` renders as a `popover="manual"` element promoted to the browser Top Layer (shown imperatively via `showPopover()` when the list is non-empty). This escapes the parent stacking context so toasts paint above MUI `Dialog`/`Drawer` portals (LibraryDrawer, ConfirmDialog) — which the import-error and restore-error flows can have open — without a z-index arms race. Popover API is baseline-available in current evergreen browsers; the app already targets those. Fallback: if `HTMLElement.prototype.showPopover` is absent, the region degrades to `position: fixed` with a z-index above MUI's modal layer (`z-index: 1500`, MUI modals are 1300). Alternative considered: fixed + high z-index only — rejected as the primary path because sibling stacking contexts (transforms/filters) can still trap a fixed element; Top Layer is immune.

### D4 — Auto-dismiss timers live in `ToastItem`
Each `ToastItem` runs a `useEffect` that, for `info`/`success`, sets a `setTimeout(onDismiss, TOAST_AUTO_DISMISS_MS)` and clears it on unmount; `error` sets no timer (sticky, R2.S1). Per-item effect keeps timer lifecycle tied to the rendered element and auto-cleans. Exporting `TOAST_AUTO_DISMISS_MS` lets tests drive it with fake timers. Under React StrictMode the effect double-invokes in dev, but the cleanup clears the first timeout before the second is set, so it is idempotent — not a leak; integration tests wrap advance-timers in a single `act` so the double-invoke does not skew the assertion. Alternative: a central timer manager in the provider — rejected, more code, must track ids manually.

### D5 — Accessibility: announced node is the message, close button sits outside it
The announced node carries the live semantics and holds **only** the non-interactive message text; the close button is a sibling outside that node. This avoids the anti-pattern the review flagged (an interactive control nested inside a `role="alert"` node, which AT may not expose reliably and which re-announces on subtree mutation).
- `error` item: message text node uses `role="alert"` (assertive, R4.S1); the close `<button>` is a sibling, not a child of the alert node.
- `info`/`success` item: message text node uses `role="status"` (`aria-live="polite"`, R4.S3); close `<button>` sibling.
There is no wrapping live region around the whole list (that would double-announce errors or force two containers); politeness is set per-item on the message node, which keeps the single ordered visible list from D2 intact. The region container itself is a non-live landmark `<section aria-label="Notifications">`. Close button carries `aria-label="Dismiss notification"` (R4.S4) and `data-testid`. Variant icon comes from the existing `ui/Icon` primitive, giving non-color signaling (R4.S2); the icon is `aria-hidden` so it does not pollute the announced text.

### D8 — Focus is not stolen; acknowledgment is replaced by persistence + assertive announcement
Toasts follow the WAI-ARIA APG toast/alert convention: showing a toast does **not** move focus (moving focus on a passive notification is itself disruptive and non-standard). The blocking `alert()`'s forced acknowledgment is replaced by two things: (a) `error` toasts are sticky (R2) so they persist until the user acts, and (b) the assertive `role="alert"` announcement reaches AT immediately. The close button is an ordinary focusable `<button>` in the region, reachable by Tab; no custom keyboard trap. This is a deliberate, standards-aligned change from `alert()`, not a regression. (`role="alertdialog"` was considered and rejected: our errors are informational and dismissible, not a modal decision requiring focus capture.)

### D9 — Reduced-motion-safe entrance/exit
Enter/exit use a short Tailwind opacity+translate transition, gated by `motion-reduce:transition-none` (and no transform under `prefers-reduced-motion: reduce`) so reduced-motion users get an instant appear/disappear with no movement. Because a toast is added/removed from the DOM rather than toggled with `display`, no discrete `@starting-style`/`transition-behavior: allow-discrete` gymnastics are needed for the MVP; the transition runs on mount via a mounted-state class. Motion is purely presentational and never gates dismissal timing.

### D6 — Call-site swap
`useFactorySession` and `useFactoryPageFlows` are React hooks, so each calls `useToast()` at the top and replaces `alert(msg)` with `show({ variant: "error", message: msg })`. Message strings unchanged verbatim.

## Risks / Trade-offs

- [Sticky errors can fill all 3 slots and starve queued info/success] → Intended per spec R3/R3.S3; manual close frees slots. Only reachable once info/success sites are wired (not this change).
- [Timer leak on rapid mount/unmount] → per-item `useEffect` cleanup clears the timeout; covered by an auto-dismiss integration test.
- [Provider wraps non-factory routes] → negligible cost; region renders nothing when the list is empty, so no DOM/hydration impact.
- [SSR/hydration mismatch] → provider is `"use client"`; initial state is an empty list so server and client both render an empty region.
- [ADR-0001 emotion cascade-layer fix (C1) not yet landed] → toast uses no MUI and no override of a MUI widget, so the layer issue does not apply here.
- [Popover API unsupported on an old browser] → feature-detected fallback to `position: fixed; z-index: 1500` (above MUI's 1300 modal layer), per D7; a fixed element can in rare cases be trapped by an ancestor transform, hence Top Layer is the primary path.
- [Toast paints over an open MUI Dialog/Drawer] → intended: import/restore errors originate from those surfaces and must remain visible above them; D7 Top Layer guarantees it.

## Migration Plan

Additive. New files + three one-line call-site swaps + one provider mount in `layout.tsx`. Rollback = revert; no data or storage format touched.

## Open Questions

- None blocking. Region placement (bottom-right, oldest-on-top) and Top-Layer strategy are pinned in D3/D7.
