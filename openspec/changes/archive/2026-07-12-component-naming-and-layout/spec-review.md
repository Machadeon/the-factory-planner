<!-- Append-only. Each review pass adds a new ## Pass N section. Never delete or edit previous passes. -->

## Pass 1 — 2026-07-12

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass
(none — this is pass 1)

### Findings

**Scope-count mismatch / undercount**

[R1] — Proposal claims "14 files sitting flat" and "~14 file moves/renames," but `ls app/components/*.tsx` shows **22** flat files besides `ThemeRegistry.tsx` (`AssemblyLineComponent, AssemblyLineControls, ClockDisplay, ConstraintsPanel, Dividers, FactoryHeader, FactoryIconPicker, FactoryPickerDialog, LogisticsSection, MachineCountDisplay, NestedFactoryRow, OptimizationSection, PartSelector, PlanningSection, ProductionLineComponent, ProductionTargetsBar, RecipeComponent, RecipeOverrideRow, RecipeRejectDialog, StorageConsentDialog, SuggestedActions, TextCalculatorField`). The "14" is stale; the sweep is ~60% larger than scoped. Evidence: `app/components/` listing.

[R1] — **`LogisticsSection.tsx` has no destination in §3's target tree.** R1 requires every flat file move "matching the target tree in `plans/component-refactor.md` §3," but §3 never names `LogisticsSection.tsx` (grep: 0 refs); the `logistics/` block only says "already well-factored; only naming/context alignment." R1.S4 would fail (`LogisticsSection.tsx` still flat) with no spec-authorized target dir. Presumably → `logistics/`, but the spec must state it. Evidence: `app/components/LogisticsSection.tsx`, `plans/component-refactor.md` §3.

[R1] — **`FactoryPickerDialog.tsx` destination ambiguous.** It's flat but §3's tree lists it under `planning/` (line 166); nothing in the delta spec pins that. R1.S4's checkability depends on a stated home for every one of the 22 files, and several (FactoryPickerDialog, LogisticsSection) aren't unambiguously mapped by "§3 target tree" alone. Evidence: `app/components/FactoryPickerDialog.tsx`.

**Testability of dead-code deletion**

[proposal] — "Delete dead code per current `npm run knip` output" has **no requirement or scenario** and is not mechanically checkable as written. `npx knip` currently reports **25 unused exports + 8 unused types** the proposal never enumerates (`VerticalDivider`, 6× `ui/interactive-styles.ts`, 7× `lib/expression/index.ts` re-exports, `syntheticSinkPoints`, `combiners`/`filters`/`PossibleValue`, `SerializedAssemblyLine`/`SerializedProductionLine`, `RejectPrompt`, `ConfirmSeverity`, `NodeKind`/`GraphNodeData`/`GraphEdge`, …). B0.4 left exports/types at knip *warn* "until B3 prunes, then flip to error." There is no scenario asserting "knip exits clean" or "warn→error flip happens," so the phase's own dead-code goal is unverifiable and the knip-severity flip (a B0.4 handoff) is unowned. Evidence: `npx knip`, `plans/plan.md` B0.4.

**`factory-storage.ts:226 as unknown as` may be behavior-adjacent, not pure cleanup**

[proposal] — The cast is **load-bearing**, not spurious. `data.optimizer` is typed `RecipeOptimizerConfig` whose `availableParts: AvailablePart[]`, but legacy stored data can hold `string[]`; the cast `as unknown as (string | AvailablePart)[]` exists precisely so the `.map(p => typeof p === "string" ? {...} : p)` migration can inspect a value the type says can't be a string (`factory-storage.ts:219-233`, comment: "tolerate an older availableParts shape (string[])"). "Closing" it properly means loosening the *input* type (serialized/unknown shape) — not deleting the cast — and doing it wrong drops legacy normalization. This is a type-honesty fix with a real migration behind it, so "No new capability, no behavior change" understates the risk. It warrants either a note that the runtime `.map` normalization must be preserved, or a regression test on the `string[]`→`AvailablePart[]` path. Evidence: `app/models/factory-storage.ts:219-233`, `optimizer-config.ts:15,47`.

**Bullets targeting code that no longer exists / already done**

[proposal] — "Remove re-exported `clickableClass` string constants from `RecipeComponent`/`ProductionLineComponent`" — `grep -rn clickableClass app/ tests/` returns **zero matches anywhere**. This bullet is dead scope (already removed, likely in Phase 1); it will read as a no-op or send the implementer hunting for nonexistent code. Evidence: repo-wide grep.

**R4 scope edges**

