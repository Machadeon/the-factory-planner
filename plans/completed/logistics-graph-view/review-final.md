# Final Review — Logistics Graph View

Ran `/caveman:caveman-review` over `git diff main...HEAD`.

## Findings & resolution

1. 🟡 `LogisticsSection` rebuilt the graph (incl. `deserializeFactory` for every consumer)
   on every render. **Fixed:** consumer derivation moved behind a `useMemo` keyed on
   `library` + `currentFactoryId` + output-slug signature (the overview's key);
   `buildGraphModel` now accepts the precomputed map.
2. 🔵 Stale `factory.graphLayout` keys for deleted lines were never pruned. **Fixed:**
   prune keys absent from the live node set on rebuild.
3. 🔵 `lookupPart` scanned all lines per part-slug. **Fixed:** `buildPartIndex` builds a
   `slug→Part` map once.
4. ❓ MILP `ints` spans the full `optimizeRecipes` candidate set. Only factory-recipe
   slugs are integer (typically few); accepted. Ties into the pre-existing "occasional
   solver freeze" backlog item — not a regression, tracked separately.
5. 🔵 Consumer-node merge uses `nodes.find/some` per output — O(n) but fine at current
   scale; left as-is.

## Verification after fixes

- `npx tsc --noEmit`: clean.
- `npm run test:run`: 167 passed, 2 todo.
- `npm run test:e2e` (logistics): 3 passed, 1 fixme; full suite earlier 59 passed.
- `npm run build`: success.
- Lighthouse (navigation, desktop): Best Practices 100, SEO 100, Accessibility 91.
- Browser-verified: nodes render to footprint, belts (amber) / pipes (blue) with
  log-scaled width, ports, minimap, maximize/restore, links — zero console errors.

## Verdict

Clean. No blocking concerns remain. Deferred (documented): integration AC12/AC14 and
e2e AC19/AC21 (drag-persist) — covered by manual/visual verification; the drag-pixel
math is too flaky to assert in headless CI.
