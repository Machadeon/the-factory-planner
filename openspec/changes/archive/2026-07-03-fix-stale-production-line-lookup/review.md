<!-- Append-only. Each review pass adds a new ## Pass N section. Never delete or edit previous passes. -->

## Pass 1 — 2026-07-03

**Source: Reviewer**
**Status: APPROVED**

### Resolved from Previous Pass
(first pass: leave empty)

### Findings

tests/unit/models/factory.test.ts:145: 🔵 nit: `.sort()` on `["iron-ingot", "iron-rod"]` is an already-sorted literal, redundant call. Author can ignore.

No CRITICAL or HIGH findings. `app/models/factory.tsx` change is a single-line fix (`this._productionLineLookup = {};` added to `_updateRates()`, factory.tsx:259), matching the reset pattern of the four sibling containers in the same method — no scope creep, no unrelated changes. Test additions cover all 7 spec scenarios (R1.S1-S7), verified pre-fix (S1/S2/S3/S5/S6 failed, S4/S7 passed as expected regression guards per tasks.md 1.8), and post-fix all 35 tests in the file pass. Full suite (`npm run test:run`, 223 passed) and `npm run build` both clean. Biome check clean on both changed files. Manual browser verification against `bugs/cannot_optimize_after_reject.md` confirms the recorded bug no longer reproduces (optimize → reject all → optimize again now yields the same 35 suggested recipes / 100,000 MW output as the first optimize).
