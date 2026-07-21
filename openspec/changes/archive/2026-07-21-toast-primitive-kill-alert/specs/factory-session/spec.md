## MODIFIED Requirements

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
