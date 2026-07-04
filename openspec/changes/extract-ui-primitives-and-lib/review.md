## Pass 1 — 2026-07-04

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass

_(first pass — none)_

### Findings

- `app/page.tsx:13`: ⚠ HIGH: logo rendered size changed. Old `next/image` had `style={{width:"auto",height:"auto"}}` which overrides the 300×20 attrs → rendered at intrinsic-driven size (PNG is 1200×236, capped by `max-width:100%`, ≈container width). New plain `<img>` drops that style, so Tailwind v4 preflight (`img { max-width:100%; height:auto }`) renders it 300×≈59 — violates the zero-visual-change contract and icon-rendering R3 "keeping its dimensions". restore `style={{width:"auto",height:"auto"}}` (or `w-auto h-auto` classes) on the new img and re-screenshot vs main.
- `app/components/FactoryLibraryDrawer.tsx:217`: ⚠ MED: rename field `aria-label="Factory name"` duplicates the always-mounted header TextField's accessible name (FactoryHeader.tsx:77); while a drawer rename is active, `getByRole("textbox", { name: "Factory name" })` matches 2 elements — Playwright strict-mode landmine and duplicate-name a11y violation. use "Rename factory" (additive label — old drawer field had none, R10-safe).
- `app/components/ui/FileImportButton.tsx:36`: ⚠ MED: hardcoded `data-testid="file-import-input"` renders twice concurrently (FactoryHeader + FactoryLibraryDrawer both mounted when drawer open) — duplicate testid breaks `getByTestId` uniqueness for any future test. derive the testid from the aria-label or accept it as a prop.
- `app/components/ui/IconButton.tsx:37`: ⚠ LOW: `disabled` prop puts a disabled `<button>` directly inside MUI Tooltip — disabled buttons fire no pointer events, so the tooltip never shows and MUI logs a warning. currently unused at all call sites; remove the prop or span-wrap the button when disabled.
- `app/components/ui/Icon.tsx:48`: ⚠ LOW: `alt={label ?? alt ?? ""}` ignores the `alt` prop when `label=""` (empty string is non-nullish), but the JSDoc says alt is "Ignored when a non-empty label is set". no current call site passes both; align doc and impl (decide whether `label=""` forces decorative over `alt`).
- `app/components/ui/interactive-styles.ts:12`: ⚠ LOW: `m-[-2]` is unitless → invalid CSS, margin silently dropped, so danger/warning `border-2` shifts layout by 2px vs intent. carried verbatim from Clickable (pre-existing, bug-for-bug preserved — correct for this change); log as follow-up to fix as `-m-0.5`/`m-[-2px]`.

## Pass 2 — 2026-07-04

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass

- `app/page.tsx:13` HIGH (logo size) — resolved as NOT A REGRESSION, verified by reviewer's own live measurement, not just the dispute. Ran the branch dev server and measured `img[alt="Satisfactory logo"]` via getBoundingClientRect: **231.156 × 45.453 px**, natural 1200×236, aspect preserved — matching the reported main measurement (231.109 × 45.453) to within subpixel. Pass 1's static model was wrong: the logo's parent is a shrink-to-fit child of a flex column (`items-center`/`sm:items-start` prevents stretch), so `max-width:100%` resolves against that container and produces the same box the old `width/height:auto` next/image produced. Screenshot confirms inline layout beside "Planner" intact. No code change needed; finding withdrawn.
- `app/components/FactoryLibraryDrawer.tsx:217` MED (duplicate accessible name) — resolved in 6e24c6a: rename fields now `aria-label="Rename factory"` (:217) and `"Rename folder"` (:319); both additive (old fields had no label), header "Factory name" unique again.
- `app/components/ui/FileImportButton.tsx:36` MED (duplicate testid) — resolved in 6e24c6a: testid now `` `file-import-input:${ariaLabel}` `` (:37), unique per instance; integration test updated.
- `app/components/ui/IconButton.tsx:37` LOW (disabled-in-Tooltip trap) — resolved in 6e24c6a: `disabled` prop removed entirely.
- `app/components/ui/Icon.tsx:48` LOW (label/alt doc mismatch) — resolved in 6e24c6a: docstring now states the contract (`label=""` → decorative; use `alt` for name-without-tooltip).
- `app/components/ui/interactive-styles.ts:12` LOW (`m-[-2]` unitless) — acknowledged, deliberately left: pre-existing Clickable behavior carried bug-for-bug per the zero-visual-change contract. Follow-up item outside this change.

### Findings

_none open — zero CRITICAL/HIGH. Remaining follow-up (not blocking): fix `m-[-2]` → `m-[-2px]` in a later change; 2 pre-existing out-of-scope Biome a11y findings (FactoryComponent resize divider, LogisticEdge hover path) unchanged from main._
