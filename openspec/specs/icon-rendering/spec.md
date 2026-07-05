# icon-rendering Specification

## Requirements

### Requirement: R1 — Single icon path
All game-asset images in feature components SHALL render through `ui/Icon` (relocated from `app/components/Icon.tsx` to `app/components/ui/Icon.tsx`). Per-file `next/image` and raw `<img>` usage for game assets MUST NOT remain in feature components.

#### Scenario: R1.S1 — No competing paths
- **WHEN** `app/components/` (outside `ui/`) is searched for `next/image` imports and raw `<img>` elements after migration
- **THEN** none render game-asset images; the only `<img>` for game assets lives in `ui/Icon`

### Requirement: R2 — Icon behavior preserved
`ui/Icon` SHALL keep its current contract: plain `<img>` with `withBasePath`-prefixed `src`, fixed square `size`, `loading="lazy"`, `decoding="async"`; a non-empty `label` renders an MUI Tooltip and `alt`; `label=""` renders a decorative image with no tooltip. *(Amended during implementation)*: an additive `alt` prop provides an accessible name **without** a tooltip — required so migrated `next/image` sites keep their former alt texts (the frozen a11y-tree contract; e2e queries by `role: img` + name) without gaining tooltips they never had. Non-empty `label` takes precedence over `alt`.

#### Scenario: R2.S3 — Informative icon without tooltip
- **WHEN** `Icon` renders with `alt="Iron Ore"` and no `label`
- **THEN** the image has accessible name "Iron Ore" and hovering renders no tooltip

#### Scenario: R2.S1 — Labeled vs decorative
- **WHEN** `Icon` renders with `label="Iron Plate"` vs `label=""`
- **THEN** the first has a tooltip and `alt="Iron Plate"`; the second has no tooltip and empty alt

#### Scenario: R2.S2 — Base path applied
- **WHEN** the app is built with `NEXT_PUBLIC_BASE_PATH` set
- **THEN** every `Icon` `src` contains the base path exactly once

### Requirement: R3 — next/image fully removed
No file in `app/` SHALL import `next/image`. The `page.tsx` logo becomes a plain `<img>` using the base-path helper, keeping its `alt`, dimensions, and eager loading (it is above the fold; `loading="lazy"` MUST NOT be applied to it).

#### Scenario: R3.S1 — Zero next/image imports
- **WHEN** `app/` is searched for `next/image` after migration
- **THEN** no imports remain (comments excluded)

#### Scenario: R3.S2 — Logo renders under subpath
- **WHEN** the site is served under the configured base path
- **THEN** the logo loads from `<base-path>/satisfactory_logo_full_color_small.png` with no duplicate segment
