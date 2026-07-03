## Context

The app is a pure client-side Next.js 16 (App Router) single-page tool: one route (`app/page.tsx`), no API routes, no server actions, state in localStorage. Deployment target is GitHub Pages for the repo `Machadeon/the-factory-planner`, which serves at `https://machadeon.github.io/the-factory-planner/` — a subpath, static files only.

Current obstacles:

- No `output: "export"`; build assumes a Node server.
- `next/image` is used in ~15 components; the default loader requires the `/_next/image` server endpoint.
- Game icon paths are built root-relative in `app/models/library.tsx` (`/images/items/...`) and consumed by both `next/image` (which auto-prefixes `basePath`) and plain `<img>` (`Icon.tsx`, `FactoryLibraryDrawer.tsx` — which do not).
- `factory.icon` values are serialized into localStorage, so whatever path shape is stored must remain valid regardless of where the app is hosted.

## Goals / Non-Goals

**Goals:**

- Static export that is 100% functional served from `/the-factory-planner` (specs: `static-export` R1–R3).
- Zero impact on dev server, vitest, and Playwright workflows (R4).
- Push to `main` → automatic build + deploy via GitHub Actions (`pages-deployment` R1–R3).

**Non-Goals:**

- Custom domain, CDN, or non-GitHub hosting.
- Multi-page routing, SPA fallback (404.html rewrite tricks) — single route today.
- Changing the Icon/`next/image` split or image optimization strategy.
- PR preview deployments.

## Decisions

### D1 — Env-var-driven base path: `NEXT_PUBLIC_BASE_PATH`

