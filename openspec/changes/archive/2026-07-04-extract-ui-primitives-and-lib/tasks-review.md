## Pass 1 — 2026-07-04

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass

_(first pass — none)_

### Findings

- [icon-rendering R2.S1 / Group 1] — behavioral scenario has no test stub: labeled-vs-decorative Icon contract (tooltip + alt for non-empty label, no tooltip + empty alt for `label=""`) is tested nowhere; the only Icon coverage referenced is `tests/integration/icon-base-path.test.tsx` (base path only) and Group 6 just moves the file. add stub 1.14 `Icon.test.tsx` (or extend the existing test) covering R2.S1.
- [2.1 / Group 2 ordering] — baseline contradiction: 2.1 runs the full suite "on branch tip before implementation" expecting green, but Group 1 stubs (written before it) fail by design — and 1.13 injects a failing stub into an existing passing file — so `npm run test:run` at 2.1 cannot be green as written. capture the green baseline on main (per proposal acceptance contract) before writing stubs, or split 2.1: green baseline first, then write stubs, then confirm stub-failure.

## Pass 2 — 2026-07-04

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass

- [icon-rendering R2.S1] missing Icon behavior stub — resolved: stub 1.14 `Icon.test.tsx` covers labeled (tooltip + alt) vs decorative (no tooltip, empty alt), imports the `ui/Icon` path; 6.1 notes it passes there.
- [2.1 baseline contradiction] — resolved: Group 2 split into 2.1 (green baseline captured on pre-stub main-equivalent tree, stash-if-needed note) and 2.2 (run stubs 1.1–1.14, confirm each fails), with an explicit execution-order note.

### Findings

- [3.5/4.6/5.9 green gates vs Group 1 stubs] — the intermediate green gates have the same contradiction 2.1 had: with all stubs 1.1–1.14 in the working tree, `npm run test:run` at 3.5 still has 1.5–1.14 red, at 4.6 still has 1.13/1.14 red (4.6 even says only "stubs 1.5–1.12 now pass"), and at 5.9 still has 1.14 red until 6.1 — so no gate before Group 6 can be fully green as written, conflicting with design D9's "each commit leaves the suite green". specify the mechanism: commit each stub file with its implementing group (matching D9 "lib split + tests", "primitives + integration tests"), or mark later-group stubs `test.todo`/`skip` until their group un-skips them, and state which gates run against committed tree vs working tree.

## Pass 3 — 2026-07-04

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass

- [3.5/4.6/5.9 green gates vs Group 1 stubs] — resolved: "Stub lifecycle" note in Group 2 specifies the mechanism — all 14 stubs written in the working tree during Group 1 and confirmed failing at 2.2; each stub file staged and committed with its implementing group (1.1–1.4 → commit 1, 1.5–1.12 → commit 2, 1.13 → commit 3, 1.14 → commit 4); green gates 3.5/4.6/5.9/Group 7 run against the committed tree with later-group stubs held uncommitted. Consistent with each gate's own pass-claims (4.6, 5.9, 6.1) and preserves D9 green-per-commit plus failure-then-pass per stub; by Group 7 all stubs are committed.

### Findings

_none — all Pass 1 and Pass 2 concerns resolved; scenario-to-task coverage complete, stub ordering and inter-group dependencies now contradiction-free._
