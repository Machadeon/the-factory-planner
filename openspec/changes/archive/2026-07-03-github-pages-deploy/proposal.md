## Why

The app currently requires a Node server (`next start`) to run, so there is no public, zero-cost way to use it. GitHub Pages can serve it for free, but only as static files under the subpath `https://machadeon.github.io/the-factory-planner/`. The app is a pure client-side tool (localStorage only, no API routes, single page), so static export is viable — it just isn't configured for it, and asset paths assume the site root.

## What Changes

- Configure Next.js for static export (`output: "export"`) producing a fully self-contained `out/` directory.
- Serve correctly under the `/the-factory-planner` subpath: `basePath`/`assetPrefix` driven by an environment variable so local dev, unit/integration tests, and Playwright E2E continue to run at `/` unchanged.
- Disable Next image optimization (`images.unoptimized`) — required for static export; `next/image` call sites keep working.
- Fix all asset references that break under a subpath: plain `<img>` elements (e.g. `Icon.tsx`, `FactoryLibraryDrawer.tsx`) do not get `basePath` applied automatically, unlike `next/image`. Introduce one helper that applies the base path exactly once, avoiding double-prefixing for `next/image` consumers.
- Add a GitHub Actions workflow that builds and deploys to GitHub Pages on every push to `main` (official `actions/configure-pages` → build → `actions/upload-pages-artifact` → `actions/deploy-pages` flow), including `.nojekyll` handling so `_next/` assets are served.
- No changes to domain models, storage, solver, or UI behavior.

## Capabilities

### New Capabilities

- `static-export`: The app builds as a static site that functions 100% when served from an arbitrary subpath with no server — all pages, images, fonts, and client-side features (localStorage persistence, LP solver, dialogs) work.
- `pages-deployment`: Merges to `main` automatically build and publish the current app to GitHub Pages; failed builds do not deploy.

### Modified Capabilities

_None — `library-button-visibility` and `ui-prefs` requirements are unaffected._

## Impact

- `next.config.ts`: export mode, basePath/assetPrefix, unoptimized images.
- New util for base-path-aware asset URLs; call-site updates in components using plain `<img>` (paths originate in `app/models/library.tsx`).
- New `.github/workflows/deploy.yml`.
- `public/`: `.nojekyll`.
- Dev workflow (`npm run dev`), unit/integration tests, and Playwright config remain unchanged (base path only applied in the Pages build).
- Exit criteria: merge to `main` → app auto-deploys and is fully functional from GitHub Pages.
