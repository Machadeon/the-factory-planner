<!-- Append-only. Each review pass adds a new ## Pass N section. Never delete or edit previous passes. -->

## Pass 1 — 2026-07-12

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass
(first pass: leave empty)

### Findings
[R4.S4 vs proposal scope] — Contradiction. R4.S4 requires the test to flag any helper-mediated mutation "not followed by a recompute ... so it cannot silently ship without either a recompute or an explicit documented exemption." But the proposal's "Not in scope" section explicitly says the `rejectLine` call site (ProductionLineComponent.tsx:130) mutates `factory.optimizer.enabledRecipes` with no recompute and is NOT being fixed. As written, a test satisfying R4.S4 would fail on that in-tree call site immediately, forcing an in-scope fix the proposal says is out of scope. Spec must either narrow R4.S4 to only the `splitRecipes` escape class, or define the "documented exemption" mechanism concretely (allowlist entry? biome-ignore-style comment?) and require :130 to carry one.
[R4.S4] — "explicit documented exemption" is undefined and therefore untestable. No syntax/mechanism specified for how an exemption is expressed or how the regex/test recognizes one. A scenario must be executable; this has no observable pass/fail criterion.
[R4.S4] — Scenario mixes prose description of an intended behavior with no concrete WHEN/THEN over "executable statements in app/components/ and app/hooks/" like R4.S1/S2 use. As phrased ("a component calls a helper function that mutates a proxy-derived config object it was passed") it is not mechanically checkable by a regex the way S1/S2 are; the detection heuristic (which helpers count, how "not followed by a recompute" is determined statically) is unspecified.
[R4.S3] — "rate-affecting mutating call or write on a bare productionLine./assemblyLine. reference ... excluding ... reads" is not testable as written. A regex can match `productionLine.foo` but cannot distinguish a rate-affecting mutation from a read or a presentation mutation without an enumerated method/field list. Spec should name the concrete tokens to catch (e.g. `assemblyLine.rate =`, `.splitRecipeRates(`) rather than the semantic category "rate-affecting mutating call."
[R4.S3 scope] — Requirement generalizes to "every such mutation" on any bare production-line/assembly-line ref, exceeding the issue-#23 scope of the one `splitRecipeRates` escape. If other bare-ref mutations already exist in components, this scenario would fail on them and pull unrelated fixes into the change. Either confirm `splitRecipeRates` is the only such call site (so the generalized rule passes today) or scope the scenario to it.
[R5.S7] — "n = prior count" is ambiguous relative to when the new assembly line is inserted. The current code (production-line.ts:79-84) computes `n = this.assemblyLines.length` at call time and rescales existing lines; the new line is added by the caller separately. Scenario should state explicitly that the rescale runs against the pre-insertion set and that the added line is not part of the rescale, else "prior count" is open to misreading.
[R5.S7] — Missing edge case: empty production line (n = 0). ratio = 0/1 = 0 would zero every rate — but with zero assembly lines the loop is a no-op, so behavior is vacuous; and n could be 0 only if there are no lines. Spec does not state expected behavior when the production line has 0 assembly lines, nor guarantee `n ≥ 1` at the call site. Add an edge scenario or a precondition.
[R5.S7] — "with no further call from the caller" restates R2.S1 / R2 verbatim and adds nothing testable that R2 does not already cover; the load-bearing new assertion is only "rateLookup reflects the rescaled rates immediately." Not a defect, but the scenario's distinct value is thin.
[R5 table row] — New row says "rescale a production line's assembly lines by n/(n+1)" but does not define n inline (defined only in R5.S7). A reader of the table alone cannot tell what n is. Minor: align the table row's parenthetical with the S7 definition.
[R4 requirement text] — The added sentence widens enforcement to "mutations performed by a helper function a component calls directly with a proxy-derived config object." This normative SHALL has no corresponding concrete detection contract (see R4.S4 findings); a MUST-level rule whose only scenario is untestable leaves the requirement unverifiable.

