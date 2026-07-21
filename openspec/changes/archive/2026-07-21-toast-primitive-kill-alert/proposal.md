## Why

The app surfaces failures through blocking browser `alert()` at three sites (unrecognized import JSON, JSON parse failure, failed factory restore). `alert()` is blocking, unstyled, and untestable via Playwright, and there is no shared surface for transient user feedback. A toast primitive replaces these and becomes the reusable feedback surface that C3 (storage-failure surfacing) will build on.

## What Changes

- Add a `Toast` primitive to `app/components/ui/`: a `ToastProvider` mounted at the app root plus a `useToast()` hook returning `show({ message, variant })`.
- Variants: `error`, `success`, `info`. Only `error` sites are wired in this change; `success`/`info` exist for C3 and future reuse.
- Behavior: `error` toasts are sticky (persist until manual close); `info`/`success` auto-dismiss (~4–5s). Every toast has a manual close control. Toasts stack with a capped visible queue (max 3); overflow queues, oldest-first.
- Accessibility: the toast region uses `role="alert"` / `aria-live="assertive"` for errors (`aria-live="polite"` for info/success) so screen readers announce them; status is conveyed by icon + text, not color alone.
- Styling: Tailwind-first per [ADR-0001](../../../plans/adr-0001-styling-system.md), no MUI widget — no C1 retrofit debt.
- Replace the three `alert()` calls with `useToast().show({ variant: "error", ... })`, preserving today's message text:
  - `app/hooks/useFactorySession.ts:137` — "Could not restore factory — some recipe or part data may be missing."
  - `app/hooks/useFactoryPageFlows.ts:165` — "Unrecognized JSON format."
  - `app/hooks/useFactoryPageFlows.ts:168` — "Failed to parse JSON file."
- Add a stable test handle (`data-testid`/`aria-label`) to each toast and its close control for Playwright.

## Capabilities

### New Capabilities
- `toast-notifications`: the `ToastProvider`/`useToast` contract — variant set, sticky-vs-auto dismissal, manual close, capped stacking queue, aria-live announcement, and the Tailwind `ui/` primitive as its single home.

### Modified Capabilities
- `library-ops`: the requirement that "unrecognized JSON and parse failures surface the existing alerts" changes — these now surface error **toasts** via `useToast`, same message text.
- `factory-session`: R5's "surface the existing alert message" / "the existing 'Could not restore factory' alert is shown" changes to an error **toast**, same message text.

## Impact

- New: `app/components/ui/Toast.tsx` (or a small `ui/toast/` set — provider, hook, region, item), mounted in the app-root layout/provider tree.
- Modified: `app/hooks/useFactorySession.ts`, `app/hooks/useFactoryPageFlows.ts` (call-site swaps; both are React hooks so `useToast()` is directly usable).
- Modified: app root where providers are composed (mount `ToastProvider`).
- No new runtime dependency (Tailwind + React only).
- Tests: integration test for the primitive (variant behavior, sticky vs auto-dismiss, stacking cap, close); regression coverage that the three former-alert sites now emit a toast.