[R4] — R4 grep-scope is `app/components/**`, so it will NOT catch: (a) `tests/integration/AssemblyLineComponent.test.tsx` — a test file still carrying the dead `Component` suffix, left inconsistent (proposal's rename bullet names only `library-ops.test.ts`); (b) the stale comment at `app/models/factory.ts:305` ("per AssemblyLineComponent render") referencing a renamed component. R4.S1 passes while these survive. Consider extending "update every import site" to non-component references (comments, test filenames). Evidence: `find tests -name '*Component*'`, `factory.ts:305`.

[R4/tests] — **Path-asserting unit tests break and aren't called out.** `tests/unit/production-line-structure.test.ts:22,36` and `tests/unit/contexts/prop-contract.test.ts:47,48` hard-code literal paths `"app/components/ProductionLineComponent.tsx"` / `"AssemblyLineComponent.tsx"`. The rename+move breaks these unit tests, but Impact/proposal only mention updating *integration-test imports* and one *test rename*. These structural unit tests are a distinct, unscoped breakage. Evidence: the two files above.

**§6.2 items live inside files this change moves, but have no requirement**

[proposal] — `GraphProps` "optionality" (`library?`, `currentFactoryId?` at `LogisticsSection.tsx:41-42`) and the `SourceFactoriesEditor` dead `!library` guards (`:46,:62`) are listed as cleanup with "no spec delta." Fine as impl-only, but note `GraphProps` lives inside `LogisticsSection.tsx` — the very file R1 must relocate (see R1 gap above) — so these two items are coupled to a move the spec doesn't yet anchor. Flagging for coherence, not as a required new requirement. Evidence: `LogisticsSection.tsx:39-43`, `SourceFactoriesEditor.tsx:46,62`.

**Redundant/stale delta content (low)**

[R1] — The MODIFIED R1 + R1.S1/S2/S3 re-state the *already-shipped* Phase 4a library-drawer split verbatim from the base spec (`app/components/library/` already contains the 6 split files). This change touches no library files, so re-litigating library responsibilities in the delta adds scope-confusion; the delta's genuinely new content is only "repo-wide, no flat files at root" + R1.S4. Consider trimming R1 to the generalization and leaving the library-specific prose owned by the base spec. Evidence: `app/components/library/` listing (split done).

**Verified accurate (no finding):** R5 (only `useFactoryPageFlows.ts` is a misplaced hook — the six real hooks already live in `app/hooks/`); `powerPart` barrel trim (barrel re-export at `index.ts:10` is unused — `generator-recipes.ts:8` imports it from `./load`); `partLookup`/`buildingLookup` correctly kept per game-data R2; the 3 `var`s at `factory.ts:239,240,342`; AGENTS.md drift (dead `Factory.update()`/`FactoryComponent` claim at line 79; "schemaVersion 2" at line 114 vs `CURRENT_SCHEMA_VERSION = 1`; migration now in `migrations.ts`); `library-ops.test.ts` tests `migrations.ts` (rename valid → `migrations.test.ts`); ThemeRegistry is genuinely app-wide (`layout.tsx`); no overlap with `ui-primitives` R9/R10 (delta correctly defers domain-free + frozen-selector rules to that spec).

## Pass 2 — 2026-07-12

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass

- **14-vs-22 flat file undercount** — resolved. `proposal.md` and `R1.S4` now list all 22 files with a from→to table; re-verified `find app/components -maxdepth 1 -type f` still returns exactly those 22 (no drift). Table destinations checked for collisions against existing `app/components/planning/` contents (`FactoryRecipeCard.tsx`, `ProductionLineDetails.tsx`, `ProductionLineRow.tsx`, `RecipePicker.tsx`) and `tests/integration/` — no collisions with `AssemblyLine.tsx`/`ProductionLine.tsx`/`Recipe.tsx` or their `.test.tsx` counterparts.
- **`LogisticsSection.tsx` / `FactoryPickerDialog.tsx` unmapped destinations** — resolved. Both now explicit rows in the R1.S4 table (`logistics/LogisticsSection.tsx`, `planning/FactoryPickerDialog.tsx`).
- **Verbatim-move framing for the 3 `*Component.tsx` files** — reasonable and consistent with R4: the table renames them to `AssemblyLine.tsx`/`ProductionLine.tsx`/`Recipe.tsx` in `planning/`, satisfying "no `Component` suffix" without expanding scope into re-decomposition. Explicitly and correctly called out as out-of-scope-for-further-split.
- **Dead-code testability** — resolved well. New R6 ties deletion to a mechanical `npm run knip` exit-code check rather than a hand-maintained list. **Independently verified the mechanism is sound**: `npm run knip` currently exits 0 despite reporting 25 unused exports + 8 unused types (because `exports`/`types` are `warn` in `knip.json`); temporarily flipping both to `error` in a scratch test reproduced exit code 1 with the same findings present, then reverted (`git diff --stat knip.json` clean after). R6.S1's premise — flip severity, then require exit 0 — is mechanically real, not hand-wavy.
- **`factory-storage.ts:226` cast** — resolved correctly. New `optimizer-config` R5 requires cast-free normalization *and* pins the legacy `string[]` → `{partSlug, rate:0}` behavior with a dedicated regression-test scenario (R5.S2) plus an unchanged-object-shape scenario (R5.S3). This directly answers Pass 1's concern that the fix could silently drop legacy-shape tolerance.
- **`clickableClass` dead bullet** — resolved, removed and replaced with a "verified not in scope" note citing the zero-match grep (re-verified: still zero matches repo-wide).
- **R4 scope edges** (stale `factory.ts:305` comment, path-asserting unit tests, `AssemblyLineComponent.test.tsx` rename) — resolved via new R4.S2/R4.S3, each independently re-verified against the current file contents (comment still at the cited location pre-change; both test files still contain the literal old-path strings; `AssemblyLine.test.tsx` name is free of collisions).

### Findings

[recipe-type-model R3] — **The updated Note's framing is factually off, though the net spec state is fine.** The new Note says the `factory-storage` serialized-parts cast was "previously exempted **here** as out of scope" and "is now closed by `optimizer-config`'s R5." But R3's scope was never about this cast in the first place — R3 targets casts that read a *`FactoryRecipe` capability* (`avgPowerPerInstance`, `shardsPerInstance`, etc.) from a recipe reference; the `factory-storage.ts:226` cast is about `availableParts: string | AvailablePart`, an unrelated shape-tolerance concern that happened to share the `as unknown as` idiom. The base spec's original note excluded it because it's the wrong *category* of cast, not because R3 deferred fixing it. Framing this as "no longer exempt, no longer present" implies R3 used to cover it and now does — it never did and still doesn't (R3.S1's own search filter is explicitly scoped to the named `FactoryRecipe` members, which excludes `availableParts`). Low severity — doesn't change what ships or what's tested (`optimizer-config` R5 correctly owns the real fix), but the delta's rationale for touching `recipe-type-model` at all is built on a mischaracterization. Suggest simplifying the Note to just drop the factory-storage clause without claiming R3 "closes" it. Evidence: `openspec/specs/recipe-type-model/spec.md` R3/R3.S1 (target-member list has no `availableParts`/`AvailablePart` entry); confirmed byte-identical R3 requirement text and R3.S1 scenario between base and delta via diff — only the trailing Note prose changed.

[R6] — **Minor looseness in the keep-vs-delete escape hatch.** R6's text allows an unused export to survive either via "annotated" (implying some source-level tag) or via "`knip.json`'s ignore list" — two different mechanisms, neither specified, and the repo currently has zero precedent for either (no existing `knip.json` `ignore`/`ignoreExportsUsedInFile` entries, no tag-annotation convention in source). This doesn't break R6.S1's checkability (exit-0 is exit-0 regardless of which mechanism is used), but an implementer deciding "keep `SerializedAssemblyLine`/`SerializedProductionLine` as public API" has no guidance on which of the two mechanisms to use, risking inconsistency. Non-blocking; worth a one-line pick-one note (e.g. "prefer knip.json's `ignore`/`ignoreExportsUsedInFile`, since no source-tag convention exists today") before or during design.md.

**Verified accurate (no new issues):** R1.S4's 22-row table matches the live filesystem exactly, right down to directory assignment consistency with R4 (all three suffix-bearing files land in `planning/` under their de-suffixed names); R6.S1's knip mechanism independently reproduced; `optimizer-config` R5's new requirement doesn't collide with base spec's existing R1-R4; no numbering collisions introduced in either modified base spec.

## Pass 3 — 2026-07-12

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass

- **`recipe-type-model` R3 Note mischaracterization** — resolved. Re-read the file fresh: R3's requirement statement and R3.S1 scenario remain byte-identical to the base spec (diffed to confirm); only the trailing Note changed, and it now correctly states the `factory-storage` cast "was likewise never in scope for R3 (it doesn't read a `FactoryRecipe` capability)" and was "removed independently by the `optimizer-config` capability's R5" — no more "exempted by R3" / "R3 closes it" framing. Matches R3.S1's actual search filter (named `FactoryRecipe` members only, no `availableParts`).
- **R6's undefined escape hatch** — resolved. Re-read `knip.json` fresh: confirmed it has only `ignoreDependencies` (for the `dependencies` rule), nothing for exports/types. R6's text now states this explicitly and converges on one real fallback — a one-line code comment at the export site — rather than inventing a per-export knip.json feature. The "only if such a knip feature applies" clause is slightly redundant now that its absence is confirmed, but it's not a broken or fictional mechanism, and R6.S1's exit-0 check stays mechanically checkable regardless of which of the two paths an implementer takes. Not blocking.

### Findings

None. Both Pass 2 items independently re-verified against the current file contents (not the coordinator's summary): the R3 note's wording, byte-diffed against base to confirm no unintended scope drift; the R6 escape hatch, checked against actual `knip.json` contents. No new issues surfaced on this pass — the spec's requirements are each mechanically checkable (grep/list/diff/exit-code), the 22-file mapping is complete and collision-free, R4/R5/R6 close the gaps found in Pass 1, and both new capability deltas (`optimizer-config` R5, `recipe-type-model` R3 note) are internally consistent with their base specs.
