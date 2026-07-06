# lib-utilities Specification (delta)

## ADDED Requirements

### Requirement: R6 — downloadJson relocated to lib
`app/lib/download.ts` SHALL export `downloadJson(data: unknown, filename: string): void` with behavior identical to today: serialize via `JSON.stringify(data, null, 2)`, wrap in an `application/json` Blob, trigger a browser download under `filename` via a temporary anchor element, and revoke the object URL. `app/models/storage-service.ts` SHALL NOT export `downloadJson` or reference any DOM API.

#### Scenario: R6.S1 — Single home
- **WHEN** the change is complete
- **THEN** `downloadJson` is importable only from `app/lib/download`, and its two importers (`FactoryLibraryDrawer.tsx`, `FactoryComponent.tsx`) compile against that path

#### Scenario: R6.S2 — Storage layer DOM-free
- **WHEN** `app/models/storage-service.ts` is searched for the API usages `document.`, `new Blob`, or `URL.createObjectURL`
- **THEN** none appear
