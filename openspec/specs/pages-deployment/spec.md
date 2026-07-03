# pages-deployment Specification

## Purpose

Automatically build and publish the static export to GitHub Pages on merge to `main`, using the official Pages actions, so the live site at `https://machadeon.github.io/the-factory-planner/` always reflects the latest `main` commit without manual steps.

## Requirements
### Requirement: R1 — Automatic deploy on merge to main
A GitHub Actions workflow SHALL build the static export and publish it to GitHub Pages on every push to `main`, using the official Pages actions (`actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`) with the minimum required permissions (`pages: write`, `id-token: write`, `contents: read`). The deploy job MUST only ever publish the `main` ref: the workflow triggers are `push` to `main` and `workflow_dispatch`, and manual dispatches build whatever ref was selected but GitHub restricts `workflow_dispatch` to refs where the workflow file exists — the workflow SHALL additionally guard the deploy job with a condition that the ref is `main`.

#### Scenario: R1.S1 — Merge triggers deploy
- **WHEN** a commit is pushed to `main` (including PR merges)
- **THEN** the workflow builds the app with `NEXT_PUBLIC_BASE_PATH=/the-factory-planner` and the published site at `https://machadeon.github.io/the-factory-planner/` reflects that commit

#### Scenario: R1.S2 — Manual trigger available
- **WHEN** a maintainer dispatches the workflow manually on the `main` ref
- **THEN** the same build-and-deploy runs

#### Scenario: R1.S3 — Non-main dispatch does not publish
- **WHEN** the workflow is dispatched on a ref other than `main`
- **THEN** the deploy job is skipped and the live site is unchanged

### Requirement: R2 — Failed runs do not change the live site
The workflow SHALL run the build in a job that precedes artifact upload; any build error fails the run before upload. If the build succeeds but the deploy step fails, the previously deployed site MUST remain live (GitHub Pages deployments are atomic — a failed deployment is not partially applied).

#### Scenario: R2.S1 — Build failure blocks publish
- **WHEN** the build step exits non-zero on a push to `main`
- **THEN** the deploy job does not run and the live site remains at the prior version

#### Scenario: R2.S2 — Deploy failure leaves prior version live
- **WHEN** the build succeeds but `actions/deploy-pages` fails
- **THEN** the run is marked failed and the live site continues serving the previous successful deployment

### Requirement: R3 — Assets served intact
The published output SHALL include a `.nojekyll` file so GitHub Pages serves Next.js `_next/` directories and all other underscore-prefixed paths without Jekyll interference. Deploys SHALL use a shared concurrency group with `cancel-in-progress: false`: an in-flight deploy completes, queued runs are superseded so the newest commit's deploy runs last.

#### Scenario: R3.S1 — Underscore paths reachable
- **WHEN** the deployed site is loaded in a browser
- **THEN** requests to `/the-factory-planner/_next/...` return 200 and the page renders with styles and scripts applied

#### Scenario: R3.S2 — .nojekyll present in output
- **WHEN** the static export build completes
- **THEN** the uploaded artifact root contains a `.nojekyll` file

#### Scenario: R3.S3 — Concurrent pushes
- **WHEN** two pushes to `main` occur in quick succession
- **THEN** the first deploy is not cancelled mid-flight, and the final live site reflects the newest commit

