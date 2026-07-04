# static-export Delta Spec

## MODIFIED Requirements

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

**Reason for modification**: this change removes all `next/image` usage (icon standardization through `ui/Icon` plus the `page.tsx` logo), so the custom-image-loader mandate (former R2.S2/R2.S5 and the loader paragraph) protects a mechanism that no longer exists. The single-helper rule now covers every image source.

**Migration**: `image-loader.ts`, its unit test, and the `next.config.ts` `images` block are deleted; base-path coverage for images lives in the helper's tests and `icon-rendering` R2.S2/R3.S2.
