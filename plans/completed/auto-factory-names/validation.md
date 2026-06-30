# Validation: Auto-generated factory names

## Unit (`tests/unit/factory-names.test.ts`)

Covers acceptance criteria 1 & 2 (`generateFactoryName` purity/format).

1. **Format**: returns `"<adj> <noun>"` where `adj ∈ adjectives` and
   `noun ∈ nouns`. Split on the last space (adjectives may contain a hyphen but
   no space; nouns are single words). Assert both parts are members of their
   banks.
2. **Deterministic with stubbed `Math.random`**: `generateFactoryName` calls
   `Math.random` twice — first picks the adjective index, second picks the noun
   index. Stub returning `0` → `"Apex Anchor"` (both banks' first entry). Stub
   returning a value selecting the last index → last adjective + last noun.
3. **Always non-empty, single ASCII space** separating exactly two tokens.

## E2E updates

Criterion 3 (fresh mount load): `unknown-slug-fallback.spec.ts` and
`unknown-slug-with-hash-fallback.spec.ts` — replace
`toHaveValue("Unnamed Factory")` with a generated-name pattern assertion
`toHaveValue(/^[A-Za-z-]+ [A-Za-z]+$/)` **plus** `not.toHaveValue("Unnamed
Factory")` so a regression back to the literal default is caught (the regex
alone would also match `"Unnamed Factory"`).

Criterion 4 (clear factory → generated name): `tools/clear-factory.spec.ts`
"Clear the factory" test — after clearing, assert the name field matches the
generated-name pattern and is not `"Unnamed Factory"`. This exercises
`performClearFactory` (~835), the one fresh-factory site not on the mount path.

The back-nav clean-URL branch (~446) shares the same generator call; not
separately E2E-driven.

## Out of scope for tests

- Randomness distribution / collision rate (pure-random by design).
- SSR hydration is covered implicitly: generation in the mount effect (not the
  initializer) means no `Math.random()` during render; existing E2E run in a
  real browser and would surface a hydration error if reintroduced.
