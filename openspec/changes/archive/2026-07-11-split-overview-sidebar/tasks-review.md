<!-- Append-only. Each review pass adds a new ## Pass N section. Never delete or edit previous passes. -->

## Pass 1 — 2026-07-11

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass
(first pass — none)

### Findings
- [Group 1, `overview-sidebar-structure` R1.S1] 🔴 missing: no test stub asserts the full R1.S1 scenario ("all six sections render, each backed by its own component" when outputs/inputs/intermediates/consumers/suppliers are all present simultaneously). 1.4 only covers the conditional-omission case (R1.S2), 1.5/1.6 only cover the power row (R3). No stub exercises the "everything present → all six render together" positive case.
- [Group 1, `overview-sidebar-structure` R2.S1] 🔴 missing: no stub or verification task for "file boundaries" (the 8 named files exist under `app/components/overview/`, each with exactly one default export). Spec explicitly downgrades this to review-verification rather than automated lint (spec.md line 21), so a Group-1 test stub isn't strictly required — but then no task in Group 8 (Verification) or elsewhere calls this out as a review checklist item either. It falls through both the "automated" and "manual checklist" paths.
- [Group 1, `overview-sidebar-structure` R4.S2] 🔴 mislabeled: task 1.7 cites R4.S2 but its content ("mutating a field one leaf section reads... re-renders... the affected section's output") is the Migration Plan's cross-leaf-re-render mitigation, not R4.S2. R4.S2's actual text is "assertion parity" — RTL `getByText`/`getByAltText`/allocation-bar-width assertions producing the same value before and after the split. No task implements *that* comparison (e.g., snapshotting `FactoryOverviewComponent`'s rendered output pre-change to diff against `OverviewSidebar`'s post-change output). 1.7 is a legitimate task for the Migration Plan risk, but it isn't R4.S2 and shouldn't cite it as satisfying that scenario.
- [Group 1, `consumer-links` R1.S1 / R1.S2] 🔴 missing: no test stub asserts the actual hoisted-import requirement — that `graph-model.ts` imports `deriveConsumers` from `app/models/consumer-links.ts` rather than defining it locally, and that `ConsumersSection.tsx` does the same (no inline re-derivation). Task 2.3 only says "confirm green" on existing tests, which verifies behavior is unchanged but not that the import actually moved (a stub `graph-model.ts` could still pass its tests with a local copy that happens to match). Compare to task 7.3, which does add an explicit grep-based structural check for `FactoryOverviewComponent` references — no equivalent `grep -rn "function deriveConsumers"` (or import-path) check exists for confirming single-implementation-ness (`consumer-links` R1's core claim: "exactly one implementation").
- [Group 2, step 2.3] 🟡 risk: "confirm green" for `logistics/` tests is not itself listed as a Group-1 stub task even though it's gating — fine as a Group-2 execution step, but note it depends on pre-existing `logistics/` test coverage of `deriveConsumers`-via-`buildGraphModel` actually existing; tasks.md doesn't confirm such coverage exists before relying on it as the R1.S1(consumer-links) gate. If no existing test exercises `buildGraphModel`'s consumer-derivation path, this step silently passes without validating anything.
- [Group 5, task 5.1] 🔵 nit: `PowerSummary`'s task text doesn't reference a props interface or signature (design.md Decision 6 doesn't specify one either, both leave this implicit) — not a blocker since design.md's fragment description makes the shape inferable, but neither doc states the actual `{ power: { avg, min, max } }` prop contract explicitly as a task-level deliverable to implement against (design.md's own Risks section does state this shape — tasks.md doesn't carry it forward into 5.1's wording).
- [Dependency order] — no issues found. Groups 2–8 map 1:1 onto design.md's 8-step extraction order (consumer-links hoist → PartRateSummary move → leaf sections → PowerSummary → composition root → rewire/delete → verification), and Group 1 (all test stubs) precedes all implementation groups as required.
- [Lighthouse justification] — task 8.5's rationale ("no DOM/style change, no new page... design.md non-goal: no visual redesign") is accurate and matches design.md's stated non-goal; skip is justified, not just asserted.
- [Coverage otherwise] — every other spec requirement/scenario (`overview-sidebar-structure` R3.S1/R3.S2, `consumer-links` R2.S1/R2.S2/R3.S1/R3.S2) has a clearly corresponding task. `onRebuild` prop-chain removal (R1.S3/R4) is covered by both a Group-1 stub (1.8) and Group-7 implementation tasks (7.1/7.2).

## Pass 2 — 2026-07-11

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass
- [Group 1, `overview-sidebar-structure` R1.S1] — RESOLVED. New task 1.4: "with outputs, inputs, intermediates, consumers, and suppliers all present, all six sections render" — directly exercises the positive all-present case, correctly cited to R1.S1.
- [Group 1, `overview-sidebar-structure` R2.S1] — RESOLVED. New task 8.6 in Verification: review-verifies the exact 8-file list (`OverviewSidebar.tsx`, `OutputsSection.tsx`, `ConsumersSection.tsx`, `InputsSection.tsx`, `IntermediatesSection.tsx`, `PowerSummary.tsx`, `SuppliersSection.tsx`, `PartRateSummary.tsx`) each with exactly one default export, citing R2.S1 and correctly noting it's review-verified per the spec's own downgrade from automated lint. No longer falls through both paths.
- [Group 1, `overview-sidebar-structure` R4.S2 mislabel] — RESOLVED. Task 1.8 is now the correct R4.S2 implementation: before/after render-output parity comparing `OverviewSidebar` against a captured pre-refactor `FactoryOverviewComponent` baseline (text, icon `src`/`alt`, allocation-bar width styles). The old 1.7 (cross-leaf re-render) is renumbered to 1.9 and now carries no spec citation, correctly attributed only to design.md's Migration Plan mitigation.
- [Group 1, `consumer-links` R1.S1/R1.S2] — RESOLVED. New task 1.11: structural grep-based stub (alongside 7.3's pattern) confirming `graph-model.ts` no longer defines `deriveConsumers` locally and `ConsumersSection.tsx` has no inline consumer-derivation loop — directly targets the "exactly one implementation" claim that behavior-only tests (2.3) couldn't catch.

### Findings
(none)

All 4 Pass-1 findings resolved with tasks that are correctly scoped and accurately cited. The two Pass-1 non-blocking notes (2.3's dependency on pre-existing `logistics/` test coverage; 5.1's implicit `PowerSummary` prop shape) were not required fixes and remain minor/informational — not re-raised as blockers. Task numbering is consistent (1.1–1.11, no gaps/dupes), Group 1 fully precedes implementation groups, and Groups 2–8 still map cleanly onto design.md's 8-step order. tasks.md is ready to gate implementation.
