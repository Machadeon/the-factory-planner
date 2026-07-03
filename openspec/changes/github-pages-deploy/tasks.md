## 1. Test Stubs

- [x] 1.1 Write unit test stub `tests/unit/base-path.test.ts`: `withBasePath` prefixes root-relative paths when `NEXT_PUBLIC_BASE_PATH=/the-factory-planner` is stubbed (`vi.stubEnv`) — static-export R2, R2.S1
- [x] 1.2 Write unit test stub `tests/unit/base-path.test.ts`: `withBasePath` returns input unchanged when `NEXT_PUBLIC_BASE_PATH` is unset — static-export R2.S3
- [x] 1.3 Write integration test stub `tests/integration/icon-base-path.test.tsx`: `Icon` renders `img` whose `src` contains the base path exactly once when env stubbed — static-export R2.S1
- [x] 1.4 Write integration test stub `tests/integration/icon-base-path.test.tsx`: `Icon` renders unprefixed root-relative `src` when env unset — static-export R2.S3
- [x] 1.5 Write build verification script stub `scripts/verify-export.sh` (invoked manually and by CI): fails unless `out/index.html`, `out/.nojekyll`, `out/images/` exist and `out/index.html` references `<base-path>/_next/` — static-export R1.S1, pages-deployment R3.S2

## 2. Static Export Configuration

- [x] 2.1 `next.config.ts`: set `output: "export"`, `basePath` from `NEXT_PUBLIC_BASE_PATH ?? ""` (do not set `assetPrefix`), `images.unoptimized: true` — design D1–D3
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

- [ ] 4.1 Run `NEXT_PUBLIC_BASE_PATH=/the-factory-planner npm run build`; confirm success and run `scripts/verify-export.sh` — static-export R1.S1
- [ ] 4.2 Serve `out/` under the subpath locally (static server, no rewrites); verify: page renders, no 404s in network log, icons render, create factory + production line → rates calculate, reload → factory persists (localStorage), library drawer + recipe dialog open clean — static-export R1.S2, R3.S1–S2
- [ ] 4.2a Same served site: verify no double base path — grep served HTML/DOM for `/the-factory-planner/the-factory-planner` (must be absent) and inspect one `next/image` src (base path exactly once) — static-export R2.S2
- [ ] 4.2b Same served site: enter via slash-less `http://localhost:<port>/the-factory-planner` (expect redirect or render), then hard-reload the trailing-slash URL; page renders both times — static-export R3.S3
- [ ] 4.3 Run root build (`npm run build` without env) and confirm `out/index.html` references `/_next/` with no base path — static-export R2.S3, R4

## 5. Verification

- [ ] 5.1 All unit/integration tests pass (`npm run test:run`)
- [ ] 5.2 All E2E tests pass (`npm run test:e2e`) — unchanged config, run against dev server without env var — static-export R4.S2
- [ ] 5.3 `npm run lint-fix` clean
- [ ] 5.4 Post-merge (deferred until merged to main): confirm workflow runs, deploy succeeds, live site at `https://machadeon.github.io/the-factory-planner/` passes the R3 click-through — pages-deployment R1.S1
- [ ] 5.5 Post-merge one-time: dispatch workflow manually on `main` → deploy runs; dispatch on a non-main branch (push workflow file to a branch first) → deploy job skipped, live site unchanged — pages-deployment R1.S2, R1.S3
