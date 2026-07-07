# factory-autosave

Consent-aware debounced autosave, extracted to `app/hooks/useAutosave.ts` and driven by valtio `subscribe(factory, …)` instead of `factory.update` plumbing.

## ADDED Requirements

### Requirement: R1 — subscribe-driven debounce
Autosave SHALL be scheduled by a valtio `subscribe(factory, …)` callback (and by factory-name edits' dirty transition — see factory-session R6), debounced at 400ms (`AUTOSAVE_DEBOUNCE_MS`), so a burst of edits coalesces into one write. Timer expiry SHALL apply the same write rule as flush (R3): autosave enabled → full library save; disabled → autosave-slot write. The component-level state-mirroring machinery (`autosaveEnabledRef`, `doSaveRef`, `buildSerializedRef`, `flushAutosaveRef` as they existed in FactoryComponent — refs mirroring React state because closures escaped the render cycle) SHALL NOT survive the extraction. Hook-internal latest-callback refs (a hook keeping its own props/callbacks current for mount-once listeners and timers) are an accepted implementation detail, not the banned pattern.

#### Scenario: R1.S1 — burst coalesces
- **WHEN** three proxy mutations occur within 400ms with consent granted
- **THEN** exactly one persistence write occurs, 400ms after the last mutation (verified with fake timers)

#### Scenario: R1.S2 — expiry write target
- **WHEN** the debounce timer expires naturally with autosave disabled
- **THEN** the serialized factory is written to the autosave slot; with autosave enabled, the library save path runs instead

#### Scenario: R1.S3 — no update plumbing
- **WHEN** the code is inspected after the change
- **THEN** autosave scheduling is not reachable from `factory.update`

### Requirement: R2 — consent gates all writes
Without storage consent, autosave SHALL neither schedule timers nor write to storage.

#### Scenario: R2.S1 — no consent, no write
- **WHEN** proxy mutations occur and `hasConsent()` is false
- **THEN** no autosave timer is pending and no storage write occurs

### Requirement: R3 — flush semantics preserved
`flush` SHALL be a no-op when no debounce timer is pending. When a timer is pending it SHALL cancel it and then: with autosave enabled, perform a full library save (`doSave` path); with autosave disabled, write the serialized factory to the autosave slot (`writeAutosave`). Consent is checked at flush time.

#### Scenario: R3.S1 — flush with autosave enabled
- **WHEN** a flush fires with a pending timer and autosave enabled
- **THEN** the factory is saved to the library (not the autosave slot)

#### Scenario: R3.S2 — flush with autosave disabled
- **WHEN** a flush fires with a pending timer and autosave disabled
- **THEN** the serialized factory is written to the autosave slot only

#### Scenario: R3.S3 — flush without pending timer
- **WHEN** flush is called with no pending timer
- **THEN** nothing is written

### Requirement: R4 — flush on unload and unmount
A pending autosave SHALL be flushed on `beforeunload` and on hook unmount, so the last burst of edits is not lost.

#### Scenario: R4.S1 — unmount flush
- **WHEN** the hook unmounts 100ms after a mutation (timer still pending)
- **THEN** the pending write is flushed exactly once

#### Scenario: R4.S2 — beforeunload flush
- **WHEN** a `beforeunload` event fires while a timer is pending
- **THEN** the pending write is flushed before the page unloads

### Requirement: R5 — explicit save supersedes pending autosave
An explicit save SHALL cancel any pending autosave timer before saving, and a successful save SHALL clear the autosave slot (`clearAutosave`).

#### Scenario: R5.S1 — save cancels timer
- **WHEN** the user saves while an autosave timer is pending
- **THEN** the timer is cancelled, exactly one library save occurs, and the autosave slot is cleared

### Requirement: R6 — enable/toggle semantics preserved
Autosave enablement SHALL keep today's rules: preference read from storage on mount when consent exists; toggling persists the preference when consent exists; the first successful save of a new factory enables autosave; restoring an autosave entry whose id is not in the library disables autosave; clearing to a new factory disables autosave.

#### Scenario: R6.S1 — first save enables
- **WHEN** a never-saved factory is saved for the first time
- **THEN** autosave becomes enabled and the preference is persisted

#### Scenario: R6.S2 — orphan autosave restore disables
- **WHEN** the session restores from an autosave entry whose id is absent from the library
- **THEN** autosave is disabled and the session is dirty

### Requirement: R7 — session swap cancels pending timer
Loading a factory and clearing to a new factory SHALL cancel any pending autosave timer, so a stale timer never writes state from the previous session after the swap.

#### Scenario: R7.S1 — load cancels stale timer
- **WHEN** a factory loads 100ms after an edit to the previous factory (timer pending)
- **THEN** the pending timer is cancelled and no write for the previous factory occurs after the load
