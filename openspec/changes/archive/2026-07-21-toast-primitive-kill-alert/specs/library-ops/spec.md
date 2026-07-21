## MODIFIED Requirements

### Requirement: R5 — import wiring behavior preserved
FactoryPage wiring SHALL preserve today's behavior: JSON with a `factories` key imports as a library (requires consent — without it, `requireConsent("openLibrary")` is invoked and nothing merges); JSON with `productionLines` imports as a single factory (merged library persisted only when consent exists; the imported factory loads either way); unrecognized JSON and parse failures surface the existing messages as error toasts via `useToast` (see `toast-notifications`), replacing the former `alert()` calls with the same text.

#### Scenario: R5.S1 — single-factory import without consent
- **WHEN** a single-factory file is imported without consent
- **THEN** the factory loads into the session but the merged library is not saved by the import step (loadSerialized's own writes — current-id persist, slug backfill — still occur per factory-session R5, preserving today's behavior)

#### Scenario: R5.S3 — library import without consent
- **WHEN** a file with a `factories` key is imported without consent
- **THEN** nothing merges and `requireConsent("openLibrary")` is invoked (consent dialog path)

#### Scenario: R5.S2 — bundle import loads root
- **WHEN** a bundle export is imported with consent
- **THEN** the merged library is saved and the bundle's root factory is loaded without opening the drawer

#### Scenario: R5.S4 — unrecognized and parse failures toast
- **WHEN** imported JSON is neither a library nor a single factory, or `JSON.parse` throws
- **THEN** the message "Unrecognized JSON format." or "Failed to parse JSON file." respectively is shown as an error toast (no blocking `alert()`)
