<!-- Append-only. Each review pass adds a new ## Pass N section. Never delete or edit previous passes. -->

## Pass 1 — 2026-07-05

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass

(first pass — empty)

### Findings

- [D2 / D6] 🔴 HIGH: D2's acyclicity claim is false — `app/models/recipe.tsx:2` imports `rawResources` from `./library` today (used at `recipe.tsx:92`). Under D6's blanket path swap, `recipe.ts` would import the `game-data` barrel while `game-data/load.ts` imports the `Recipe` class from `recipe.ts` → import cycle through `index.ts` (`index` → `load` → `recipe` → `index`), surviving only accidentally via ESM live bindings because the use is inside a method — fragile with module-init side effects. Fix: correct D2's "true today" claim; direct `recipe.ts` to import `rawResources` from `game-data/constants` directly (constants has no imports, keeping the graph acyclic); add a D6 exception that model files imported *by* `game-data` must not use the barrel.
- [Migration Plan] 🟡 MEDIUM: no docs step — `AGENTS.md` hard-references `app/models/library.tsx` (line 85), `.tsx` model paths (`factory.tsx`, `assembly-line.tsx`, `production-line.tsx`, lines 60–62), and the kebab-case example `assembly-line.tsx` (line 163); all go stale after rename+split. Memory files reference the same layout. Fix: add an explicit commit/step updating `AGENTS.md` path references (and note openspec main-spec sync at archive).
- [Migration Plan] ⚪ LOW: per-commit gate is `npm run test:run` only; `AGENTS.md` requires `npm run lint-fix` "always before commit", but design defers lint to the pre-PR gate. Fix: include `npm run lint-fix` in the per-commit gate.

Skill checks: modern-web-guidance searched (download-via-Blob, barrel/tree-shaking/module-side-effect topics) — no guide with meaningful similarity applies to this model-layer change; frontend-design — no UI surface exists (imports and expression swaps only), no findings.

## Pass 2 — 2026-07-05

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass

- [D2 / D6, HIGH] RESOLVED — D2 now names the `recipe.tsx` → `library` import explicitly ("Cycle hazard" paragraph) and adds the rule: files `game-data/load.ts` itself imports (`recipe.ts`, and `part.ts`/`building.ts` if ever needed) import from `game-data/constants` directly; D6 carries the matching exception. Verified acyclic by construction: `constants.ts` has zero imports and `rawResources` lives there per spec game-data R1, so the graph is `constants ← recipe ← load ← index` with no back-edge. Also verified `production-line`'s barrel allowance is safe — nothing in `game-data` imports `production-line` (`load.ts` touches only `recipe`/`part`/`building`).
- [Migration Plan, MEDIUM] RESOLVED — commit (7) added: `AGENTS.md` rewrite covering the `library.tsx` reference and the model-file `.tsx` path references going stale after rename+split.
- [Migration Plan, LOW] RESOLVED — per-commit gate now includes `npm run lint-fix` before each commit (per AGENTS.md); pre-PR full-gate list de-duplicated accordingly.

### Findings

None. Skill checks re-run this pass: modern-web-guidance searched (ES-module cycle avoidance, barrel side effects, static JSON loading) — top similarity 0.30, no applicable guide; frontend-design — no UI surface, no findings. Remaining decisions (D1, D3–D5, D7) unchanged from Pass 1 and consistent with AGENTS.md conventions (kebab-case model files, lib/ for view-side utilities, one module per concern).
