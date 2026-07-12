<!-- Append-only. Each review pass adds a new ## Pass N section. Never delete or edit previous passes. -->

## Pass 1 — 2026-07-12

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass
<!-- First pass: leave empty -->

### Findings
- [library-ops delta / REMOVED] MAJOR — `### Requirement: R2.S2` under REMOVED Requirements is a *scenario*, not a Requirement; OpenSpec delta removes whole requirements, not sub-scenarios. R2 is retained (MODIFIED) with the scenario dropped, so this scenario is handled twice and inconsistently. Fold the scenario removal into the MODIFIED R2 diff and delete the bogus REMOVED entry (or restructure if a full requirement is truly being removed).
- [library-ops delta / R2] MAJOR — MODIFIED requirement text does NOT carry forward the original R2 scenario set intact: original R2 had S1/S2/S3, delta shows S1/S3 only (S2 silently absent, no in-place marker). Per OpenSpec delta rules the MODIFIED block must present the full edited requirement including its scenarios; the dropped S2 must be visible as an edit here, not orphaned into REMOVED.
- [library-ops delta / R2.S1] MEDIUM — Scenario keeps "nested factory reference ... every reference points at the corresponding new id" but delta R2 text says an absent-target `nestedFactoryId` "passes through unchanged." Happy-path scenario now contradicts the pass-through rule; add/clarify a scenario distinguishing present-target (remapped) vs absent-target (unchanged) nested refs.
- [library-ops delta / R1.S1] MINOR — R1.S1 THEN still could list `migrateLibrary` among imports (original did); delta drops it silently. Since `migrations.ts` now *defines* `migrateLibrary`, dropping is correct, but the MODIFIED requirement should show this as an intentional edit, not an unremarked deletion.
- [storage-migrations / R2] MEDIUM — R2 says a re-visited id (cycle) is broken by "deserializing that occurrence with `resolveNested = () => null`", but `_visiting` is only mentioned in R2, never established/populated in R1's signature contract beyond the optional `_visiting?` param. No requirement states R1 SHALL add each id to `_visiting` before recursing / remove after. Cycle detection mechanism is underspecified — untestable as written.
- [storage-migrations / R1.S3 vs R2] MEDIUM — R1.S3 mandates a `console.warn` for every unresolved reference. Under R2 cycle-break, the back-reference is "skipped per R1.S3" implying a warn fires on normal cyclic graphs (A↔B). Is a warn on a legitimate cycle desired or noise? Scenario R2.S1 does not assert warning behavior; specify whether cycle-break skips warn or not.
- [storage-migrations / R3.S2] MINOR — Asserts constructor defaults `sloopedSlots=0`, `machineSpeed=100`, `allowRemainder=true` as spec truth. These are implementation constants, not requirement-owned; if a constructor default changes the scenario silently rots. Reference AssemblyLine's default contract rather than hardcoding values, or own them explicitly.
- [storage-migrations / R4] MINOR — R4 says `migrateLibrary` guarantees `schemaVersion: 1, folders: [], factories: []`. R3 already says `migrateLibrary` always writes `schemaVersion: 1`. Overlap is fine but R4.S1 should also assert the `schemaVersion: 1` output alongside the arrays (it does) — no gap, just noting duplication between R3/R4 responsibilities for `schemaVersion` writing; confirm single source of truth.
- [storage-migrations / R1] MINOR — R1 covers `supplierIds` and `nestedFactoryId` resolution but no scenario covers the mixed case (some refs resolve, some null in the same factory) — R1.S3 only shows the all-skip framing. Edge case: partial resolution ordering/independence unasserted.
- [traceability] MINOR — Proposal "What Changes" lists `generateSlug`/`generateId`/`directDependencyIds`/`collectFactoryBundle` staying in factory-storage (R5), consistent. But proposal never mentions `_visiting` cycle param or the console.warn-on-unresolved contract that R1/R2 introduce as new observable behavior — verify these are "preserve today's behavior" and not new scope; if new, surface in proposal.

## Pass 2 — 2026-07-12

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass
- [library-ops delta / REMOVED] RESOLVED — REMOVED section deleted entirely; hoisting-drop folded into a self-contained MODIFIED R2 with explicit Reason paragraph and new R2.S4 asserting pass-through (not-hoisted) behavior. No more double-handling of the same behavior change.
- [library-ops delta / R2] RESOLVED — R2 is now a genuine full rewrite (text + Reason + all current scenarios S1/S3/S4) rather than a silent scenario drop; the old S2 (hoisting) is explicitly superseded by S4 (no-hoisting), both narratively and in scenario content.
- [library-ops delta / R2.S1] RESOLVED — R2.S1 now scopes itself to "via `nestedFactoryId`" (present-target/remapped case) and reads consistently with the requirement text's pass-through rule for absent targets; no more internal contradiction.
- [library-ops delta / R1.S1] RESOLVED — R1.S1's THEN clause correctly excludes `migrateLibrary` from the module's own imports (since `migrations.ts` now defines it), and R1's requirement text carries an explicit relocation note pointing at `storage-migrations` R6.
- [storage-migrations / R2 (cycle)] RESOLVED — new dedicated R2 spells out default-empty-set-at-top-level, check-on-entry-for-cycle, and copy-with-add-before-recursing (sibling isolation), with R2.S1 scenario-testing the sibling-isolation property. Cycle mechanism is now concretely testable.
- [storage-migrations / R1.S3 vs cycle warn] RESOLVED — R3 now explicitly states cycle-break "fires... the `console.warn` per skipped reference," and R3.S1 asserts the warn fires on the back-reference. Ambiguity is gone (still a design choice to warn on legitimate cycles, but it's now an explicit, testable choice, not an open question).
- [storage-migrations / R4/R5 schemaVersion overlap] RESOLVED (was a nitpick) — R5 text now says "`schemaVersion: 1` (per R4)," making R4 the explicit single source of truth; R5.S1 still asserts the value for scenario completeness. Acceptable.
- [storage-migrations / R1 mixed resolution] RESOLVED — new R1.S4 scenario covers one resolved + one null reference coexisting in the same factory.
- [storage-migrations / R4.S2 hardcoded constructor defaults] ACKNOWLEDGED, NOT BLOCKING — coordinator cross-checked values against actual `AssemblyLine` constructor; concrete/testable literals are an acceptable spec style choice here, not a defect.
- [traceability / `_visiting` and warn contract] RESOLVED (non-blocking even before this pass) — proposal.md's existing language ("cycle detection recurses into the core with a null-returning resolver," "existing per-line skip/warn tolerance") already covers this at the level proposals normally operate; no proposal edit needed.

### Findings
- [library-ops delta / R2.S3] MINOR — scenario title is "dangling reference tolerated" and requirement text promises pass-through for both dangling `supplierIds` *and* dangling `nestedFactoryId`, but the R2.S3 scenario body only exercises the supplier case. No scenario directly exercises an absent-target `nestedFactoryId` remap (as opposed to R2.S4's absent-`nestedFactoryId`-entirely case, which is a different condition — legacy embedded data with no `nestedFactoryId` field at all, not a `nestedFactoryId` pointing at a missing id). Suggest adding a `nestedFactoryId`-dangling scenario or broadening R2.S3's WHEN to cover both, but this is a coverage nit, not ambiguity or contradiction — does not block design work.
