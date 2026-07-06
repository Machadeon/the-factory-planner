<!-- Append-only. Each review pass adds a new ## Pass N section. Never delete or edit previous passes. -->

## Pass 1 — 2026-07-06

**Source: Reviewer** (with modern-web-guidance + frontend-design loaded; no visual findings — behavior-freeze change ports existing UI verbatim)

**Status: CONCERNS**

### Resolved from Previous Pass
(first pass: empty)

### Findings
- [D7] — "children keep receiving the plain proxy-derived objects they receive today" is ambiguous between snapshot and proxy; if children get snapshot objects, their model-method mutations throw on frozen snapshots (violates factory-session R2 writes-to-proxy). fix: state explicitly that children receive the proxy (`store.factory`) for reads and mutations and `useSnapshot` at the root is a re-render trigger only.
- [D2 vs factory-session R1] — design's `proxy({ factory })` container contradicts the approved spec text ("`proxy(new Factory())` for a fresh session, or a proxy wrapping the deserialized factory"); R1.S1 tests the exposed value is a proxy of the Factory, not a container. fix: amend spec R1 wording to the container store (or justify equivalence and what `useFactorySession` exposes) before implementation.
- [D3/D4] — the shim assignment `store.factory.update = …` is itself a tracked write; D4 muting covers loadSerialized and performClear but not the initial-mount assignment, so a fresh session can start dirty with an autosave timer pending. fix: extend muting to initial store creation, or assign `update` on the raw instance before proxying.
- [D4] — unmute mechanism is hand-waved ("`await Promise.resolve()` or flushSync-free equivalent"): if loadSerialized becomes async it ripples into the mount-restore chain and popstate handler ordering; a sync alternative (valtio `subscribe(…, notifyInSync)` or op-filtering) is not evaluated. fix: pin the exact mechanism and loadSerialized's sync/async signature in the design.
- [D5] — subscription ownership is unresolved: D2 says subscribe once to the container, D3 says the callback does dirty + autosave, but dirty lives in `useFactorySession`, scheduling lives in `useAutosave`, and the muted ref is session-internal while useAutosave's stated deps (subscribe target, buildSerialized, doSave, flush) omit it. fix: specify one subscription owner (session exposes an onMutate/muted-aware seam) or two subscriptions with the muted accessor passed to useAutosave.
- [D5/autosave R4] — `beforeunload`-only flush is a modern-web-standards gap: it does not fire on mobile tab discard and registering it can make the page ineligible for bfcache; current guidance prefers `pagehide`/`visibilitychange: hidden`. fix: document this as a known limitation of the frozen behavior in Risks (candidate for a later phase), so it is not silently re-blessed.
- [Migration §4–5] — between commit 4 (update shim installed, old `factory.update` body with autosave scheduling deleted) and commit 5 (`useAutosave` extracted), autosave has no driver; "each commit green" only runs unit tests + build, so the regression window is invisible until an e2e milestone. fix: specify the interim wiring at step 4 (temporary subscribe-based scheduling in FactoryComponent) or fold steps 4–5 into one commit.
- [D5/D8] — hook file naming convention unspecified: AGENTS.md's table covers components (PascalCase) and models/services (kebab-case) but not `app/hooks/`; design alternates between hook names and no filenames. fix: state the file convention (e.g. `use-factory-session.ts` vs `useFactorySession.ts`) so the six files land consistently.

## Pass 2 — 2026-07-06

**Source: Reviewer** (modern-web-guidance + frontend-design loaded this session; no visual findings — behavior-freeze extraction unchanged)

**Status: CONCERNS**

### Resolved from Previous Pass
- [D7] snapshot-vs-proxy ambiguity — resolved: `useSnapshot(store)` explicitly a re-render trigger only, return value not passed down; children receive the proxy; no frozen-snapshot objects cross component boundaries this phase.
- [D2 vs factory-session R1] — resolved on the design side and spec R1/R1.S1/R6 amended to the container shape (verified in spec-review Pass 3); residual spec staleness in R2/R6 wording tracked there, one cross-ref finding below.
- [D3/D4] shim assignment as tracked write at mount — resolved: shim assigned on the raw instance before proxying/swapping, so the assignment can never fire the subscription.
- [D4] unmute mechanism — resolved: pinned to sync `loadSerialized`, muted ref, `queueMicrotask` unmute with FIFO ordering rationale (valtio's notify microtask queued at first mutation runs before the unmute); notifyInSync and op-filtering alternatives explicitly rejected. Ordering argument checks out.
- [D5] subscription ownership — resolved: new D4b — exactly one `subscribe(store, cb)` owned by `useFactorySession`, mute-aware `onFactoryMutate` seam for `useAutosave`, muted flag never leaves the session; D5 dependency list updated to match.
- [D5/autosave R4] beforeunload gap — resolved: documented in Risks as frozen behavior with the mobile-discard/bfcache rationale and logged as a follow-up candidate per plan §5.
- [Migration §4–5] driverless autosave window — resolved: steps folded into one commit with the rationale stated inline.
- [D5/D8] hook filename convention — resolved: camelCase matching the hook export per plan §3 tree; AGENTS.md table update deferred to Phase 5's sweep.

### Findings
- [D7 vs factory-session R2] — design D7 (trigger-only snapshot, children receive the proxy) now contradicts approved spec R2's literal text ("`useSnapshot(factory)` and render children from it"); spec-review Pass 3 filed the R2/R6 rewording. fix: none needed in design.md — blocked only on the spec R2/R6 wording fix landing.
- [D5] — "the only surviving ref-pattern is the debounce timer id and the muted flag" is false against the approved specs: url-sync R3 mandates the section-hash ref and R4 the suppress-push flag + queued rAF. fix: list all surviving refs (debounce timer, muted flag, suppress-push flag, section-hash ref) or soften to "refs survive only for genuinely non-render state".

## Pass 3 — 2026-07-06

**Source: Reviewer** (modern-web-guidance + frontend-design + caveman-review loaded this session; no visual findings — behavior-freeze extraction unchanged)

**Status: APPROVED**

### Resolved from Previous Pass
- [D7 vs factory-session R2] — resolved: spec R2 reworded (verified in spec-review Pass 4) to trigger-only `useSnapshot` on the container with children receiving the proxy; design D7 and spec R2 now agree in substance. Cross-file blocker cleared.
- [D5] surviving-refs claim — resolved: D5 now scopes the "refs die" claim to the state-mirroring refs and enumerates the surviving non-render refs (debounce timer id, muted flag, url-sync section-hash ref + suppress-push flag per R3/R4, drag-in-progress state).

### Findings
(none)
