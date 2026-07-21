## Pass 1 — 2026-07-20

**Source: Reviewer**

**Status: APPROVED**

### Findings
- app/components/ui/toast/ToastRegion.tsx:242: ⚠ MED: when promoted via `showPopover()`, the UA `[popover]` style applies `inset: 0; margin: auto`, which fights the Tailwind `bottom-4 right-4` anchor (top/left also pinned to 0). With `w-80` the width is fixed but vertical placement can stretch/mis-anchor in real browsers (the fixed-fallback path used by jsdom does not exercise this, so tests won't catch it). Fix: reset the popover box explicitly, e.g. add `inset-auto` (or `[&:popover-open]:inset-auto`) alongside `bottom-4 right-4` so the top-layer element keeps the bottom-right anchor. Verify visually in a Popover-supporting browser (the Lighthouse/e2e step 5.6 is the place).
- app/components/ui/toast/ToastItem.tsx:69: ⚠ LOW: auto-dismiss timer lives only on mounted (visible) `ToastItem`s, so a queued info/success toast does not start its 5s countdown until it becomes visible. This is consistent with D4 ("timer tied to the rendered element") and the sticky-starvation intent (R3.S3), not a leak — flagged only so it is a conscious decision, not an accident. No change required.
- app/components/ui/toast/ToastProvider.tsx:159: ⚠ LOW: the `add` reducer never caps the array, so unclosed sticky `error` toasts accumulate unbounded in state (only the first 3 render). Bounded in practice by user dismissal and by the fact only error is wired now; acceptable for this change. Consider a max-queue cap when success/info sites land (C3).

### Verified (no defect)
- Message text preserved verbatim at all three swap sites (useFactoryPageFlows.ts:164/168, useFactorySession.ts) — matches library-ops/factory-session R5.S4.
- Restore-failure path still early-returns `false` with session state unchanged after `show(...)` (useFactorySession.ts); the modified unit test asserts name/id unchanged and `alert` not called.
- Queue/FIFO logic correct: reducer appends, ToastRegion slices `[0, TOAST_MAX_VISIBLE]`, dismiss filters by id → oldest-first surfacing (R3.S1/S2/S3), matches D2/D3.
- a11y matches D5: error message node `role="alert"` with `aria-live` omitted (no assertive double-set), info/success `role="status"` + `aria-live="polite"`; close `<button>` is a sibling outside the announced node with `aria-label="Dismiss notification"`; icon `aria-hidden`; sr-only variant label prefix gives non-color signaling (R4.S1–S4).
- Timer lifecycle clean: per-item `setTimeout` and `requestAnimationFrame` both have cleanup; idempotent under StrictMode double-invoke (D4).
- No `@mui/*` import in the primitive (R5.S1); guarded by Toast.test.tsx and the source-scan test.
- No-focus-steal preserved (D8): toasts never call focus(); close is a plain Tab-reachable button.
- Popover feature-detection guards jsdom/older browsers (D7): attribute set imperatively, falls back to `fixed z-[1500]` (> MUI 1300); empty region stays hidden.
- Provider mounted once inside `ThemeRegistry` (D1); all existing hook/component test harnesses wrapped in `ToastProvider` so the new `useToast()` never throws R1.S2.
- New guard test `no-alert-in-hooks.test.ts` scans every `app/hooks` file for a re-introduced `alert(`, catching regressions on paths the flow tests don't exercise.

No CRITICAL or HIGH findings.

### Resolution (coordinator, post-approval)

- MED (ToastRegion popover `inset:0` vs `bottom-4 right-4`): FIXED — added `inset-auto` to the region className so the top-layer popover keeps the bottom-right anchor. Visual confirmation in a Popover-supporting browser still recommended.
- LOW (queued toast timer starts on visibility): NO CHANGE — intended per D4/R3.S3.
- LOW (uncapped reducer array for unclosed sticky errors): LEFT OPEN, non-blocking — filed as a follow-up for C3 (add a max-queue cap when success/info sites are wired). Recorded in plans/codebase-improvements.md.
