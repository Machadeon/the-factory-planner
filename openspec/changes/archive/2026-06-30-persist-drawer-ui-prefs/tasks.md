## 1. Storage Service

- [x] 1.1 Add `KEY_LIBRARY_PINNED = "sfp:library-pinned"` constant to `storage-service.ts`
- [x] 1.2 Add `getLibraryPinned(): boolean` — reads key, defaults to `false` on miss or error
- [x] 1.3 Add `setLibraryPinned(v: boolean): void` — writes key
- [x] 1.4 Add `KEY_SIDEBAR_WIDTH = "sfp:sidebar-width"` constant to `storage-service.ts`
- [x] 1.5 Add `getSidebarWidth(): number` — reads key, parses as number, clamps to [200, 700], defaults to `380` on miss/NaN/error
- [x] 1.6 Add `setSidebarWidth(v: number): void` — writes key

## 2. FactoryComponent — pin state

- [x] 2.1 Import `getLibraryPinned` and `setLibraryPinned` from `storage-service.ts`
- [x] 2.2 Change `useState(false)` → `useState(() => getLibraryPinned())` for `libraryPinned`
- [x] 2.3 Add `handlePinChange` useCallback that calls `setLibraryPinned(state)` + `setLibraryPinnedPref(state)`, replace both `onPinChange={setLibraryPinned}` usages with `onPinChange={handlePinChange}`

## 3. FactoryComponent — sidebar width

- [x] 3.1 Import `getSidebarWidth` and `setSidebarWidth` from `storage-service.ts`
- [x] 3.2 Change `useState(380)` → `useState(() => getSidebarWidth())` for `sidebarWidth`
- [x] 3.3 Add `sidebarWidthRef = useRef<number>(sidebarWidth)` (initialized from lazy state, not hardcoded 380)
- [x] 3.4 In `onMouseMove`: add `sidebarWidthRef.current = newWidth` alongside `setSidebarWidth(newWidth)`
- [x] 3.5 In `onMouseUp`: add `setSidebarWidth(sidebarWidthRef.current)` to persist on drag end

## 4. Tests

- [x] 4.1 Unit test `getSidebarWidth`: verify clamping (below 200 → 200, above 700 → 700, NaN → 380, valid → passthrough)
- [x] 4.2 Unit test `getLibraryPinned`: verify default false, reads true/false correctly
- [x] 4.3 E2E test R1.S1: pin drawer, reload, verify sidebar mode persists
- [x] 4.4 E2E test R1.S2: ensure drawer absent on load when unpinned; appears on folder-icon click in overlay mode
- [x] 4.5 E2E test R2.S1: drag sidebar to custom width, reload, verify width restored

## 5. Verification

- [x] 5.1 Run `npm run test:run` — all unit/integration tests pass
- [x] 5.2 Run `npm run test:e2e` — all E2E tests pass
- [x] 5.3 Run `npm run lint-fix` — no Biome errors
- [x] 5.4 Manual smoke: pin → reload → still pinned; resize → reload → same width; first-load defaults correct
