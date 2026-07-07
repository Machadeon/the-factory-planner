<!-- Append-only. Each review pass adds a new ## Pass N section. Never delete or edit previous passes. -->

## Pass 1 — 2026-07-06

**Source: Reviewer**

**Status: CONCERNS**

### Scope
Full diff main...HEAD (7 commits) reviewed against specs/**, design.md, tasks.md. Verified clean: single restore path (loadSerialized only identity-setter), muting FIFO ordering (queueMicrotask after the swap write), raw-instance shim assignment, single container subscription with mute-aware seam, `rebuild()` update-carryover via the Factory copy-ctor (`factory.ts:67`), library-ops per-field dangling semantics + purity, restore priority chain incl. orphan-autosave disable, popstate suppress/rAF + deleted-factory no-op, alert text byte-identical to old `FactoryComponent.tsx:811`, autosave expiry/flush/cancel/first-save-enables semantics vs old `doSave`, drag clamp/persist-once, `_rateTrigger` tracking sound (`_updateRates` reassigns `rateLookup`, so every `update()` is a tracked ref change), no `setVersion`, `.update =` only in `useFactorySession`, FactoryPage 146 lines.

### Deliberate deviations assessed
- (2) Copy-button `aria-label="Copy to clipboard"` — matches the old Tooltip-derived accessible name (old L998). Accepted.
- (3) Pre-flight `deserializeFactory` in restore chain/popstate — preserves the old silent fall-through (alert was always explicit-load-only); double-deserialize cost is restore-time only. Accepted.
- (4) Lighthouse waived — documented inline at tasks 7.4 with rationale (zero visual delta, 93 e2e selectors unchanged). Accepted.
- (1) Layout split + `useFactoryPageFlows` — see finding below; needs artifact reconciliation, not code change.

### Findings
- [autosave R1 / design D5] — the banned ref-mirroring machinery is reborn as hook-internal latest-callback refs: `useAutosave` `enabledRef/buildRef/doSaveRef/flushRef` (spec R1 names `doSaveRef`/`buildSerializedRef`/`flushAutosaveRef` as SHALL NOT survive), url-sync `sessionRef/reloadRef/setActiveSectionRef/onOrphanRef`, FactoryPage `performSaveRef` — none in design D5's approved surviving-refs enumeration. fix: amend autosave R1 + D5 to scope the ban to FactoryComponent's cross-concern state mirrors and bless encapsulated latest-callback refs for mount-once listeners, or refactor to listener re-registration.
- [design D5 dependency direction] — `useAutosave`'s `doSave` is wired to page-level `flows.performSave` via a render-assigned `performSaveRef` (FactoryPage L33–49), not the session's `doSave` as designed; creates a hidden circular autosave ↔ flows dependency. Behaviorally correct (timer-expiry save must replicate cancel + first-save-enables, matching old `doSave`). fix: amend D5 to record the page-mediated wiring and rationale, or move first-save-enable into `useAutosave` and pass `session.doSave` directly.
- [design D7 / page-structure] — unapproved structural elements: `useFactoryPageFlows` (321 lines, a 7th hook under `components/factory/`) plus `FactoryPageDialogs`/`FactorySections`/`FactorySidebar`/`LibraryDrawerSlot`; design D7 said the dialogs/sections render in FactoryPage and wrappers "stay in FactoryPage (thin)". Behavior-frozen and motivated by the ≤150-line cap, but the artifacts no longer describe the built structure. fix: amend design D7 + the page-structure spec delta to record the flows-hook and layout sub-components before archive.

## Pass 2 — 2026-07-06

**Source: Reviewer** (scope: verify the three artifact amendments against the built code; no code changes were made and none were required)

**Status: CONCERNS**

### Resolved from Previous Pass
- [autosave R1 / design D5] latest-callback refs — resolved: autosave R1 now bans only the component-level state-mirroring refs as they existed in FactoryComponent and explicitly accepts hook-internal latest-callback refs; design D5's enumeration updated to match. Verified against the built refs in `useAutosave`, `useFactoryUrlSync`, and FactoryPage (spec-review Pass 5 APPROVED).
- [design D5 dependency direction] — resolved: D5 documents the page → autosave save composition (`performSave` through the render-assigned ref, mutation-seam direction unchanged) with rationale. Matches FactoryPage L33–49.
- [design D7 / page-structure] — substantially resolved: D7 documents `useFactoryPageFlows` + the four thin layout components with the ≤150-line rationale, and page-structure R1 gained matching MAY clauses conditioned on frozen child prop contracts (spec-review Pass 5 APPROVED). One residue: D7's trailing sentence still claims the memo/wrappers "stay in FactoryPage", contradicting the new paragraph and the code — tracked below.

### Findings
- [design D7 residue] — stale sentence in the amended D7 ("`deserializedOtherFactories` memo and `addProductionLine`/`removeProductionLine`/`rebuildFactory` wrappers stay in FactoryPage") contradicts the new flows-hook paragraph and the built code; filed as design-review Pass 4's finding. fix: one-sentence design.md edit — no code change; this pass approves once that lands.

## Pass 3 — 2026-07-06

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass
- [design D7 residue] — resolved: D7's trailing sentence reworded to place the memo and wrappers in `useFactoryPageFlows` with rebuild as the session-exposed `rebuild()` passed through to the overview; verified against the built code (design-review Pass 5 APPROVED). All artifacts — specs, design, tasks — now describe the implementation as built.

### Findings
(none)

Implementation review complete: full diff verified against the approved artifacts across three passes — no correctness bugs, no valtio pitfalls, behavior freeze intact (selectors/storage/URLs unchanged, 416 unit/integration + 93 e2e green, build clean, proxy overhead profiled and recorded). Change is clear to archive.
