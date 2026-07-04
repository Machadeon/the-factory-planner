## Pass 1 — 2026-07-03

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass

_(first pass — none)_

### Findings

- [ui-primitives R1/R1.S1] — `ActionRow` appears only in a scenario; no requirement defines its contract (element, label, keyboard), though proposal lists it as a primitive. add an ActionRow requirement or drop it from R1.S1.
- [ui-primitives R2.S2] — "enumerated in this spec's migration notes" references a migration-notes section that does not exist in the spec. add the section (even if empty) or point at R10's enumeration list.
- [ui-primitives R3] — backdrop-click dismissal unspecified; MUI Dialog closes on backdrop click by default. state whether backdrop close is a cancel path (no onConfirm) and add a scenario.
- [ui-primitives R4] — Escape-then-blur ordering unspecified: after Escape reverts, the ensuing blur must not commit the reverted/stale value. add a scenario.
- [ui-primitives R4] — commit-on-unchanged-value ambiguous: S3 covers blur "with a changed value" only; Enter with unchanged value and blur with unchanged value undefined. state whether callback fires.
- [ui-primitives R4] — no single-home/migration clause: proposal says InlineEditText ×2 call sites migrate, but R4 (unlike R3/R5/R7) never requires sites to compose it. add "both existing sites SHALL compose it".
- [ui-primitives R5] — "matching current per-site onBlur-close behavior" is unlocked prose; if the 5 sites differ today the contract is ambiguous. enumerate the sites' close triggers or declare one unified behavior.
- [ui-primitives R5] — no statement on partial input when collapsing on blur (discarded vs committed). specify.
- [ui-primitives R6] — "preserving the current expanded/collapsed visuals" has no lock mechanism (no class list, no scenario). lock via the classes/markup or drop the visual claim; also specify default initial state.
- [ui-primitives R7] — picker-cancel edge missing: user opens picker and cancels; callback must not fire. add scenario.
- [ui-primitives R8] — "status color" doesn't say which rate-status variant (surplus-is-good vs surplus-is-attention) RateDisplay uses, or whether variant is a prop. specify.
- [lib-utilities R1] — base-path helper module left unnamed while format.ts/rate-status.ts are named; "one module per concern" untestable for it. name the file (e.g. `base-path.ts`).
- [lib-utilities R3] — "a rate-formatting API" shape unspecified: combined string vs {value, unit}, name, signature. R8 (RateDisplay) needs unit and value separately for markup — pin the return contract.
- [lib-utilities R4] — non-finite input (NaN/Infinity) behavior unspecified for the rounding step `parseFloat(rate.toFixed(1))`. state behavior or explicitly out-of-scope.
- [expression-calculator R1] — "byte-for-byte preserved" applied to behavior is unverifiable as written; the lock is the scenario table. reword to "identical results for all R1/R2 scenario inputs" or lock via golden tests.
- [expression-calculator R2] — error list omits unmatched closing paren (`"1 + 2)"`) and empty/whitespace-only input; S1 exercises only open-paren mismatch. add both cases.
- [static-export R2 delta] — R2.S2 "No next/image usage" duplicates icon-rendering R3.S1 (zero next/image imports); two capabilities own the same check and can drift. keep the ban in one spec and cross-reference from the other.

## Pass 2 — 2026-07-04

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass

- [ui-primitives R1/R1.S1] ActionRow undefined — resolved: R2a added with element, keyboard, accessible-name, and styling contract; R2a.S1 covers Tab/role/Enter/Space.
- [ui-primitives R2.S2] dangling "migration notes" — resolved: now points at R10's selector-change list.
- [ui-primitives R3] backdrop-click unspecified — resolved: R3.S2 includes backdrop click as a cancel path (no onConfirm).
- [ui-primitives R4] Escape-then-blur — resolved: R4.S4 forbids commit on the blur following Escape.
- [ui-primitives R4] unchanged-value commit — resolved: R4 text + R4.S1/S3 state callback fires changed or unchanged, matching current commitEdit (verified against FactoryLibraryDrawer.tsx:110-126, 240, 335).
- [ui-primitives R4] missing composition clause — resolved: both rename sites (folder, factory in FactoryLibraryDrawer) SHALL compose it.
- [ui-primitives R5] unlocked per-site blur prose — resolved: sites enumerated; ConstraintsPanel keeps no-blur-close, other four keep blur-close (verified: ConstraintsPanel.tsx is the only Add-X site without onBlur).
- [ui-primitives R5] partial input on collapse — resolved: R5 text + R5.S3 lock discard, fresh child on reopen.
- [ui-primitives R6] unlocked visuals + initial state — resolved: exact markup/classes/icons locked; required defaultExpanded prop; R6.S2 states match current code (verified FactoryOverviewComponent.tsx:57-62 — intermediates false, other five true).
- [ui-primitives R7] picker-cancel edge — resolved: R7.S2 added, callback not invoked.
- [ui-primitives R8] unspecified color variant — resolved: variant-agnostic; caller passes color class; R8.S2 locks pass-through and no-color default.
- [lib-utilities R1] unnamed base-path module — resolved: named `base-path.ts`.
- [lib-utilities R3] unspecified API shape — resolved: `rateUnit(part)` and `formatRate(part, rate)` pinned with exact return strings and spacing (` MW` / `/min`), consistent with R8.S1.
- [lib-utilities R4] non-finite inputs — resolved: R4.S2 locks NaN→else, Infinity→`>0`, -Infinity→`<0` (matches parseFloat/toFixed semantics).
- [expression-calculator R1] "byte-for-byte" unverifiable — resolved: reworded to identical results locked by golden unit tests carried from tests/unit/utils.test.ts.
- [expression-calculator R2] missing closing-paren + empty input — resolved: `"1 + 2)"` added to R2.S1; R2.S2 locks empty/whitespace → NaN without throw (verified: utils.tsx evaluates `Number(stack[0])` → NaN on empty stack).
- [static-export R2 delta] duplicate next/image ban — resolved: R2.S2 narrowed to config-only check (no images.loader/loaderFile, no image-loader.ts) with explicit ownership cross-reference to icon-rendering R3.S1.

### Findings

_none — all Pass 1 concerns resolved; factual locks introduced by the revisions verified against current source._
