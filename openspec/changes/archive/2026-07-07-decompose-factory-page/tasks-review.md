<!-- Append-only. Each review pass adds a new ## Pass N section. Never delete or edit previous passes. -->

## Pass 1 — 2026-07-06

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass
(first pass: empty)

### Findings
- [1.7] — factory-session R7.S2 (dirty + autosave-on → silent save then clear) and R7.S3 (dirty without autosave → confirm dialog, cancel untouched) have no stub; 1.7 lists only R7.S1. fix: add both to the 1.7 stub list.
- [Group 1] — factory-session R2.S1 (proxy mutation re-renders FactoryPage with no version counter) has no stub anywhere; it needs an integration test, not a hook test. fix: add an integration stub task (e.g. extend `FactoryComponent.test.tsx` scope in Group 1) or map R2.S1 to an existing named test.
- [1.3] — library-ops R5.S1 (single-factory import without consent), R5.S2 (bundle import loads root), R5.S3 (library import without consent) are unstubbed; 1.3 covers only R1–R4. fix: add wiring stubs (integration) or an explicit task noting which test covers each.
- [Group 1] — page-structure R5.S1 (FactoryJsonDialog display + copy) and R6.S1 (SectionTabs + solver-error alert) have no stubs. fix: add component/integration stub tasks.
- [1.2] — lib-utilities R7.S2 (export filename = `sanitizeFilename(name) + ".json"`, no inline regex at call site) has no stub or grep check; 2.2 only implements it. fix: add assertion to 1.2 or a grep line to 6.3.
- [6.3] — factory-autosave R1.S3 (autosave scheduling not reachable from `factory.update`) is an inspection scenario with no covering task; 6.3's `.update =` grep checks assignment, not reachability. fix: add it to 6.3's checklist.
- [6.3] — factory-session R5.S5 (exactly one code path sets identity fields from a serialized factory) has no verification task. fix: add to 6.3.
- [6.3] — factory-url-sync R5.S1 (restore delegated to session API, no duplicated logic) has no verification task. fix: add to 6.3.
- [4.1] — task bundles eleven responsibilities (container, shim, loadSerialized+muting, subscription seam, identity, dirty, buildSerialized, doSave, clear, rebuild) — too big for one session and one review unit even inside the single commit. fix: split into 4.1a (store/shim/subscription/dirty) and 4.1b (loadSerialized/clear/doSave/rebuild).
- [4.3] — "all five mirroring refs" contradicts proposal ("six refs mirror state") and autosave R1's four named refs. fix: name the refs being deleted so the count is checkable.

## Pass 2 — 2026-07-06

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass
- [1.7] session R7.S2/R7.S3 stubs — resolved: covered in new 1.10 integration stubs.
- [Group 1] session R2.S1 re-render stub — resolved: 1.10 (mount-level, no version counter).
- [1.3] library-ops R5.S1–S3 wiring stubs — resolved: new 1.11 integration stubs.
- [Group 1] page-structure R5.S1/R6.S1 stubs — resolved: new 1.12.
- [1.2] lib-utilities R7.S2 — resolved: 1.12 asserts the `downloadJson` filename arg.
- [6.3] autosave R1.S3 reachability — resolved: added to 6.3 inspection checklist.
- [6.3] session R5.S5 single restore path — resolved: added to 6.3.
- [6.3] url-sync R5.S1 delegation — resolved: added to 6.3.
- [4.1] oversized task — resolved: split into 4.1 (store/shim/loadSerialized/muting/seam) and 4.2 (buildSerialized/doSave/clear/rebuild); downstream tasks renumbered consistently.
- [4.3] ref count — resolved: 4.4 names the four autosave refs deleted there and accounts for `sidebarWidthRef` (3.3) and `activeSectionRef` (5.1, noted in 5.1) — six total, matching the proposal.

### Findings
- [4.4] — gates on "1.10 green", but 1.10's stubs mount `tests/integration/FactoryPage.test.tsx` against a component that is only created in 6.2; at 4.4 they can only fail-to-compile, so the gate is unsatisfiable as sequenced. fix: drop 1.10 from 4.4's green list (6.2 already gates on 1.10–1.12), or restate 1.10 to mount the current root (FactoryComponent) and rename at 6.2.

## Pass 3 — 2026-07-06

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass
- [4.4] unsatisfiable 1.10 gate — resolved: 4.4's green gate now reads "1.7 + 1.8 green (1.10–1.12 mount FactoryPage and go green at 6.2)"; 1.10 dropped from the 4.4 gate, 6.2 remains the sole gate for 1.10–1.12. Sequencing is now consistent end to end.

### Findings
(none)
