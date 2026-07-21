## ADDED Requirements

### Requirement: R1 — Provider and hook contract
The app SHALL expose a `ToastProvider` mounted once at the app root and a `useToast()` hook returning a stable `show({ message, variant })` function. `variant` SHALL be one of `error | success | info`. Calling `show` from any descendant (component or hook, including `useFactorySession`/`useFactoryPageFlows`) SHALL enqueue a toast without blocking the caller. `useToast()` called outside a `ToastProvider` SHALL throw a descriptive error.

#### Scenario: R1.S1 — show enqueues non-blocking
- **WHEN** a descendant calls `show({ message: "x", variant: "info" })`
- **THEN** a toast with that message and variant renders and the call returns synchronously without blocking

#### Scenario: R1.S2 — hook requires provider
- **WHEN** `useToast()` is invoked in a tree with no `ToastProvider` ancestor
- **THEN** it throws an error naming the missing provider

### Requirement: R2 — Dismissal behavior per variant
`error` toasts SHALL be sticky: they persist until manually closed and SHALL NOT auto-dismiss. `success` and `info` toasts SHALL auto-dismiss after a single fixed duration exported as a constant `TOAST_AUTO_DISMISS_MS` (5000 ms). Every toast, regardless of variant, SHALL render a manual close control that removes it immediately.

#### Scenario: R2.S1 — error is sticky
- **WHEN** an `error` toast is shown and a span exceeding `TOAST_AUTO_DISMISS_MS` passes with no user action
- **THEN** the toast is still visible

#### Scenario: R2.S2 — info auto-dismisses
- **WHEN** an `info` or `success` toast is shown and `TOAST_AUTO_DISMISS_MS` elapses
- **THEN** the toast is removed automatically

#### Scenario: R2.S3 — manual close
- **WHEN** the user activates a toast's close control
- **THEN** that toast is removed immediately regardless of variant

### Requirement: R3 — Capped stacking queue
Multiple concurrent toasts SHALL stack visibly up to a maximum of 3 (`TOAST_MAX_VISIBLE`). When more than 3 are active, the excess SHALL queue and surface as visible slots free up, in insertion order (FIFO). Showing a new toast SHALL NOT remove or replace any currently visible toast. Because `error` toasts are sticky (R2), three simultaneously visible errors occupy all slots until the user closes one; queued toasts wait and this starvation is resolved by manual close, which is the intended behavior.

#### Scenario: R3.S1 — stack up to cap
- **WHEN** three toasts are shown in succession
- **THEN** all three are visible simultaneously and none of the first three was removed by a later one

#### Scenario: R3.S2 — overflow queues in FIFO order
- **WHEN** a fourth and then a fifth toast are shown while three are visible
- **THEN** neither is shown until a visible toast is dismissed; when one is dismissed the fourth (older) appears before the fifth, and dismissing another surfaces the fifth

#### Scenario: R3.S3 — sticky errors hold slots until closed
- **WHEN** three `error` toasts are visible and an `info` toast is then shown
- **THEN** the `info` toast is not shown until the user manually closes one of the errors, at which point it appears

### Requirement: R4 — Accessible, non-color signaling
The toast region SHALL announce toasts to assistive technology: `error` toasts via an assertive live region (`aria-live="assertive"` or `role="alert"`), `info`/`success` via a polite live region (`aria-live="polite"`). Variant SHALL be conveyed by a per-variant icon and/or text affordance in addition to color. The close control SHALL have an accessible name.

#### Scenario: R4.S1 — error announced assertively
- **WHEN** an `error` toast renders
- **THEN** it is within an assertive live region (or carries `role="alert"`) so a screen reader announces it immediately

#### Scenario: R4.S2 — variant not color-only
- **WHEN** any toast renders
- **THEN** its variant is distinguishable by a per-variant icon and/or text, not by color alone

#### Scenario: R4.S3 — info announced politely
- **WHEN** an `info` or `success` toast renders
- **THEN** it is within a polite live region (`aria-live="polite"`), not an assertive one

#### Scenario: R4.S4 — close control named
- **WHEN** the toast's close control renders
- **THEN** it exposes an accessible name (e.g. aria-label "Dismiss notification")

### Requirement: R5 — Tailwind primitive, single home, test handles
The toast primitive SHALL live in `app/components/ui/` and be styled with Tailwind per ADR-0001, using no MUI widget. It SHALL be the single home for transient notification rendering. Each toast and its close control SHALL carry a stable Playwright handle (`data-testid` and/or `aria-label`).

#### Scenario: R5.S1 — no MUI in the primitive
- **WHEN** the toast primitive's imports are inspected
- **THEN** it imports no `@mui/*` widget and renders semantic elements styled with Tailwind

#### Scenario: R5.S2 — stable selectors
- **WHEN** a toast renders
- **THEN** the toast and its close control are locatable via `getByTestId`/`getByRole` handles that do not depend on CSS class or visible copy
