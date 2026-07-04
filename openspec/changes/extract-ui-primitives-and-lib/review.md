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
