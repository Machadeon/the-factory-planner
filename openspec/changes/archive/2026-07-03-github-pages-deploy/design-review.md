<!-- Append-only. Each review pass adds a new ## Pass N section. Never delete or edit previous passes. -->

## Pass 1 — 2026-07-02

**Source: Reviewer**

**Status: CONCERNS**

_Guidance loaded per gate: `modern-web-guidance` (searched static-export/base-path/image topics — no applicable guide beyond image perf, none contradicted) and `frontend-design` (no UI is designed by this change; no applicable findings)._

### Resolved from Previous Pass

_First pass — empty._

### Findings

[D2] — unconditional `output: "export"` breaks existing `npm start` script (`package.json:8` `"start": "next start"`; `next start` errors under export mode). design claim "no feature export forbids" misses this. fix: decide fate of `start` script (remove, or repoint to static serve e.g. `npx serve out`) and state it in D2.
[D4/D7] — test claim contradicts code shape: `BASE_PATH` is module-level const captured at import time, so `vi.stubEnv` alone cannot exercise both modes as D7 asserts. fix: D7 must specify `vi.resetModules()` + dynamic `import()` per mode, or D4 helper reads `process.env.NEXT_PUBLIC_BASE_PATH` inline inside the function (Next still inlines it client-side).
[D5 vs Risks/Migration] — risk row and migration step 2 depend on `configure-pages` with `enablement: true`, but D5's workflow step list omits that parameter. fix: add `enablement: true` to the `actions/configure-pages` step in D5.
[D1] — `assetPrefix` set redundantly: Next defaults `assetPrefix` to `basePath`; explicit set adds config surface for no behavior change on Pages (assetPrefix is a CDN affordance). fix: drop it or add one-line justification (spec R4.S2 names it, so if kept, say why).
[Decisions gap] — no decision covers static-export spec R3.S3 (non-trailing-slash entry URL reaching the app); satisfied only implicitly by GitHub Pages directory 301 redirect, and `trailingSlash` config is never mentioned. fix: add one sentence recording reliance on the Pages redirect (or an explicit `trailingSlash` choice) so R3.S3 has design traceability.

**Verified, no finding:** helper location `app/utils.tsx` matches util conventions; plain `<img>` confirmed only in `Icon.tsx` and `FactoryLibraryDrawer.tsx`; no CSS `url()`, metadata links, fetch/worker, or manifest asset paths exist that would bypass the helper; `app/favicon.ico` is app-router convention (basePath applied by Next).

## Pass 2 — 2026-07-02

**Source: Reviewer**

**Status: CONCERNS**

_Guidance re-loaded per gate: `modern-web-guidance` (searched static-export/subpath topics again — no applicable guide) and `frontend-design` (no UI designed by this change)._

### Resolved from Previous Pass

- [D2 `npm start`] — resolved: D2 now states `next start` errors under export mode and repurposes the script to `npx serve@latest out`; verified no other repo consumer of `next start` (Playwright webServer uses `npm run dev`).
- [D4/D7 test claim] — resolved: helper now reads `process.env.NEXT_PUBLIC_BASE_PATH` inline (no module-level const), so `vi.stubEnv` works as D7 claims; Next build-time inlining unaffected by expression position.
- [D5 `enablement: true`] — resolved: parameter added to the `actions/configure-pages` step in D5, consistent with Risks and Migration step 2.
- [D1 `assetPrefix`] — resolved: `assetPrefix` deliberately not set, with justification (Next defaults it to `basePath`) and explicit note that spec R4.S2's "absent/empty" still holds.
- [Decisions gap R3.S3] — resolved: D2 adds trailing-slash paragraph: default `trailingSlash`, single exported route at `out/index.html`, reliance on GitHub Pages directory redirect for the slash-less entry URL.

### Findings

[D2] — new claim "`npx serve@latest out` … doubles as the spec R1.S2 verification server" is wrong for a base-path build: serving `out/` at server root leaves the page's asset URLs pointing at `/the-factory-planner/_next/...`, which 404 — the app does not load, so R1.S2 cannot be verified this way (D7 itself says base-path verification must serve `out/` *under a subpath*). fix: state which build shape `npm start` serves (root build, no env var) and keep base-path R1.S2/R3 verification on D7's serve-under-subpath method, or drop the "doubles as R1.S2 verification" clause.

## Pass 3 — 2026-07-02

**Source: Reviewer**

**Status: APPROVED**

_Guidance re-loaded per gate: `modern-web-guidance` (static-export/subpath/Pages searches — no applicable guide) and `frontend-design` (no UI designed by this change)._

### Resolved from Previous Pass

- [D2 serve clause] — resolved: `npm start` now explicitly serves a root build (no `NEXT_PUBLIC_BASE_PATH`); the incorrect "doubles as R1.S2 verification" claim is gone; D2 states base-path builds must be served under the subpath per D7 and names the exact failure mode (404 on `/the-factory-planner/_next/...`) if served at root. Consistent with D7's serve-under-subpath verification method.

### Findings

None.
