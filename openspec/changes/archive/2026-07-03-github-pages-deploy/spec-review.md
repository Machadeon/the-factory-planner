<!-- Append-only. Each review pass adds a new ## Pass N section. Never delete or edit previous passes. -->

## Pass 1 — 2026-07-02

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass

_First pass — empty._

### Findings

**static-export/spec.md**

[R1.S1] — "with the Pages base path configured" never says HOW it configured. no env var name anywhere in spec, proposal say "driven by an environment variable". name the variable in requirement so scenario testable. fix: state exact env var and value.
[R1.S2] — "any dumb static file server" untestable — cannot test "any" server, "dumb" undefined. fix: name one concrete verification vehicle (e.g. `npx serve out` or python http.server) as the test.
[R3] — "100% functional" and "work identically to the dev server" absolute/untestable language. requirement enumerates dialogs, drawers, recipe library, but no scenario exercises them — only one scenario (factory + persistence). fix: replace absolutes with enumerated checks and add scenarios for dialog/drawer + library open, or narrow requirement text to what R3.S1 covers.
[R3] — missing edge case: fresh browser navigation / hard reload at `https://.../the-factory-planner/` (GitHub Pages has no SPA fallback; trailing-slash redirect behavior). R3.S1 only says "across a page reload" after site already loaded. fix: add scenario for cold direct navigation to base-path URL.
[R2] — helper "applies base path exactly once" but behavior undefined when input already carries prefix or is an external/absolute URL. fix: state input contract (paths always root-relative) or define helper behavior for prefixed input.
[R4.S2] — "pass without any base-path-related modification" ambiguous: any test failure would fail scenario regardless of cause, cannot distinguish base-path-related from unrelated. fix: reword to "test configuration and invocation files require no changes" (config-level assertion) plus suites pass.

**pages-deployment/spec.md**

[R1.S2] — manual `workflow_dispatch` doesn't say which ref builds. dispatch from non-main branch would deploy unreviewed code to live site. fix: state dispatch builds `main` (or the dispatched ref, explicitly chosen).
[R2] — covers build failure only; deploy-step failure (build ok, `actions/deploy-pages` fails) not addressed — does live site stay at prior version? fix: add scenario or extend requirement to "any job failure before successful deploy leaves prior site live."
[R3.S2] — "serialized/superseded" permits two different concurrency behaviors (queue vs cancel-in-progress). implementation must pick one. fix: specify `cancel-in-progress` true or false for the concurrency group.
[R3] — ".nojekyll present in the published output" testable only indirectly via R3.S1; no scenario asserts the file itself in artifact. minor. fix: fold assertion into R3.S1 or drop the parenthetical from requirement text and keep behavior-only check.

**Scope check**

None — both specs stay within proposal scope (export config, base-path handling, workflow, .nojekyll). No excess requirements found.

## Pass 2 — 2026-07-02

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass

**static-export/spec.md**

- [R1.S1] env var unnamed — resolved: `NEXT_PUBLIC_BASE_PATH` named in R1 requirement text and used concretely in R1.S1, R2.S1–S3, R4, R4.S1–S2.
- [R1.S2] "any dumb static file server" — resolved: reworded to "plain static file server with no rewrite rules" with concrete vehicles (`npx serve out`, `python3 -m http.server`).
- [R3] untestable absolutes / uncovered behaviors — resolved: "100% functional"/"identically" removed; requirement now enumerates behaviors, and new R3.S2 exercises drawer + recipe dialog with observable checks (no console errors, no failed asset requests).
- [R3] missing cold-load edge case — resolved: new R3.S3 covers direct navigation and hard reload at base path, trailing and non-trailing slash, no SPA fallback dependency.
- [R2] helper input contract undefined — resolved: contract stated (root-relative `/` path, no pre-existing prefix, unchanged when no base path) plus explicit exclusion of `next/image` from the helper.
- [R4.S2] cause-attribution ambiguity — resolved: scenario now a config-level assertion (`basePath`/`assetPrefix` absent; `playwright.config.ts`/`vitest.config.ts` need no edits).

**pages-deployment/spec.md**

- [R1.S2] dispatch ref unspecified — resolved: R1 mandates deploy-job guard on `main` ref; R1.S2 pinned to `main`; new R1.S3 asserts non-main dispatch skips deploy.
- [R2] deploy-step failure unaddressed — resolved: requirement retitled to cover any failed run; new R2.S2 covers build-ok/deploy-fail leaving prior version live.
- [R3.S2] concurrency behavior ambiguous — resolved: `cancel-in-progress: false` specified; R3.S3 asserts in-flight deploy completes and newest commit wins.
- [R3] `.nojekyll` not directly asserted — resolved: new R3.S2 checks artifact root contains `.nojekyll`.

### Findings

None.
