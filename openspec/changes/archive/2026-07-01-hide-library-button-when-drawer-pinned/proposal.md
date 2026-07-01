## Why

When the library drawer is pinned open as a sidebar, the "Open factory library" button in the header is redundant — the library is already visible. Showing a button to open something that is already open is confusing UX.

## What Changes

- The "Open factory library" button in `FactoryHeader` is removed from the DOM when the library drawer is pinned open.
- When the drawer is unpinned (overlay mode), the button renders as before.

## Capabilities

### New Capabilities

- `library-button-visibility`: The library button in the factory header is only rendered when the drawer is not pinned open.

### Modified Capabilities

_(none — pin state persistence behavior in `ui-prefs` R1 is unchanged)_

## Impact

- `app/components/FactoryHeader.tsx` — add optional prop to suppress library button render
- `app/components/FactoryComponent.tsx` — pass `libraryPinned` signal to `FactoryHeader` so it can conditionally omit the button
