# Spec: Auto-generated factory names

## Problem

New/empty factories default to the literal name `"Unnamed Factory"`. Users
want fresh factories to start with a flavorful, game-themed name drawn from a
bank of adjectives and nouns.

## Goal

When a fresh, empty factory is created in the planner, assign it a randomly
generated name of the form `"<Adjective> <Noun>"` instead of
`"Unnamed Factory"`.

## Scope

### In scope

- Add `generateFactoryName()` to `app/models/factory-names.ts`. Returns a string
  `"<Adjective> <Noun>"` picking one random entry from each existing exported
  array (`adjectives`, `nouns`).
- Use it at the fresh-factory sites in `app/components/FactoryComponent.tsx`:
  1. **Client mount** — the mount effect (~307) calls `restoreFactory`. When
     nothing is restored (no consent, or no saved/autosaved/last factory),
     assign a generated name. Generation happens in the effect (client only),
     **not** in the `useState` initializer, to avoid SSR hydration mismatch.
  2. Back-navigation to a clean URL (~446) — "new empty factory" branch
     (event handler, client-only, safe).
  3. `performClearFactory` (~835) — clear/new factory action (event handler,
     client-only, safe).
- Initial `useState` for `factoryName` (~88) becomes `""` (SSR-stable; server
  and client both render the empty placeholder, no `Math.random()` at render).
  The client mount effect immediately replaces it for fresh factories.

### Out of scope

- Uniqueness / collision avoidance against existing library names. Names are
  **pure random**; duplicates are acceptable (52×51 = 2652 combinations make
  collisions rare).
- Renaming existing saved factories or migrating stored names.
- Changing the placeholder text (`FactoryHeader.tsx`) — it stays `"Factory Name"`
  as the empty-field fallback.
- Restored/loaded factories keep their stored name (unchanged behavior).

### Test impact

- E2E asserts that fresh/empty factories show value `"Unnamed Factory"`
  (`unknown-slug-fallback.spec.ts`, `unknown-slug-with-hash-fallback.spec.ts`)
  must change: a fresh factory now has a generated name. Assert the value is a
  non-empty `"<word> <word>"` pattern (two space-separated tokens) instead of
  the literal string.
- The combination space is 52 adjectives × 51 nouns = 2652 possibilities.

## Behavior

- Each fresh factory gets an independently generated name; two new factories in
  a row may differ.
- `generateFactoryName()` is pure aside from `Math.random()`; deterministic when
  `Math.random` is stubbed.
- Output always non-empty, both words capitalized as stored in the banks, single
  ASCII space separator.

## Acceptance criteria

1. `generateFactoryName()` returns `"<adj> <noun>"` where `adj ∈ adjectives` and
   `noun ∈ nouns`.
2. Stubbing `Math.random` selects a deterministic, expected pair.
3. A newly loaded planner (no saved factory) shows a generated name, not
   `"Unnamed Factory"`.
4. Clearing the factory produces a generated name.
5. The name field remains editable; generated name is the editable value (not a
   placeholder).

## Open questions

None — resolved: full dev cycle, pure random.