## Pass 2 — 2026-07-12

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass
[R4.S4 vs proposal scope] — RESOLVED. The "Not in scope" carve-out was removed; `Factory.rejectLine`/`Factory.rejectAssembly` were added mirroring the existing `rejectAllSuggestions()` pattern (verified against factory.ts:654-657), and both ProductionLineComponent.tsx call sites (:130, :144, confirmed by direct read) now convert to them. No remaining contradiction between proposal scope and R4.S4.
[R4.S4 undefined "documented exemption"] — RESOLVED. The exemption mechanism was dropped entirely; R4.S4 is now a concrete token ban (`applyRejectSilent(` called directly from a component), same shape as R4.S3/R4.S1/R4.S2. Executable and testable via grep.
[R4.S4 mechanically uncheckable] — RESOLVED, same fix as above — narrowed to a literal token match, no "is this a helper-mediated mutation" judgment call left.
[R4.S3 not testable / semantic category] — RESOLVED. Narrowed to a literal token match on `productionLine.splitRecipeRates(`. Mechanically checkable by grep, matches R4.S1/S2's style.
[R4.S3 scope exceeds issue #23] — RESOLVED. No longer "every such mutation on any bare ref" — scoped to the one literal token identified by the bug. Appropriately narrow now.
[R5.S7 "prior count" ambiguous] — RESOLVED. S7 now states explicitly "evaluated before the mutator runs; the mutator only rescales lines already present — adding the new line ... is a separate, caller-side step outside this mutator." Matches the actual code (production-line.ts:79-84) unambiguously.
[R5.S7 missing n=0 edge case] — RESOLVED. New R5.S8 covers the empty-line case explicitly: no-op, vacuously consistent, indexes still recomputed.
[R5.S7 redundant "no further call" clause] — Not addressed, but this was flagged as "not a defect" / thin value in Pass 1, not a blocking finding. Left as-is; acceptable.
[R5 table row missing inline n definition] — PARTIALLY RESOLVED. The table row now reads "n = count before any new line is added," which is inline and clear — improvement accepted. (Not an exact copy of S7's fuller wording, but sufficient.)
[R4 requirement text untestable MUST] — RESOLVED as a consequence of the R4.S3/S4 narrowing — the requirement text itself was also reworded to name the two concrete escape patterns instead of the broad "helper-mediated mutation ... proxy-derived config object" language, so the SHALL now maps onto two testable scenarios.

### Findings
[Proposal vs R5 table row/R5.S9 — new contradiction on rejectLine's scope] — The proposal (line 9) says the new `Factory.rejectLine`/`rejectAssembly` methods "wrap the current inline `applyRejectSilent(factory.optimizer, …)` + delete logic from `ProductionLineComponent.tsx:130,144`" — i.e., deletion happens inside the new Factory method. But the spec's R5 table row says "deletion itself is a separate, already-contracted call the component still makes," and R5.S9's THEN clause only asserts `optimizer.enabledRecipes` state and recompute, never mentioning deletion. These two descriptions of where deletion lives are inconsistent: proposal says wrapped-in, spec says stays-separate. Confirmed against current code (ProductionLineComponent.tsx: `rejectLine` calls `applyRejectSilent` then `props.onDeleteClicked()`; `rejectAssembly` calls `applyRejectSilent` then local `removeAssemblyLine`, which calls `factory.removeAssemblyLine(pl, recipe)`) — today deletion is a second, separate proxy-routed call in both cases, matching the spec's framing, not the proposal's "wrap ... delete logic" framing. One of the two documents needs to change to match the design decision; as currently paired they describe two different implementations.
[R5.S9 — deletion ordering/atomicity unspecified] — Assuming the spec's framing wins (deletion stays a separate call), R5.S9 doesn't state whether `Factory.rejectLine`/`rejectAssembly` must be called before or after the deletion call, or whether calling delete first (leaving a dangling `pl`/`recipe` ref) is safe. `rejectAssembly`'s current code calls `applyRejectSilent` then `removeAssemblyLine` (reject before delete) — if that order matters (e.g. `rejectAssembly(pl, recipe)` needs the assembly line to still exist to compute something), the spec should say so; if order doesn't matter, that's also worth a sentence, since two sequential proxy calls from a component invite subtle contract-violating reordering later.
[R5.S9 — no scenario asserts distinct default-vs-always rejectPrompt behavior] — `applyRejectSilent` (per the confirmed helper implementation) is a no-op unless `config.rejectPrompt === "always"`. R5.S9 asserts "`optimizer.enabledRecipes` reflects the remembered reject behavior exactly as `applyRejectSilent` previously computed it" — this correctly punts exact behavior to the existing helper (reasonable, avoids re-specifying `suggestions.ts` logic), but the scenario never states the no-op case (rejectPrompt not "always") is still expected to recompute indexes via `_updateRates()`. Minor gap: confirm the no-op path still recomputes (harmless but currently unstated).
[R4.S3/R4.S4 — narrowing trade-off, flagged not blocking] — The literal-token narrowing fixes testability but means the enforcement is now bug-specific rather than pattern-general: a future bare-ref rate-affecting mutation using a different method name (not `splitRecipeRates`) or a different silently-mutating helper (not `applyRejectSilent`) would not be caught by R4.S3/R4.S4 as written. This is an appropriate and scoped trade-off given issue #23's concrete fix, and matches the proposal's stated scope — noting it for the record, not as a defect to fix in this change.
[Impact section vs R5 table — minor terminology drift] — Proposal's Impact section (line 27) lists the new methods as `splitRecipeRates(pl)`, `rejectLine(pl)`, `rejectAssembly(pl, recipe)` with no mention of deletion being folded in, which is actually consistent with the spec's "separate call" framing and inconsistent with proposal line 9's "wrap ... delete logic" phrasing — i.e., the proposal is internally inconsistent with itself (line 9 vs line 27/Impact), not just with the spec. Same root issue as the first finding above; flagging the internal proposal inconsistency specifically so whoever resolves it fixes both proposal lines, not just spec vs. proposal.

## Pass 3 — 2026-07-12

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass
[Proposal vs R5 table row/R5.S9 — deletion-scope contradiction] — RESOLVED. Proposal line 9 rewritten: "These wrap only the `applyRejectSilent(factory.optimizer, …)` mutation ... Deletion itself is unchanged — the component still separately calls `props.onDeleteClicked()` / `removeAssemblyLine()` right after, exactly as today (those paths already recompute on their own)." This now matches the spec's R5 table row ("deletion itself is a separate, already-contracted call") and R5.S9 exactly. Re-verified: Impact section (line 27) was already consistent with this framing (only ever listed the three method names, never claimed deletion was folded in), so the fix on line 9 alone closes both the spec-vs-proposal and the proposal-internal inconsistency flagged in Pass 2. No remaining contradiction.
[R5.S9 — deletion ordering/atomicity unspecified] — RESOLVED. New trailing clause: "the mutator's recompute completes before the component's separate, unchanged deletion call (`onDeleteClicked()` / `removeAssemblyLine()`) runs — the two stay sequential, caller-side steps, exactly as today." States the order explicitly (reject-mutator first, delete second) and frames it as preserved/unchanged existing behavior rather than an ambiguous new constraint. Matches confirmed code order in both `rejectLine` and `rejectAssembly`. Re-checked for new ambiguity introduced by this clause: none found — it's descriptive of a fact about call order, not a normative rule inviting a "what if reordered" question, and no dangling-reference risk since delete always runs after, never before, the reject write.
[R5.S9 — no scenario asserts default-vs-always rejectPrompt still recomputes] — RESOLVED. R5.S9's WHEN clause now states explicitly "`_updateRates()` always running regardless of whether `optimizer.rejectPrompt` is `"always"` ... or something else ... — mirroring `rejectAllSuggestions()`'s unconditional recompute." Closes the previously-unstated no-op-path gap.

### Findings
(none)

## Pass 4 — 2026-07-12

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass
(No spec-review finding was open going into this pass — Pass 3 was APPROVED with none. This pass responds to design-review Pass 1 finding #1, the `applyRejectChoice`/`onRejectChoice` gap, now folded into the spec.)

New content added for the `onRejectChoice`/`applyRejectChoice` gap, checked against the actual helper code (`app/models/suggestions.ts`):
- R4 requirement text: now states both `applyRejectSilent` and `applyRejectChoice` "share this shape" and enforcement "SHALL cover both, not only the one the bug happened to use." Verified both helpers mutate `RecipeOptimizerConfig` in place with no recompute (`suggestions.ts:15-38`) — identical shape, correctly generalized.
- R4.S4: widened to ban `applyRejectSilent(` or `applyRejectChoice(`, mapping to four mutators (`rejectLine`/`rejectAssembly` for the silent path, `rejectLineChoice`/`rejectAssemblyChoice` for the prompted-choice path). Still a concrete literal-token ban, same testable style as R4.S1–S3 — the Pass 1/2 testability fix isn't undone by this widening.
- R5 table: gains one consolidated row covering all four reject mutators (silent + prompted-choice), all `_updateRates` only. Appropriate consolidation — all four share the identical recompute bucket, no information lost.
- R5.S9: `rejectAssembly` signature corrected to `Factory.rejectAssembly(recipe)` (no `pl`). Verified against `suggestions.ts` — `applyRejectSilent`/`denyRecipes` operate purely on `config` + `recipeSlugs`; the assembly-scoped variant never needed `pl`. Consistent with the corrected proposal/design.
- R5.S10 (new): covers `rejectLineChoice(pl, choice)` / `rejectAssemblyChoice(recipe, choice)`, matching `applyRejectChoice`'s real three-param signature (`suggestions.ts:15-19`). THEN clause asserts unconditional "indexes are recomputed" — consistent with R5.S9's explicit "always running regardless of branch" framing, just terser; not a gap, since `applyRejectChoice`'s `"never"`/`"no"` no-op branches on `enabledRecipes` are still covered by the unconditional recompute assertion.
- The `pl`-vs-no-`pl` asymmetry (line-scoped keeps `pl`, assembly-scoped drops it) is applied consistently across both R5.S9 (silent) and R5.S10 (choice) — no internal inconsistency between the two.

### Findings
[R4 requirement text — stale phrasing, non-blocking] — Still reads "the two concrete escape patterns" and "R4 gains two new enforcement scenarios (R4.S3, R4.S4)." Literally true at the scenario level (still exactly two scenarios) and at the category level (bare-ref-mutation vs. helper-mediated-mutation are still the only two categories), but those two scenarios now collectively ban three literal tokens (`splitRecipeRates`, `applyRejectSilent`, `applyRejectChoice`) across five mutators, not the original two-to-two mapping. Not incorrect, just a residual phrase from before the `applyRejectChoice` widening that could momentarily undercount scope for a skimming reader. Cosmetic only — does not block approval.
