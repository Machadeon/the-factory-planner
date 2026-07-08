## Pass 1 — 2026-07-08

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass
(empty — first pass)

### Findings

Architecture-conflict checks (React context + valtio proxy/snapshot, app/hooks/, AGENTS.md state conventions) — verified against source; facts hold:
- D1/D4 confirmed: `useFactorySession.ts` creates `store` once via `useRef` + `proxy({ factory })`; `store.factory` reassigned on swap (lines 159/178/195). `useLibrary.ts` returns `useCallback`-stable `updatePartPointOverrides`. No conflict.
- D3 confirmed: `FactoryPage.tsx:61` holds the `useSnapshot(session.store).factory.rateLookup` root trigger exactly as described.
- D4 confirmed: `useFactoryPageFlows.ts:282` declares `handleNavigateToFactory` as a plain `function` (identity churns each render) — ref-stabilization rationale is real.
- D7 confirmed: `NestedFactoryRow` takes a `Factory` prop, calls `factory.update()` on it (current factory), renders a flat recipe row, does not read `useFactory()`.

Anti-patterns / problematic abstractions:
- D4 — `navRef.current = flows.handleNavigateToFactory` assigned in the FactoryPage render body is a write-during-render (impure render). Works, but the canonical latest-ref pattern assigns in a `useEffect`/layout effect (or `useEffectEvent`). Under React StrictMode double-invoke it is benign here, but the design should either assign in an effect or explicitly note the ref-write-in-render is intentional and StrictMode-safe.

Migration / rollback gaps:
- Migration step 2 — "keep existing props passed in parallel (temporarily double-supplied)" leaves each mid-migration component with BOTH a drilled prop and a context source and no stated precedence rule; a consumer reading context while a stale prop is still forwarded can diverge. State "context wins; prop ignored" (or migrate prop-removal and context-read in the same commit per component) to close the ambiguity.
- Migration step 5 — dropping the root `rateLookup` trigger and adding per-leaf `useSnapshot` land in the same step; if any leaf that previously relied on the parent-cascade re-render is missed, it silently stops updating. No per-step green-suite gate is stated between "remove root trigger" and "add leaf snapshots" — recommend the render-count test (step 6) or a stale-leaf audit be pulled before/into step 5 as the tripwire, not after.
- Migration ordering — steps 2–5 span 13 components + logistics across presumably several commits, but the plan does not say the suite must stay green per commit (only at step 6). For a behavior-freeze change, add "run `npm run test:run` after each consumer batch" so a regression is bisectable, not discovered only at the end.

Modern web standards:
- None. `modern-web-guidance` search surfaced only performance/CWV guides (top similarity 0.52, none about context/state); the design uses platform-idiomatic React `createContext` + throw-on-missing-provider hook, which is the current standard. No gap.

Frontend-design:
- N/A. Pure state/architecture change; no DOM/aria/testid/visual surface touched (behavior frozen per R8). Nothing to critique on palette/type/layout/motion.

AGENTS.md convention note (not a conflict):
- D6 throw-on-missing-provider diverges from AGENTS.md's "lookups return undefined; callers null-check," but D6 justifies it correctly (missing provider is a wiring error, not a data miss) and it is the React idiom. Acceptable; already flagged as a resolved spec-review residual.

Blocking rationale: the three migration-plan gaps (double-supply precedence, root-trigger-vs-leaf-snapshot timing tripwire, per-commit green gate) are the substantive concerns; the D4 render-body ref write is minor. Address the migration items and this moves to APPROVED.

## Pass 2 — 2026-07-08

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass

- D4 (write-during-render, Pass 1 anti-pattern) — RESOLVED. Line 40 now assigns `navRef.current` in a `useEffect`, not the render body, and states the wrapper is "only invoked from event handlers, by which time the effect has committed the current callback." This is the canonical latest-ref pattern and StrictMode-safe. The event-handler-only invocation bound is correct: navigation is user-click-triggered, always post-commit, so no stale-callback window exists.
- Migration double-supply precedence (Pass 1 gap 1) — RESOLVED. Line 62 states the explicit "no double-supply" principle; line 66 requires prop deletion (interface + parent call site) and context read to land in the same per-component commit. No ambiguous precedence window remains.
- Root-trigger-vs-leaf-snapshot timing tripwire (Pass 1 gap 2) — RESOLVED. Steps 2–3 (lines 65–66) keep the root `rateLookup` trigger through consumer migration so no leaf can silently stop updating mid-migration; step 4 (line 67) lands the render-count integration test AND drops the root trigger in the SAME commit, so a missed leaf subscription fails the test/e2e there instead of shipping a stale-leaf bug. This is exactly the tripwire ordering requested.
- Per-commit green gate (Pass 1 gap 3) — RESOLVED. Line 66 adds `npm run test:run` after each batch (bisectable) plus e2e mid-way, with explicit gates at steps 1/2/4/5.

### Findings

- Modern web standards: none. `modern-web-guidance` corpus carries no React context/state guide (CWV/performance only); the `useEffect` latest-ref + `useCallback` stable wrapper is idiomatic and correct.
- Frontend-design: N/A. Pure state/architecture change, behavior frozen (R8); no palette/type/layout/motion surface.
- Architecture / anti-patterns: none remaining. All Pass 1 verified facts (D1/D3/D4/D7 against source) still hold; the D4 fix does not touch them. D6 throw-on-missing-provider remains a justified, idiomatic divergence from the data-lookup convention — not a conflict.

No blocking findings. All Pass 1 concerns resolved; no new concerns introduced.
