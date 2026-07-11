## Pass 1 — 2026-07-11

**Source: Reviewer**
**Status: APPROVED**

### Resolved from Previous Pass


### Findings
app/hooks/useLibrary.ts:105-117: 🟡 risk: `addFolder` reads/writes via `libraryRef.current` while every other mutator uses `setLibrary`'s functional-`prev` form. If `addFolder` and any other mutator (e.g. `deleteFactory`) were ever called in the same synchronous handler/tick, `addFolder`'s absolute `setLibrary(lib)` would overwrite the other's pending functional update, silently dropping it. No current call site does this (each mutator fires from its own isolated click handler), so this is not user-visible today — leave as follow-up, don't block on it. If a future call site batches mutations, switch `addFolder` to compute its ref snapshot for the *folder* only and fold the library update into a functional `setLibrary(prev => ...)` like the others.
app/components/library/LibraryDrawer.tsx:99-101: 🔵 nit: `handleExportAll`'s `useCallback` dep is `[library]`, so it's rebuilt on every library mutation — harmless (only wired to a single button, not part of `rowActions`/`rowState`) but worth a one-line comment if a future reader assumes every `useCallback` in this file follows the `rowActions` stability contract in row-types.ts.
app/components/library/row-types.ts:26-29: 🔵 nit: comment says "closed member list" — true today, but if a future change adds a member without updating this comment, nothing enforces it; a type-level test (`expectTypeOf`) would catch drift at compile time instead of relying on the comment, but that's beyond this change's scope.

No CRITICAL or HIGH findings. Full test suite (466 unit/integration + 93 e2e) green, build clean, lint clean, selector-contract diff (aria-label/data-testid) matches pre-split file exactly, structural verification script (`scripts/verify-library-split.sh`) passes.
