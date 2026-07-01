## Why

The factory browser drawer's pinned/unpinned state and sidebar width are held only in React state, so every page reload resets them to defaults. Users who prefer the sidebar pinned or at a custom width must reconfigure it on each session.

## What Changes

- Add `sfp:library-pinned` localStorage key; persist drawer pin state across reloads
- Add `sfp:sidebar-width` localStorage key; persist sidebar drag width across reloads
- Add read/write helpers for both keys in `storage-service.ts`
- Initialize both state values from localStorage on mount (lazy initializer)
- Wrap pin toggle in a `useCallback` that updates both React state and localStorage
- Persist sidebar width on drag-end (`mouseup`), not on every `mousemove`

## Capabilities

### New Capabilities

- `drawer-ui-prefs`: Persistent UI preferences for the factory browser drawer — pin state and sidebar width — stored in localStorage and restored on page load.

### Modified Capabilities

*(none — no existing spec-level requirements change)*

## Impact

- `app/models/storage-service.ts`: two new keys, two new get/set function pairs
- `app/components/FactoryComponent.tsx`: lazy state initializers, `handlePinChange` useCallback, `sidebarWidthRef` for write-on-mouseup
- No schema migration needed (UI prefs are not part of the factory data model)
- No consent gate required (these are UI behavior prefs, not user data — consistent with `sfp:autosave-pref`)
