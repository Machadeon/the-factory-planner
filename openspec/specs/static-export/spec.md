# static-export Specification

## Purpose

Serve the app as a fully static Next.js export from a GitHub Pages subpath (`/the-factory-planner`) with every app-generated URL base-path-correct, while leaving dev and test workflows (which run at root) unchanged.

## Requirements
### Requirement: R1 — Static export build
The build SHALL produce a fully static site (Next.js `output: "export"`) in `out/` that contains every file needed to serve the app — HTML, JS, CSS, fonts, and all `public/` assets — with no Node server, API route, or runtime image optimization required. The base path SHALL be controlled by the `NEXT_PUBLIC_BASE_PATH` environment variable at build time: unset/empty means root serving; the Pages build sets it to `/the-factory-planner`.

#### Scenario: R1.S1 — Build produces static output
- **WHEN** `next build` runs with `NEXT_PUBLIC_BASE_PATH=/the-factory-planner`
- **THEN** it completes without errors and emits `out/index.html` plus `out/_next/` assets and all `public/images/` game icons

#### Scenario: R1.S2 — No server-only features
- **WHEN** the exported `out/` directory is served by a plain static file server with no rewrite rules (e.g. `npx serve out` or `python3 -m http.server`)
- **THEN** the app loads and runs with no requests to Next.js server endpoints (no `/_next/image` optimizer URLs, no API routes)

### Requirement: R2 — Subpath correctness
All app-generated URLs (page assets, plain `<img>` sources, font files, and client-side history/`pushState` URLs) SHALL resolve correctly when the site is served from the configured base path. The base path MUST appear exactly once in any given URL.

A single helper function SHALL be the only mechanism for applying the base path to `<img>` sources and to client-side history/`pushState` URLs. Its contract: input is a root-relative path beginning with `/` that does not already contain the base path (e.g. `/images/items/foo_64.png`); output is the input prefixed with the build-time base path (or the input unchanged when no base path is configured).

The app MUST NOT use `next/image`; all images are plain `<img>` elements whose sources go through the helper. Accordingly, no custom image loader (`images.loader` / `loaderFile`) is configured.

#### Scenario: R2.S1 — Plain img elements respect base path
- **WHEN** the app is built with `NEXT_PUBLIC_BASE_PATH=/the-factory-planner` and a component renders a plain `<img>` (e.g. `Icon`) for a game icon
- **THEN** the rendered `src` is `/the-factory-planner/images/...` with no duplicate base path segment

#### Scenario: R2.S2 — No image loader configured
- **WHEN** the Next.js config is evaluated
- **THEN** it contains no `images.loader`/`loaderFile` settings and no `image-loader.ts` exists (the `next/image` import ban itself is owned by `icon-rendering` R3.S1)

#### Scenario: R2.S3 — Root serving unaffected
- **WHEN** the app is built or run in dev with `NEXT_PUBLIC_BASE_PATH` unset
- **THEN** the helper returns its input unchanged and all asset URLs resolve from `/` exactly as they do today

#### Scenario: R2.S4 — Client history URLs respect base path
- **WHEN** the app is served under `/the-factory-planner` and it writes the browser URL via `history.pushState`/`replaceState` (e.g. on mount with no factory, or when the active factory changes)
- **THEN** the resulting URL stays under `/the-factory-planner/` (it is not rewritten to root `/`), so a subsequent reload of that URL still resolves to the app

### Requirement: R3 — Full client functionality from static hosting
When served statically under the base path, the exported app SHALL support the core user-facing behaviors: creating factories and production lines with rate auto-calculation (LP solver), rendering part/recipe icons, opening the factory library drawer and recipe dialogs, and persisting state to localStorage across reloads.

#### Scenario: R3.S1 — Core flow works from static export
- **WHEN** the exported site is served from a static server under `/the-factory-planner` and a user creates a factory and adds a production line
- **THEN** rates calculate, part icons render (no 404s for `/the-factory-planner/images/...`), and the factory reappears after a page reload (localStorage persistence)

#### Scenario: R3.S2 — Dialogs and drawers work from static export
- **WHEN** the user opens the factory library drawer and a recipe selection dialog on the statically served site
- **THEN** both open and render their icon lists without console errors or failed asset requests

#### Scenario: R3.S3 — Cold load and hard reload at base path
- **WHEN** a browser navigates directly to `https://<host>/the-factory-planner/` (cold load) and then hard-reloads
- **THEN** the page renders both times; trailing-slash and non-trailing-slash entry URLs both reach the app without relying on SPA fallback rewrites

### Requirement: R4 — Dev and test workflows unchanged
When `NEXT_PUBLIC_BASE_PATH` is unset, the Next.js config SHALL apply no `basePath` and no `assetPrefix`, so local development (`npm run dev`), unit/integration tests, and Playwright E2E tests operate at the root path with no changes to test configuration or invocation.

#### Scenario: R4.S1 — Dev server unaffected
- **WHEN** a developer runs `npm run dev` without `NEXT_PUBLIC_BASE_PATH`
- **THEN** the app serves at `http://localhost:3000/` with all assets resolving, identical to current behavior

#### Scenario: R4.S2 — No base path applied by default
- **WHEN** the Next.js config is evaluated with `NEXT_PUBLIC_BASE_PATH` unset
- **THEN** `basePath` and `assetPrefix` are absent/empty, and `playwright.config.ts` and `vitest.config.ts` require no base-path-related edits

