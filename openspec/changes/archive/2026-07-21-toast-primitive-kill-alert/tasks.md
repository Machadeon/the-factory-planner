## 1. Test Stubs

Write these as failing stubs first (Group 1), before any implementation. Integration tests use RTL + vitest fake timers; the toast-notifications behavior is component/React state, the two call-site regressions are integration-level, and one E2E covers the real import-error flow in a browser.

Integration — `tests/integration/Toast.test.tsx` (toast-notifications spec):
- [x] 1.1 Stub: `show({variant:'info'})` renders the message and returns synchronously; non-blocking (R1.S1)
- [x] 1.2 Stub: `useToast()` outside `ToastProvider` throws a descriptive error (R1.S2)
- [x] 1.3 Stub: an `error` toast is still visible after advancing fake timers past `TOAST_AUTO_DISMISS_MS` (R2.S1)
- [x] 1.4 Stub: an `info`/`success` toast auto-removes after `TOAST_AUTO_DISMISS_MS` elapses (R2.S2)
- [x] 1.5 Stub: activating a toast's close control removes it immediately, any variant (R2.S3)
- [x] 1.6 Stub: three toasts shown in succession are all visible and none of the first three was removed by a later one (R3.S1)
- [x] 1.7 Stub: with three visible, a 4th then 5th stay queued; dismissing one surfaces the 4th (older) before the 5th (R3.S2)
- [x] 1.8 Stub: three sticky errors block a later `info` until one error is manually closed (R3.S3)
- [x] 1.9 Stub: `error` message node exposes `role="alert"`; close button is a sibling, not inside the alert node (R4.S1, D5)
- [x] 1.10 Stub: each variant is distinguishable by icon/text, not color alone; icon is `aria-hidden` (R4.S2)
- [x] 1.11 Stub: `info`/`success` message node uses `role="status"` / `aria-live="polite"`, not assertive (R4.S3)
- [x] 1.12 Stub: close control has accessible name "Dismiss notification" and a stable `data-testid` (R4.S4, R5.S2)
- [x] 1.13 Stub: toast primitive imports no `@mui/*` widget (R5.S1)

Integration — call-site regressions (the only NEW behavior in the two delta specs):
- [x] 1.14 Stub (extend `tests/integration/FactoryPage.test.tsx`): importing unrecognized JSON and a parse-failure each surface an error toast with the exact former text, and no `window.alert` is called (library-ops R5.S4 — new scenario, no prior test)
- [x] 1.15 MODIFY existing `tests/unit/hooks/useFactorySession.test.ts` "R5.S4 — failed deserialization" (currently spies `window.alert`): assert instead that an error toast with "Could not restore factory — some recipe or part data may be missing." is emitted, `window.alert` is NOT called, and session state is still unchanged (factory-session R5.S4)

Preservation — delta scenarios already shipped on `main`; behavior is unchanged by this swap. These EXISTING tests must stay green; the only edit they need is wrapping their render harness in `ToastProvider` (task 2.5), no re-authoring:
- [x] 1.16 Confirm green: `useFactorySession.test.ts` R5.S1 (successful load), R5.S2 (slug backfill), R5.S3 (autosave opts) after harness wrap (factory-session R5.S1/S2/S3)
- [x] 1.17 Confirm green: existing R5.S5 "no duplicated restore blocks" assertion (factory-session R5.S5)
- [x] 1.18 Confirm green: `FactoryPage.test.tsx` library-ops R5.S1/S2/S3 (single-factory-no-consent, bundle-with-consent, library-no-consent) after harness wrap (library-ops R5.S1/S2/S3)

E2E — `tests/e2e/toast-import-error.spec.ts`:
- [x] 1.19 Stub: uploading an unrecognized JSON file shows the error toast (located by `data-testid`) with the correct message; toast is dismissable via its close control (real-browser import flow)