`next.config.ts` reads `NEXT_PUBLIC_BASE_PATH` (default `""`) and sets `basePath` from it. `assetPrefix` is deliberately not set — Next defaults it to `basePath`, so setting it would be redundant (spec R4.S2's "absent/empty" holds: we never define it). CI sets the variable to `/the-factory-planner`; dev and tests never set it, so config is a no-op locally (spec R4).

- *Why `NEXT_PUBLIC_`*: the same value must be readable in client code for the plain-`<img>` helper; Next inlines `NEXT_PUBLIC_*` at build time, so one variable serves both config and runtime with no drift.
- *Alternative — hardcode basePath in config*: breaks dev server and every Playwright test (all URLs shift to the subpath), violating R4. Rejected.
- *Alternative — two configs / config branching on NODE_ENV*: `NODE_ENV=production` is also used for local prod builds and E2E against `next start`; env var is explicit and orthogonal. Rejected.

### D2 — `output: "export"` set unconditionally

Static export mode is always on. `next dev` behavior is unchanged by `output: "export"`, and the app uses no feature that export forbids (no API routes, no server actions, no dynamic routes). Keeping it unconditional means local `next build` produces the same artifact shape CI produces — no config drift between what's tested and what ships.

One existing script is affected: `npm start` (`next start`) errors under export mode. It is repurposed to serve the exported site (`npx serve@latest out`) — for a root build (no `NEXT_PUBLIC_BASE_PATH`). Base-path builds must instead be served under the subpath as described in D7; serving a base-path build at the server root would 404 on `/the-factory-planner/_next/...` assets. Nothing in the repo (Playwright config, Makefile, CI) invokes `next start` today, so nothing else changes.

**Trailing slash / entry URLs (spec R3.S3):** `trailingSlash` stays at its default. The exported single route is `out/index.html`; GitHub Pages serves it at `/the-factory-planner/` and issues its standard directory redirect for the slash-less `/the-factory-planner` entry URL. No SPA fallback or `404.html` rewrite is needed because the app has exactly one route.

### D3 — `images.unoptimized: true`

Required for static export; the default loader needs a server. Icons are small pre-sized PNGs shipped in `public/`, so optimization adds nothing here. All existing `next/image` call sites keep working unmodified (they render plain `src` URLs with `basePath` applied).

### D4 — One helper, applied at render time, inside the plain-`<img>` components

New helper (in `app/utils.tsx`, alongside existing utils):

```ts
export function withBasePath(path: string): string {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;
}
```

The env read is inline (not hoisted to a module-level const) so vitest can exercise both modes with `vi.stubEnv` without module-cache gymnastics; Next's build-time inlining of `NEXT_PUBLIC_*` works identically either way.

Applied in exactly two places: `Icon.tsx` (choke point for nearly all plain `<img>` icons) and the plain `<img>` in `FactoryLibraryDrawer.tsx`. Everything else — `library.tsx` path construction, localStorage serialization, `next/image` call sites — is untouched.

- *Why render-time, not in `library.tsx`*: (1) `next/image` consumers of the same library paths would get the base path applied twice (spec R2 forbids double-prefixing); (2) `factory.icon` is persisted to localStorage — prefixed stored paths would go stale if the base path ever changes and would differ between dev-saved and prod-saved data. Root-relative paths stay the canonical stored/in-memory form; the base path is a presentation concern.
- *Alternative — replace plain `<img>` with `next/image` everywhere*: rejected; `Icon.tsx` documents the deliberate perf choice (hundreds of tiny icons per dialog).

### D5 — Official Pages Actions workflow, single build job + deploy job

`.github/workflows/deploy.yml`: triggers `push: branches [main]` + `workflow_dispatch`. Build job: checkout → `actions/setup-node` (Node 22, npm cache) → `npm ci` → `actions/configure-pages` with `enablement: true` (auto-enables Pages with the Actions source on first run) → `next build` with `NEXT_PUBLIC_BASE_PATH` taken from `steps.<configure-pages>.outputs.base_path` → `actions/upload-pages-artifact` with `path: out`. Deploy job: `needs: build`, `if: github.ref == 'refs/heads/main'` (spec `pages-deployment` R1.S3), environment `github-pages`, `actions/deploy-pages`. Permissions `contents: read`, `pages: write`, `id-token: write`; concurrency group `pages` with `cancel-in-progress: false` (R3).

- *Why `configure-pages` output for the base path*: it derives `/the-factory-planner` from the actual repo name — survives a repo rename with zero edits, and removes the hardcoded string from the workflow.
- *Why not `gh-pages` branch + peaceiris/actions-gh-pages*: the official artifact flow needs no deploy branch, no PAT, gives atomic deployments (R2.S2), and is GitHub's current recommended path. Rejected alternative.
- *Build ≠ deploy jobs*: build failure fails the run before any artifact upload (R2.S1); deploy is the only job with Pages permissions.

### D6 — `.nojekyll` committed in `public/`

Static export copies `public/` into `out/`, so a committed `public/.nojekyll` lands in the artifact root (R3.S2) with no workflow step. More visible and testable than a `touch` in CI.

### D7 — Testing strategy per spec scenario

- **Unit (vitest)**: `withBasePath` contract — prefixing when `NEXT_PUBLIC_BASE_PATH` is set, identity when unset (R2), via `vi.stubEnv` (works because the helper reads the env var inline per D4).
- **Integration (RTL)**: `Icon` renders `src` with base path exactly once.
- **Build verification (CI + local script)**: after `NEXT_PUBLIC_BASE_PATH=/the-factory-planner next build`, assert `out/index.html`, `out/.nojekyll`, `out/images/` exist and `out/index.html` references `/the-factory-planner/_next/` (R1.S1, R3.S2).
- **Manual/one-time (documented in tasks)**: serve `out/` under a subpath locally (`npx serve`) and click through the core flow (R3.S1–S3); post-merge, verify the live Pages URL. These are inherently environment-level checks; automating them in Playwright would require a parallel base-path test config, violating R4's "test config unchanged".

## Risks / Trade-offs

- [Pages not enabled / wrong source on repo settings] → `actions/configure-pages` with `enablement: true` auto-enables Pages with the Actions source on first run; migration plan includes verifying repo settings once.
- [`next/font/google` needs network at CI build time] → GitHub-hosted runners have egress; Next caches fonts in `.next/cache`. If Google Fonts flakes, the build fails visibly (R2.S1 protects the live site). Accepted.
- [Hardcoded `/images/...` strings added later bypass the helper] → helper is the documented pattern in `Icon.tsx`; base-path builds surface misses immediately as 404s on the deployed site. Residual risk accepted — dev-mode behavior is unchanged and correct either way.
- [localStorage saved under `machadeon.github.io` is shared across any other Pages sites on the same origin? ] → GitHub Pages project sites share the `machadeon.github.io` origin; keys are namespaced `sfp:` already, collision risk negligible. Accepted.
- [`workflow_dispatch` from a non-main ref builds but must not deploy] → deploy job `if: github.ref == 'refs/heads/main'` guard (R1.S3).

## Migration Plan

1. Land config + helper + workflow on a feature branch; PR to `main`.
2. On merge, the workflow runs; `configure-pages` (`enablement: true`) turns Pages on with the Actions source if not already set.
3. Verify `https://machadeon.github.io/the-factory-planner/` — core flow, icons, reload persistence (spec R3 scenarios).
4. Rollback: revert the merge commit; the next `main` push redeploys the prior state. The dev workflow never depended on any of this, so local work is unaffected throughout.

## Open Questions

- None blocking. (If a custom domain is ever added, `NEXT_PUBLIC_BASE_PATH` simply becomes empty in CI — the design already supports it.)
