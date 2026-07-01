## 1. Test Stubs

- [x] 1.1 Write E2E test stub: `tests/e2e/library/library-button-visibility.spec.ts` — R1.S1: button absent from DOM when drawer is pinned
- [x] 1.2 Write E2E test stub: R1.S2: button present and clickable when drawer is unpinned
- [x] 1.3 Write E2E test stub: R1.S3: button removed from DOM immediately when user pins the drawer
- [x] 1.4 Write E2E test stub: R1.S4: button restored in DOM immediately when user unpins the drawer

## 2. Implementation

- [x] 2.1 `FactoryHeader.tsx`: make `onOpenLibrary` optional (`onOpenLibrary?: () => void`)
- [x] 2.2 `FactoryHeader.tsx`: change `handleOpenLibrary` to call `onOpenLibrary?.()` (optional chaining)
- [x] 2.3 `FactoryHeader.tsx`: wrap the library button render in `{onOpenLibrary && (...)}`
- [x] 2.4 `FactoryComponent.tsx`: change `onOpenLibrary` prop to `libraryPinned ? undefined : () => requireConsent("openLibrary")`

## 3. Verification

- [x] 3.1 Run stubs before implementation — confirm 1.1, 1.3, 1.4 fail; 1.2 will already pass (tests pre-existing default behavior)
- [x] 3.2 Implement tasks 2.1–2.4, then confirm stubs pass
- [x] 3.3 All unit/integration tests pass (`npm run test:run`)
- [x] 3.4 All E2E tests pass (`npm run test:e2e`)
- [x] 3.5 Lighthouse audit (UI changed — button removed from DOM when pinned)