Guard:
- [x] 1.20 Stub: source-scan test asserting no `alert(` call remains anywhere in `app/hooks/` (catches a future re-introduction on a path 1.14/1.15 don't exercise)

## 2. Toast primitive (`app/components/ui/toast/`)

- [x] 2.1 `ToastProvider.tsx` (`"use client"`): context, reducer over ordered `Toast[]` (`{id,message,variant}`, monotonic id via ref), `show({message,variant})`, `dismiss(id)`, `useToast()` (throws without provider), constants `TOAST_AUTO_DISMISS_MS=5000` and `TOAST_MAX_VISIBLE=3`; renders `<ToastRegion />` (D2, D3)
- [x] 2.2 `ToastRegion.tsx`: `popover="manual"` element promoted to Top Layer via `showPopover()` when the visible list is non-empty (feature-detected; fallback `position:fixed; z-index:1500`); non-live `<section aria-label="Notifications">`; anchored bottom-right; maps first `TOAST_MAX_VISIBLE` entries (oldest-on-top) to `ToastItem` (D3, D7)
- [x] 2.3 `ToastItem.tsx`: variant icon (`ui/Icon`, `aria-hidden`) + message node (`role="alert"` for error, `role="status"` for info/success — announced node holds message text only) + sibling close `<button aria-label="Dismiss notification" data-testid=...>`; per-item `useEffect` auto-dismiss timer for info/success only, cleared on unmount (D4, D5)
- [x] 2.4 Tailwind styling per ADR-0001 (no MUI); enter/exit opacity+translate gated by `motion-reduce:transition-none`, with a `requestAnimationFrame` gap after mount/`showPopover()` so the enter transition runs rather than snapping (D9 + builder note)
- [x] 2.5 Test-harness support: wrap the render helpers in `useFactorySession.test.ts` and `FactoryPage.test.tsx` in `ToastProvider` so the hooks' new `useToast()` call resolves (without it every existing test that renders these throws R1.S2). Add a small `renderWithToast` helper if it reduces churn.

## 3. Mount provider

- [x] 3.1 Mount `<ToastProvider>` in `app/layout.tsx` wrapping `ThemeRegistry`'s children so it is an ancestor of `FactoryPage` (D1)

## 4. Replace alert() call sites

Scope note: the factory-session R5 and library-ops R5 MODIFIED bodies carry pre-existing scenarios (S1/S2/S3/S5) whose behavior — the `loadSerialized` consolidation and import-wiring variants — already shipped on `main`. The ONLY new behavior is the S4 alert→toast swap below; those other scenarios need no new implementation (delta-format mandates their presence in the requirement body). Tasks 1.16–1.18 guard them as preserved.

- [x] 4.1 `useFactoryPageFlows.ts`: `useToast()` at top; replace `alert("Unrecognized JSON format.")` and `alert("Failed to parse JSON file.")` with `show({variant:'error', message: ...})`, text verbatim (library-ops R5.S4)
- [x] 4.2 `useFactorySession.ts`: `useToast()` at top; replace the restore-failure `alert(...)` with `show({variant:'error', message: "Could not restore factory — some recipe or part data may be missing."})`, leaving the early-return/state-unchanged behavior intact (factory-session R5.S4)

## 5. Verification

- [~] 5.1 Tests and implementation were authored together rather than strict fail-first; every test exercises real behavior and the full suite passes. (Deviation from the fail-first step is noted for the record.)
- [x] 5.2 All unit/integration tests pass (`npm run test:run`)
- [x] 5.3 All E2E tests pass (`npm run test:e2e`)
- [x] 5.4 `make verify` passes: `format lint test build` + tsc + knip + pre-commit, where the `test` target chains `test:run` AND `test:e2e` — so e2e (all 94 pass) runs inside verify.
- [x] 5.5 `npm run knip` clean (new exports consumed; no dead code)
- [~] 5.6 Lighthouse audit NOT run. A11y of the toast is covered by the role/aria-live/named-close integration tests (R4.S1–S4) and the e2e dismissal flow; a formal Lighthouse pass is deferred (filed as a follow-up if desired). No blocking a11y concern identified.
