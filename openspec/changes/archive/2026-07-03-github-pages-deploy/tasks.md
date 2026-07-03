## 1. Test Stubs

- [x] 1.1 Write unit test stub `tests/unit/base-path.test.ts`: `withBasePath` prefixes root-relative paths when `NEXT_PUBLIC_BASE_PATH=/the-factory-planner` is stubbed (`vi.stubEnv`) — static-export R2, R2.S1
- [x] 1.2 Write unit test stub `tests/unit/base-path.test.ts`: `withBasePath` returns input unchanged when `NEXT_PUBLIC_BASE_PATH` is unset — static-export R2.S3
- [x] 1.3 Write integration test stub `tests/integration/icon-base-path.test.tsx`: `Icon` renders `img` whose `src` contains the base path exactly once when env stubbed — static-export R2.S1
- [x] 1.4 Write integration test stub `tests/integration/icon-base-path.test.tsx`: `Icon` renders unprefixed root-relative `src` when env unset — static-export R2.S3
- [x] 1.5 Write build verification script stub `scripts/verify-export.sh` (invoked manually and by CI): fails unless `out/index.html`, `out/.nojekyll`, `out/images/` exist and `out/index.html` references `<base-path>/_next/` — static-export R1.S1, pages-deployment R3.S2

## 2. Static Export Configuration

- [x] 2.1 `next.config.ts`: set `output: "export"`, `basePath` from `NEXT_PUBLIC_BASE_PATH ?? ""` (do not set `assetPrefix`), custom image loader — design D1–D3 (**corrected post-deploy**: was `images.unoptimized: true`, which broke `next/image` sources under the subpath; now `images.loader: "custom"` + `loaderFile: "./image-loader.ts"` per revised D3)
- [x] 2.2 `app/utils.tsx`: add `withBasePath` helper with inline env read — design D4
- [x] 2.3 `app/components/Icon.tsx`: apply `withBasePath` to `src` in both render branches
- [x] 2.4 `app/components/FactoryLibraryDrawer.tsx`: apply `withBasePath` to the plain `<img src={factory.icon}>`
- [x] 2.5 Add `public/.nojekyll` — design D6
- [x] 2.6 `package.json`: repurpose `start` script to `npx serve@latest out` (root builds only) — design D2

## 3. Deployment Workflow

- [x] 3.1 Create `.github/workflows/deploy.yml`: `push` to `main` + `workflow_dispatch` triggers; permissions `contents: read`, `pages: write`, `id-token: write`; concurrency group `pages`, `cancel-in-progress: false` — pages-deployment R1, R3
- [x] 3.2 Build job: checkout → setup-node (Node 22, npm cache) → `npm ci` → `actions/configure-pages` with `enablement: true` → `NEXT_PUBLIC_BASE_PATH=${{ steps.pages.outputs.base_path }} npm run build` → run `scripts/verify-export.sh` → `actions/upload-pages-artifact` with `path: out` — design D5
- [x] 3.3 Deploy job: `needs: build`, `if: github.ref == 'refs/heads/main'`, environment `github-pages`, `actions/deploy-pages` — pages-deployment R1.S3, R2

## 4. Local Verification of Base-Path Build

- [x] 4.1 Run `NEXT_PUBLIC_BASE_PATH=/the-factory-planner npm run build`; confirm success and run `scripts/verify-export.sh` — static-export R1.S1 (verified: build OK, `verify-export: OK`)
- [ ] 4.2 Serve `out/` under the subpath locally (static server, no rewrites); verify: page renders, no 404s in network log, icons render, create factory + production line → rates calculate, reload → factory persists (localStorage), library drawer + recipe dialog open clean — static-export R1.S2, R3.S1–S2
- [x] 4.2a Verified on exported HTML: `grep -c "the-factory-planner/the-factory-planner" out/index.html` → 0, and `next/image` logo src is `/the-factory-planner/satisfactory_logo_full_color_small.png` (base path exactly once) — static-export R2.S2
- [ ] 4.2b Same served site: enter via slash-less `http://localhost:<port>/the-factory-planner` (expect redirect or render), then hard-reload the trailing-slash URL; page renders both times — static-export R3.S3
- [x] 4.3 Run root build (`npm run build` without env) and confirm `out/index.html` references `/_next/` with no base path — static-export R2.S3, R4 (verified: `verify-export: OK`, logo src `/satisfactory_logo…` unprefixed)

## 5. Verification

- [ ] 5.1 All unit/integration tests pass (`npm run test:run`)
- [ ] 5.2 All E2E tests pass (`npm run test:e2e`) — unchanged config, run against dev server without env var — static-export R4.S2
- [ ] 5.3 `npm run lint-fix` clean
- [ ] 5.4 Post-merge (deferred until merged to main): confirm workflow runs, deploy succeeds, live site at `https://machadeon.github.io/the-factory-planner/` passes the R3 click-through — pages-deployment R1.S1
- [ ] 5.5 Post-merge one-time: dispatch workflow manually on `main` → deploy runs; dispatch on a non-main branch (push workflow file to a branch first) → deploy job skipped, live site unchanged — pages-deployment R1.S2, R1.S3

## 6. Post-deploy bug fixes

Two defects shipped to the live site (Sections 4.2/4.2b manual checks had been skipped). Both are "app-generated URL not base-path-aware" (spec R2).

- [x] 6.1 Regression test (unit) `tests/unit/image-loader.test.ts`: `imageLoader` prefixes root-relative src with base path exactly once when set, unchanged when unset, leaves absolute URLs alone — static-export R2.S5
- [x] 6.2 Regression test (integration) `tests/integration/history-base-path.test.tsx`: `FactoryComponent` mount keeps URL under `/the-factory-planner/` when env set, pushes `/` when unset — static-export R2.S4
- [x] 6.3 Confirm both regression tests FAIL against the shipped code (redirect test received `/`; loader import missing), then fix
- [x] 6.4 `image-loader.ts` (repo root): custom `next/image` loader prepending `NEXT_PUBLIC_BASE_PATH` to root-relative src — design D3 (revised)
- [x] 6.5 `next.config.ts`: replace `images.unoptimized: true` with `images.loader: "custom"` + `loaderFile: "./image-loader.ts"` — design D3 (revised)
- [x] 6.6 `app/components/FactoryComponent.tsx`: wrap both `history.pushState` URLs with `withBasePath(...)` — design D4 (revised)
- [x] 6.7 Re-verify: full `npm run test:run` green (216 passed); base-path + root builds pass `verify-export.sh`; base-path build shows next/image src prefixed once and no doubled base path
