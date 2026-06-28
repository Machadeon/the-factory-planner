# Implementation Plan Review — Logistics Graph View

Inline review (separate-agent deferred — session limit). Used skills: modern-web-guidance
(`interactions-in-complex-layouts`, `performance`) and frontend-design.

## Coverage

Plan steps map to all spec requirements and the validation ACs; R9 is isolated and
committed first (R9.6). No gaps in step coverage. Concerns below are refinements, not
blockers.

## Concerns & directives (fold into the build)

1. **[perf] Isolate per-node reflow.** Changing a node's `rows` resizes one node; without
   containment the browser can reflow siblings. Apply `contain: layout style paint` to
   each custom node's root wrapper (cheap, Baseline). Enable React Flow
   `onlyRenderVisibleElements` so large graphs cull offscreen nodes. Do NOT use
   `content-visibility:auto` on React Flow nodes (they're transform-positioned; it fights
   the viewport culling) — plain `contain` is the right tool here.

2. **[arch] Single source of truth for positions.** `factory.graphLayout` is the only
   store. Do not mirror positions in `useState`; derive React Flow `nodes` from the model
   and persist back on `onNodeDragStop`. Memoize `buildGraphModel` on the factory version
   counter (it's already the re-render signal) to avoid rebuilding every render —
   `deserializeFactory` for consumers is expensive (mirror the overview's memo keyed by
   `library.factories` + `currentFactoryId`).

3. **[ux] Maximize via fixed overlay, not Fullscreen API.** A `fixed inset-0 z-50`
   container is reliable inside the app chrome and easy to restore (button + Esc).
   Fullscreen API is an optional enhancement only; the overlay must not SSR (view is
   `"use client"`). Restore focus to the toggle on close; respect `prefers-reduced-motion`
   for any expand transition.

4. **[a11y] Link nodes are real controls.** Supplier/consumer/factory-recipe navigation
   uses real `<button>`/link semantics with visible keyboard focus, not bare click
   handlers on a div.

5. **[copy] Interface voice.** Empty state names what to do ("Add a product to see its
   logistics", not "No data"). Maximize control labeled by action ("Maximize" / "Exit
   full screen"). Rows control labeled "Machine rows".

## Design direction (frontend-design)

The memorable signature is already inherent and subject-true: **nodes drawn to real
factory footprint**. Lean into a top-down **blueprint / factory-floor schematic** look
rather than generic React Flow cards — that is the one bold place; keep everything else
quiet.

- **Palette (dark theme, matches app):** node body = blueprint slate (`#1b2230`) with a
  thin technical grid; building accent border tinted by building category; ports use the
  part's own `part.color`. Belts = neutral/amber solid strokes; pipes = the fluid's color,
  visually distinct (lighter/rounded). Source = muted inflow; sink = muted outflow;
  factory-link nodes carry the factory icon + an explicit link affordance and a distinct
  accent so cross-factory flow never reads as a raw input/output.
- **Ports:** solid = rounded square, fluid/gas = circle (per spec); byproduct port gets a
  warning-amber ring + smaller scale so it's unmistakably secondary.
- **Type:** reuse the app's existing font stack; node titles in the utility/data weight,
  rates in a tabular/monospaced treatment so numbers align across ports.
- **Restraint:** no gratuitous motion; only a subtle hover lift on nodes and the maximize
  transition. The footprint-accurate sizing does the talking.

## Verdict

No blocking concerns. Proceed to the implementation loop with the directives above folded
in. Re-confirm perf with `lighthouse_audit` and a visual screenshot pass in Step 7.
