<!-- Append-only. Each review pass adds a new ## Pass N section. Never delete or edit previous passes. -->

## Pass 1 — 2026-07-04

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass

(first pass — empty)

### Findings

- [factory-recipe-identifiers R1] 🔴 HIGH: known-sites list incomplete — codebase has 4 more `"factory:"` sites: `app/components/ProductionLineComponent.tsx:80` (template construction), `app/components/NestedFactoryRow.tsx:23` (`.replace`), `app/components/logistics/AssemblyLineNode.tsx:132` (`.slice`), `app/components/logistics/graph-model.ts:132` (`.slice`). Implementer following list leaves sites; sweep scenario R1.S2 then fails. Fix: add all 4 to known-sites list (and reconcile proposal Impact, which names none of them).
- [factory-recipe-identifiers R1] 🟡 MEDIUM: `factoryRecipeId(slug)` behavior on input lacking `factory:` prefix unspecified — `.slice` mangles, `.replace` passes through; callers today always pass prefixed slugs but helper is public. Fix: specify (return input unchanged, or document precondition that input starts with prefix).
- [game-data R1.S1] 🟡 MEDIUM: pins "all 29 former importers" — actual count of files importing `models/library`/`./library` is 34 (15 in `app/`, 19 in `tests/`). Wrong pinned number makes scenario unverifiable as written. Fix: drop the count ("all former importers in `app/` and `tests/`") or correct it after recount.
- [game-data R2 / R2.S1] 🟡 MEDIUM: "identical to today" / "equal their pre-change values" is untestable once `library.tsx` is deleted — no baseline exists in the repo to compare against. Fix: pin concrete expected values (e.g. `parts.length === N`, `recipes.length === M`) or require a committed snapshot fixture captured pre-change.
- [game-data R4.S1] 🟡 MEDIUM: exclusion "and unrelated non-tolerance numerics" is a judgment call — a grep-based check can't distinguish "unrelated". Fix: define the exclusion concretely, e.g. "any literal not used in a rate comparison, threshold, or LP-constraint scaling expression" or enumerate the allowed residual sites.
- [game-data R2] ⚪ LOW: `recipeSlugLookup` collision behavior unspecified (two recipes with same slug — current `factory-storage.ts:237` is last-write-wins). Fix: state uniqueness is assumed or specify last-write-wins.
- [machine-math R2.S1] ⚪ LOW: missing the no-recipe shape `{ fullMachines: 0, remainderClock: 0 }` (returned by `assembly-line.tsx:167`) → expected `0`. Fix: add to scenario inputs.
- [machine-math R3.S1] ⚪ LOW: search patterns use ellipses (`(… - 100) / 50`) — not literally greppable. Fix: give exact regexes or describe as "the shard ceil expression and the remainder-total ternary".
- [lib-utilities R6.S2] ⚪ LOW: grepping `storage-service.ts` for `document` matches prose like "documentation" in comments. Fix: search for `document.` (API usage) instead.

## Pass 2 — 2026-07-05

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass

- [factory-recipe-identifiers R1, HIGH] RESOLVED — all 4 missing sites added to R1 known-sites (`ProductionLineComponent.tsx`, `NestedFactoryRow.tsx`, `logistics/AssemblyLineNode.tsx`, `logistics/graph-model.ts`); proposal What-Changes and Impact reconciled to match. Verified against grep: list now covers every `"factory:"` occurrence in `app/`.
- [factory-recipe-identifiers R1, MEDIUM] RESOLVED — `factoryRecipeId` no-prefix behavior specified as pass-through ("leading `factory:` prefix removed, or the input unchanged when the prefix is absent") with new scenario R1.S2 pinning `factoryRecipeId("iron-plate") === "iron-plate"`.
- [game-data R1.S1, MEDIUM] RESOLVED — pinned "29" dropped from scenario ("all former importers in `app/` and `tests/`"); proposal corrected to 34 files, matching the actual grep count (15 app + 19 tests).
- [game-data R2/R2.S1, MEDIUM] RESOLVED — R2.S1 now pins concrete counts: `parts.length === 176`, `buildings.length === 16`, `recipes.length === 293` (276 base + 17 burn). Independently verified against `data.json` + `library.tsx` load logic (175 items + injected Power part; 17 fuels with `energyValue > 0` matched by a generator): all three counts correct.
- [game-data R4.S1, MEDIUM] RESOLVED — exclusion defined concretely as "keeping only matches used in a rate comparison, threshold check, or LP-constraint scaling expression"; judgment call eliminated.
- [game-data R2, LOW] RESOLVED — slug uniqueness stated with last-write-wins registration, matching current `factory-storage.ts:237` behavior.
- [machine-math R2.S1, LOW] RESOLVED — zero shape `{ fullMachines: 0, remainderClock: 0 }` → `0` added to scenario.
- [machine-math R3.S1, LOW] RESOLVED — exact regexes given (`- 100\) / 50`, `remainderClock > 0 \? 1 : 0`); verified both match all known inline sites and nothing else in `app/`.
- [lib-utilities R6.S2, LOW] RESOLVED — scenario now searches API usages `document.`, `new Blob`, `URL.createObjectURL`; prose false-positive eliminated.

### Findings

None. Cross-checked in Pass 2: pinned data counts (correct), R3.S1 regex coverage (complete), R1 known-sites vs live grep (complete), `MachineCountDisplay.tsx` exclusion parenthetical (accurate — file has per-shape field access only, no total expression), R1.S2 pass-through semantics (testable, constrains implementation away from bare `.slice`).
