# lib-utilities Specification

## Requirements

### Requirement: R1 — app/lib/ replaces app/utils.tsx
Pure utility functions SHALL live under `app/lib/` with one module per concern: `format.ts` (number/rate formatting), `rate-status.ts` (rate status + color mapping), and `base-path.ts` (base-path helper). `app/utils.tsx` SHALL be deleted; no import of `@/app/utils` may remain in `app/` or `tests/`.

#### Scenario: R1.S1 — utils.tsx dissolved
- **WHEN** the change is complete
- **THEN** `app/utils.tsx` does not exist and all former importers compile against `app/lib/` modules

### Requirement: R2 — displayNum preserved
`lib/format.ts` SHALL export `displayNum(num)` with behavior identical to today: locale string with 0 minimum and 1 maximum fraction digits, and `"-0"` normalized to `"0"`.

#### Scenario: R2.S1 — Formatting
- **WHEN** `displayNum` receives `1234.56`, `-0.04`, and `7`
- **THEN** it returns the locale rendering of `1234.6`, `"0"`, and `"7"` respectively

### Requirement: R3 — formatRate single home for units
`lib/format.ts` SHALL export two functions replacing all per-site `slug === "power"` unit branches:

- `rateUnit(part): string` — returns `"MW"` for the power slug, `"/min"` otherwise (bare unit, no spacing), for sites that render a standalone unit label.
- `formatRate(part, rate): string` — returns `` `${displayNum(rate)} MW` `` for power (space before MW) and `` `${displayNum(rate)}/min` `` otherwise (no space), matching the strings currently rendered at the value+unit call sites.

#### Scenario: R3.S1 — Unit selection
- **WHEN** `formatRate` formats 63 for the power part vs. a solid/fluid part
- **THEN** it returns `63 MW` vs. `63/min`, and `rateUnit` returns `MW` vs. `/min`

#### Scenario: R3.S2 — No stray unit branches
- **WHEN** `app/components/` is searched for `"MW" : "/min"`-style ternaries after migration
- **THEN** none remain outside `app/lib/`

### Requirement: R4 — Rate status colors with intention-revealing API
`lib/rate-status.ts` SHALL replace `getColorClassForProductionRate1/2` with a named API distinguishing the two existing semantics, with outputs locked to current behavior (input rounded via `parseFloat(rate.toFixed(1))` before comparison):

- Variant 1 (surplus-is-attention): `> 0` → `text-amber-500`, `< 0` → `text-red-500`, else `text-green-500`.
- Variant 2 (surplus-is-good): `> 0` → `text-green-500`, `< 0` → `text-red-500`, else `""`.

The old function names SHALL NOT survive the change.

#### Scenario: R4.S1 — Locked outputs
- **WHEN** each variant receives `0.04`, `0.06`, `-0.06`, and `0`
- **THEN** variant 1 returns `text-green-500`, `text-amber-500`, `text-red-500`, `text-green-500` and variant 2 returns `""`, `text-green-500`, `text-red-500`, `""` (0.04 rounds to 0.0 at one decimal)

#### Scenario: R4.S2 — Non-finite inputs follow the same comparisons
- **WHEN** a variant receives `NaN`, `Infinity`, or `-Infinity`
- **THEN** the result follows the same comparison rules as today's implementation: `NaN` falls to the else branch (variant 1 `text-green-500`, variant 2 `""`); `Infinity` takes the `> 0` branch; `-Infinity` takes the `< 0` branch

### Requirement: R5 — Base-path helper relocated
The `withBasePath` helper SHALL move to `app/lib/` unchanged in behavior: it prefixes a root-relative path with `NEXT_PUBLIC_BASE_PATH` (empty when unset), read at call time so tests can stub both modes.

#### Scenario: R5.S1 — Both modes
- **WHEN** `withBasePath("/images/x.png")` is called with the env set to `/the-factory-planner` and with it unset
- **THEN** it returns `/the-factory-planner/images/x.png` and `/images/x.png` respectively

### Requirement: R6 — downloadJson relocated to lib
`app/lib/download.ts` SHALL export `downloadJson(data: unknown, filename: string): void` with behavior identical to today: serialize via `JSON.stringify(data, null, 2)`, wrap in an `application/json` Blob, trigger a browser download under `filename` via a temporary anchor element, and revoke the object URL. `app/models/storage-service.ts` SHALL NOT export `downloadJson` or reference any DOM API.

#### Scenario: R6.S1 — Single home
- **WHEN** the change is complete
- **THEN** `downloadJson` is importable only from `app/lib/download`, and its two importers (`FactoryLibraryDrawer.tsx`, `FactoryComponent.tsx`) compile against that path

#### Scenario: R6.S2 — Storage layer DOM-free
- **WHEN** `app/models/storage-service.ts` is searched for the API usages `document.`, `new Blob`, or `URL.createObjectURL`
- **THEN** none appear

### Requirement: R7 — sanitizeFilename single home
`app/lib/filenames.ts` SHALL export `sanitizeFilename(name)` implementing the existing `name.replace(/[^a-z0-9]/gi, "_")` logic. The export-current-factory path (formerly in FactoryComponent) SHALL use it. (FactoryLibraryDrawer's duplicate copy migrates in Phase 4a, not this change.)

#### Scenario: R7.S1 — sanitization
- **WHEN** `sanitizeFilename("Iron Plant #2!")` is called
- **THEN** it returns `"Iron_Plant__2_"` (every non-alphanumeric character becomes `_`)

#### Scenario: R7.S2 — export uses it
- **WHEN** the current factory is exported
- **THEN** the download filename is `sanitizeFilename(factoryName) + ".json"` with no inline regex at the call site
