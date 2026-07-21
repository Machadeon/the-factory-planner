# factory-session

## Purpose

Session-level Factory state: the valtio-proxied Factory instance, session identity fields, the single restore path, and new/clear flows. Owned by `app/hooks/useFactorySession.ts`.
## Requirements
### Requirement: R1 — valtio proxy is the only Factory store
`useFactorySession` SHALL hold the Factory in a valtio proxy container created once — `proxy({ factory })` — where `factory` is `new Factory()` for a fresh session or the deserialized instance on restore; loading swaps the container's `factory` field (a tracked write). The session's Factory SHALL be created or swapped only inside this hook (Factory instances constructed elsewhere — deserialization, nested-factory handling — are not the session store and are unaffected). The root version counter (`setVersion`) SHALL NOT exist anywhere in the component tree.

#### Scenario: R1.S1 — proxy identity
- **WHEN** `useFactorySession` initializes or loads a factory
- **THEN** the factory it exposes is valtio-proxied: mutations to it (and swaps of the container's `factory` field) are observable via valtio `subscribe` on the container

#### Scenario: R1.S2 — no version counter
- **WHEN** `app/components/` and `app/hooks/` are searched for the version-counter pattern (`setVersion`)
- **THEN** no occurrences remain

### Requirement: R2 — root snapshot as re-render trigger
`FactoryPage` SHALL call `useSnapshot` once on the proxy container as a re-render trigger only; children SHALL receive the proxy (`store.factory` and objects reached through it), not snapshot objects, so reads and model-method mutations work unchanged. All mutations SHALL go through model methods on the proxy; the enforceable mutation contract (no direct field writes, no direct `update`/`autoCalculateRates`/`optimizeRecipes` calls) is owned by the `factory-mutation-methods` capability (R4), which this requirement defers to. Reads SHALL come from snapshots; writes SHALL target the proxy.

#### Scenario: R2.S1 — mutation re-renders the page
- **WHEN** a model mutation occurs on the proxy (e.g. a production line rate changes)
- **THEN** `FactoryPage` re-renders and children receive updated data, with no call to a manual version counter

### Requirement: R4 — session identity state
`useFactorySession` SHALL own the session identity fields: factory name, current factory id, current slug, current folder id, createdAt, and dirty flag. A fresh session SHALL have a generated factory name (via `generateFactoryName`), null id/slug/folder, empty createdAt, and dirty=false.

#### Scenario: R4.S1 — fresh session defaults
- **WHEN** the app mounts with nothing to restore
- **THEN** the session has a generated name, null id, null slug, null folder id, and is not dirty

### Requirement: R5 — single restore path
The four duplicated restore blocks in FactoryComponent (restoreFactory priority 1, priority 3, the popstate handler, `loadFactoryFromSerialized`) SHALL collapse into one `loadSerialized(sf, lib, opts?)` function inside `useFactorySession`. Default behavior: deserialize against the given library, backfill a missing slug via the existing `ensureSlug` semantics (generate unique slug, persist to library), swap the proxied Factory, set all session identity fields from the serialized entry, set dirty=false, and persist the current factory id. These persistence writes are unconditional, matching today's call sites (storage-service functions do not themselves check consent). `opts` SHALL support the variations the existing call sites need: `markDirty` (default false — autosave restore passes true), `backfillSlug` (default true — autosave restore passes false), `persistCurrentId` (default true — autosave restore passes false). On deserialization failure it SHALL leave session state unchanged and surface the existing message as an error toast via `useToast` (see `toast-notifications`), replacing the former `alert()`.

#### Scenario: R5.S1 — successful load
- **WHEN** `loadSerialized` is called with a valid serialized factory
- **THEN** the store holds the deserialized factory, name/id/slug/folder/createdAt match the entry, dirty is false, and the current factory id is persisted

#### Scenario: R5.S2 — slug backfill
- **WHEN** `loadSerialized` is called with an entry that has no slug
- **THEN** a slug unique against all other factories' slugs is generated, persisted to the library entry, and set as the session slug

#### Scenario: R5.S3 — autosave-restore options
- **WHEN** `loadSerialized` is called with `{ markDirty: true, backfillSlug: false, persistCurrentId: false }` (the autosave-restore call site)
- **THEN** the session is dirty, no slug is generated or persisted, and the current-factory id is not written

#### Scenario: R5.S4 — failed deserialization
- **WHEN** `deserializeFactory` returns undefined for the entry
- **THEN** session state is unchanged and the message "Could not restore factory — some recipe or part data may be missing." is shown as an error toast (no blocking `alert()`)

#### Scenario: R5.S5 — no duplicated restore blocks
- **WHEN** the new code is inspected
- **THEN** exactly one code path sets the session identity fields from a serialized factory

### Requirement: R6 — dirty tracking
The dirty flag SHALL become true when the factory model mutates (driven by valtio `subscribe` on the proxy container, not by `factory.update`) and when the factory name is edited. It SHALL reset to false on save, load, and new/clear. Proxy writes performed during a restore (deserialization-driven mutations, `_updateRates` recompute after swap) SHALL NOT leave a fresh load marked dirty. The subscription SHALL attach once to the proxy container (R1) and therefore survives factory swaps; edits to a newly loaded factory keep marking dirty without any re-subscription step.

#### Scenario: R6.S1 — model edit marks dirty
- **WHEN** a production line is added or a rate is edited after a clean load
- **THEN** the session becomes dirty without any explicit `setIsDirty` call at the mutation site

#### Scenario: R6.S2 — save clears dirty
- **WHEN** a save completes
- **THEN** the session is not dirty

#### Scenario: R6.S3 — restore-time writes do not dirty
- **WHEN** `loadSerialized` completes (including its post-swap recompute)
- **THEN** the session is not dirty, and a subsequent edit to the newly loaded factory does mark it dirty (subscription followed the swap)

### Requirement: R7 — new/clear flow
Clearing to a new factory SHALL preserve today's semantics: swap in a fresh Factory, generate a new name, null id/slug, set folder id to the requested folder, clear createdAt, set dirty=false, clear the persisted current-factory id, close the library drawer, and disable autosave. The unsaved-changes guards SHALL be preserved: dirty + autosave-on + consent → silent save then clear; dirty otherwise → confirm dialog with Save & clear / Discard & clear / cancel; not dirty → clear immediately. Loading over a dirty session SHALL prompt Save & load / Discard & load / cancel.

#### Scenario: R7.S1 — clear resets session
- **WHEN** a clean session clears to a new factory in folder F
- **THEN** the session has a fresh factory, generated name, null id/slug, folder F, is not dirty, autosave is disabled, and no current-factory id is persisted

#### Scenario: R7.S2 — dirty with autosave saves silently
- **WHEN** the session is dirty, autosave is enabled, and consent is granted, and the user requests a new factory
- **THEN** the current factory is saved and the session clears without a dialog

#### Scenario: R7.S3 — dirty without autosave prompts
- **WHEN** the session is dirty with autosave off and the user requests a new factory
- **THEN** the clear-confirm dialog appears and cancel leaves the session untouched
