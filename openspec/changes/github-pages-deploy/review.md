<!-- Append-only. Each review pass adds a new ## Pass N section. Never delete or edit previous passes. -->

## Pass 1 — 2026-07-03

**Source: Post-deploy bug fix (full diff review)**

**Status: APPROVED**

### Context

The change was implemented and deployed to `https://machadeon.github.io/the-factory-planner/` before Sections 4.2/4.2b manual browser checks were run. Two defects surfaced on the live site, both instances of the same class: an app-generated URL that did not carry the base path (spec R2).

### Defects fixed

1. **`next/image` sources 404 under the subpath.** Root cause: `images.unoptimized: true`. `unoptimized` makes `next/image` emit the raw `src` and skip the loader, so `basePath` is never applied — contradicting the original design D3/spec R2 claim that "`next/image` applies `basePath` itself." Verified in the base-path export: `<img src="/satisfactory_logo_full_color_small.png">` (no base path) while `_next/` assets were correctly prefixed.
   - Fix: `image-loader.ts` custom loader + `images.loader: "custom"` / `loaderFile` in `next.config.ts`; removed `unoptimized`. Base-path export now emits `/the-factory-planner/satisfactory_logo_full_color_small.png` (base path exactly once, `grep -c` for the doubled segment → 0). Root build still emits the unprefixed src.

2. **`/the-factory-planner/` redirected to `/`, breaking reloads.** Root cause: `FactoryComponent` writes the URL via `history.pushState` for bookmarkable factory addresses; the paths (`"/"`, `"/?factory=…"`) were hardcoded root-relative. On mount with no factory it pushed `"/"`, rewriting the base-path URL to origin root; a reload then hit a different/empty Pages site.
   - Fix: wrap both pushed paths with `withBasePath(...)`. `replaceState` calls reuse `window.location.href` (already base-path-correct) and are unchanged; `restoreFactory` reads `window.location.search` (base-path-independent).

### Spec / design updates (append-only corrections)

- `specs/static-export/spec.md` R2: corrected the false "`next/image` applies `basePath` itself" statement; added R2.S4 (client history URLs stay under the base path) and R2.S5 (custom image loader applies base path).
- `design.md`: D3 rewritten (custom loader, not `unoptimized`, with the falsified-assumption note); D4 extended to the third application site (history URLs); Non-Goals and D7 test list updated.
- `tasks.md`: 2.1 corrected; Section 6 added for the fix; 4.1/4.2a/4.3 checked against actual verification.

### Regression tests (written first, confirmed failing against shipped code, then fixed)

- `tests/unit/image-loader.test.ts` — loader prefixing/identity/absolute-URL passthrough (R2.S5).
- `tests/integration/history-base-path.test.tsx` — mount keeps URL under `/the-factory-planner/` when env set, pushes `/` when unset (R2.S4). Confirmed it received `/` before the fix.

### Verification

- `npm run test:run` → 216 passed, 2 todo.
- Base-path build: `verify-export: OK`, next/image src prefixed once, no doubled base path.
- Root build: `verify-export: OK`, src unprefixed (dev/tests unaffected, R2.S3/R4).
- `biome check` on changed files: clean (one pre-existing unrelated a11y error at `FactoryComponent.tsx:1139`, present on the base branch).

### Residual (not verified here — requires the live/served site)

- 4.2 / 4.2b browser click-through under the subpath (cold load + hard reload of trailing-slash and slash-less URLs) and the post-merge live-site checks (5.4/5.5) remain open and should be run on the next deploy to confirm the fix end-to-end.
