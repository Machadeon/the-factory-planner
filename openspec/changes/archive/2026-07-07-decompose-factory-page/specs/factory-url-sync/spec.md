# factory-url-sync

URL/history synchronization, extracted to `app/hooks/useFactoryUrlSync.ts`: hash ↔ tab sync, pushState on factory switch, popstate restore, and the restore-on-mount priority chain. All behavior below is a port of existing invariants — no URL format changes.

## ADDED Requirements

### Requirement: R1 — restore-on-mount priority chain
On mount with consent, restore SHALL try in order: (1) URL param — `?factory=<slug>` (preferred) or `?factoryId=<id>` (legacy) resolved against the library; (2) the autosave slot; (3) the last current-factory id from storage. First success wins; all three use the single `loadSerialized` path (factory-session R5) — the autosave source passes R5's options `{ markDirty: true, backfillSlug: false, persistCurrentId: false }`; the other two use defaults. If nothing restores (or no consent), the session starts fresh with a generated name. URL params SHALL be captured at first render, before any layout effect can rewrite `window.location`.

#### Scenario: R1.S1 — URL slug wins over autosave
- **WHEN** the app mounts with `?factory=<slug>` matching a library entry while an autosave entry also exists
- **THEN** the slug's factory is loaded, dirty=false, and history state is stamped with `{ factoryId, slug }` via replaceState

#### Scenario: R1.S2 — autosave restore
- **WHEN** the app mounts with no URL param and an autosave entry exists
- **THEN** the autosaved factory is loaded with dirty=true

#### Scenario: R1.S3 — lastId fallback
- **WHEN** the app mounts with no URL param and no autosave, but a persisted current-factory id matches a library entry
- **THEN** that factory is loaded with dirty=false

#### Scenario: R1.S4 — nothing to restore
- **WHEN** none of the three sources yields a factory
- **THEN** the session starts fresh with a generated name

#### Scenario: R1.S5 — unresolvable URL param falls through
- **WHEN** the app mounts with `?factory=<slug>` (or `?factoryId=<id>`) matching no library entry
- **THEN** restore falls through to the autosave slot, then the lastId, then fresh — same as if no param were present

### Requirement: R2 — hash ↔ section sync
The active section (planning | optimization | logistics) SHALL initialize from the URL hash captured at first render (invalid/absent hash → planning), and section changes SHALL update the hash via `replaceState` (never a new history entry), skipping the first render so the mount read is not clobbered.

#### Scenario: R2.S1 — initial hash honored
- **WHEN** the app mounts at `#optimization`
- **THEN** the optimization section is active

#### Scenario: R2.S2 — tab switch adds no history entry
- **WHEN** the user switches tabs
- **THEN** the hash updates via replaceState and history length is unchanged

### Requirement: R3 — pushState on factory identity change
When the current factory id/slug changes, the hook SHALL `pushState` a `{ factoryId, slug }` state with the base-path-aware URL: `/?factory=<slug>#<section>` (slug preferred), `/?factoryId=<id>#<section>` (no slug), or `/` (no factory). The section hash SHALL come from a ref so tab switches alone never push history entries.

#### Scenario: R3.S1 — load pushes bookmarkable URL
- **WHEN** a factory with a slug is loaded
- **THEN** the URL becomes `/?factory=<slug>#<section>` via pushState with `{ factoryId, slug }` state

### Requirement: R4 — popstate restore with forward-stack preservation
On popstate the hook SHALL: reload the library; suppress the next URL push (flag read by the pushState effect before a queued rAF clears it — the rAF safety net covers same-factory navigations where the effect never fires); set the active section from the current hash; then restore by priority — history-state factoryId → URL params (`?factory=`/`?factoryId=` for navigations that did not carry pushState payload) → fresh factory on a clean URL. Restores go through `loadSerialized`; a restore or reset SHALL NOT push a new history entry (forward stack preserved).

#### Scenario: R4.S1 — back to previous factory
- **WHEN** the user navigates back to an entry whose history state carries a factoryId present in the library
- **THEN** that factory is restored, its id persisted, and no new history entry is created

#### Scenario: R4.S2 — hash-only navigation with URL params
- **WHEN** a popstate fires with no factoryId in history state but `?factory=<slug>` in the URL
- **THEN** the slug's factory is restored (bookmarked URLs keep working)

#### Scenario: R4.S3 — back to clean URL
- **WHEN** a popstate fires with no factoryId and no URL params
- **THEN** the session resets to a fresh factory and the persisted current-factory id is cleared

#### Scenario: R4.S4 — popstate to a deleted factory
- **WHEN** a popstate fires with a history-state factoryId that is absent from the library
- **THEN** the current session is left untouched (no restore, no reset — today's behavior: the `target` branch and the `!id` branch both skip)

### Requirement: R5 — hook composition
`useFactoryUrlSync` SHALL depend on the session API (factory-session) rather than duplicating restore logic, and SHALL be extracted last among the hooks. Existing integration coverage (`history-base-path.test.tsx`) SHALL pass unchanged.

#### Scenario: R5.S1 — no duplicated restore logic
- **WHEN** the hook is inspected
- **THEN** factory restoration is delegated to the session's `loadSerialized`/reset APIs
