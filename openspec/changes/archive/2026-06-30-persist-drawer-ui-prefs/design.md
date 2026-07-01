## Context

`FactoryComponent` stores `libraryPinned` and `sidebarWidth` in React state with hardcoded defaults (`false`, `380`). Both reset on every page reload. The storage service already has a precedent for UI preference persistence: `sfp:autosave-pref`, stored without a consent gate via `getAutosavePref`/`setAutosavePref` in `storage-service.ts`.

## Goals / Non-Goals

**Goals:**
- Persist drawer pin state across reloads (R1)
- Persist factory overview sidebar width across reloads (R2)
- Zero console errors or layout flash on first render

**Non-Goals:**
- Persisting drawer open/closed state when unpinned (transient UI, not worth preserving)
- Syncing prefs across tabs
- Consent-gating these prefs (they contain no user data)

## Decisions

### D1: Follow the `autosave-pref` pattern for storage
Add two new key constants and get/set function pairs in `storage-service.ts`:
- `sfp:library-pinned` → `getLibraryPinned(): boolean` / `setLibraryPinned(v: boolean): void`
- `sfp:sidebar-width` → `getSidebarWidth(): number` / `setSidebarWidth(v: number): void`

**Why over alternatives:**
- Grouping into a single `sfp:ui-prefs` JSON object adds serialization complexity for no gain.
- Inline `localStorage` reads in the component bypass the service layer and make testing harder.
- The existing pattern is well-understood by this codebase.

`getSidebarWidth` clamps the returned value to [200, 700] at read time, satisfying R2.S4 regardless of how the value entered storage.

### D2: Read UI prefs in mount `useEffect`, not lazy initializer
```ts
const [libraryPinned, setLibraryPinned] = useState(false);
const [sidebarWidth, setSidebarWidth] = useState(380);
sidebarWidthRef.current = sidebarWidth; // render-time ref sync

useEffect(() => {
  setLibraryPinned(getLibraryPinned());
  setSidebarWidth(getSidebarWidth());
  // ...
}, []);
```

**Why not lazy initializer:**
Next.js App Router SSR renders `"use client"` components to HTML on the server even though they live in the client bundle. The server has no `localStorage`, so a lazy initializer returns the default (`false`, `380`). The client re-runs it with real storage values, producing a hydration mismatch and a React error.

`useEffect` only runs client-side, so server and client agree on the initial render. After hydration the effect fires and sets the stored values — one extra render, no error.

The existing `getAutosavePref` follows the same `useEffect` pattern (with an additional consent gate). These prefs use the same approach without the gate.

### D3: `handlePinChange` useCallback writes state and storage atomically
```ts
const handlePinChange = useCallback((pinned: boolean) => {
  setLibraryPinned(pinned);
  setLibraryPinnedPref(pinned);
}, []);
```
Passed as `onPinChange` to both `FactoryLibraryDrawer` instances, replacing direct `setLibraryPinned`.

### D4: Persist sidebar width on drag end, not during drag
Writing localStorage on every `mousemove` event (~60/sec during drag) is wasteful. Instead:

- Add `sidebarWidthRef = useRef(sidebarWidth)` to track current width during drag.
- In `onMouseMove`: update both `setSidebarWidth(newWidth)` and `sidebarWidthRef.current = newWidth`.
- In `onMouseUp`: call `setSidebarWidthPref(sidebarWidthRef.current)` — one write per drag gesture.

## Risks / Trade-offs

- **localStorage parse failure**: `getSidebarWidth` reads a string and parses it as a number. Corrupt or non-numeric values (e.g., from a future format change) must fall back to the default `380`. Guard with `Number.isNaN`.
- **`sidebarWidthRef` sync**: The ref is kept current via a render-time assignment (`sidebarWidthRef.current = sidebarWidth`). This ensures any drag started after the mount effect updates `sidebarWidth` uses the correct stored value. The explicit `sidebarWidthRef.current = newWidth` inside `onMouseMove` provides synchronous accuracy between mousemove and mouseup events.

## Open Questions

*(none — all decisions resolved during exploration)*
