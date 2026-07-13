## ADDED Requirements

### Requirement: R5 — availableParts normalization is cast-free
`factory-storage.ts`'s `normalizeRecipeOptimizer` SHALL read the raw serialized `availableParts` value through an honestly-typed raw input (e.g. `unknown[]` or a dedicated loosely-typed serialized shape), not by forcing an already-`RecipeOptimizerConfig`-typed value through `as unknown as`. The legacy-string tolerance SHALL be preserved exactly: a stored `availableParts` entry that is a bare string normalizes to `{ partSlug: <string>, rate: 0 }`; a stored `AvailablePart` object passes through unchanged.

#### Scenario: R5.S1 — no as-unknown-as cast in factory-storage.ts
- **WHEN** `app/models/factory-storage.ts` is searched for `as unknown as`
- **THEN** zero occurrences remain

#### Scenario: R5.S2 — legacy string[] shape still normalizes
- **WHEN** a serialized factory whose `optimizer.availableParts` is a plain string array (the pre-`AvailablePart`-object schema) is deserialized
- **THEN** each string becomes `{ partSlug: <string>, rate: 0 }`, byte-for-byte identical to current behavior, covered by a regression test fixture

#### Scenario: R5.S3 — current object shape unaffected
- **WHEN** a serialized factory whose `optimizer.availableParts` already holds `AvailablePart` objects is deserialized
- **THEN** the objects pass through unchanged, identical to current behavior
