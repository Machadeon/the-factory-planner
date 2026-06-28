# ThemeProvider does not apply a theme; app follows OS color scheme

`app/theme-provider.tsx` only puts the string `"dark"` into a React context
(`ThemeContext`). Nothing consumes that context to actually set the theme — no MUI
theme, no `class="dark"`, no `color-scheme`. The visible theme is driven entirely by
`app/globals.css`, which keys off `@media (prefers-color-scheme: dark)`. So the page
renders dark or light to match the **OS/browser** setting, and the app has no real
theme control of its own.

This surfaced while addressing the logistics graph review: several controls "do not
respect the current light/dark theme (always light)". They are not actually ignoring a
theme — there is no enforced app theme for them to follow, and these third-party / native
controls default to light unless `color-scheme` (or React Flow's `colorMode`) is set.

## Steps to Reproduce

1. Set the OS/browser to **light** color scheme.
2. Open the app and add a product, then open the **Logistics** tab.
3. Inspect the React Flow zoom controls (bottom-left).
4. Inspect the minimap (bottom-right).
5. Inspect an assembly-line node's "Machine rows" number input up/down spinner.
6. Switch the OS to **dark** and reload.

## Expected Results

On step 3, zoom controls match the app theme.

On step 4, the minimap matches the app theme.

On step 5, the number-input spinner matches the app theme.

On step 6, the page theme is controlled by the app (and ideally a user toggle), not
purely by the OS.

## Actual Results

On step 3, the zoom control buttons are always light.

On step 4, the minimap is always light.

On step 5, the number-input up/down spinner is always light.

On step 6, the whole page flips with the OS because `globals.css`
`@media (prefers-color-scheme: dark)` is the only thing setting colors; `ThemeProvider`
has no effect.

## Evidence (theme-related findings from the logistics graph review)

From `plans/logistics-graph-view/review-user.md` (critical findings):

- "The zoom control buttons do not respect the current light/dark theme (always light)"
- "The minimap should match the current light/dark theme (always light)"
- "Machine row inputs have up/down controls that do not match the current light/dark
  theme (always light)"

Root cause for all three is the same: no enforced app theme + no `color-scheme` /
React Flow `colorMode`, so native + library controls fall back to light.

## Full Error Message

(none — visual/theming defect)

## Likely Fix

Make `ThemeProvider` actually drive the theme: set `color-scheme` on `:root`/`<html>`
(and/or a `dark` class + MUI theme) from a real theme value, and have `globals.css` key
off that instead of only `prefers-color-scheme`. Once an app theme exists, pass it to
React Flow via `colorMode` and to native controls via `color-scheme` so the logistics
controls follow it.
