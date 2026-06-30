# Implementation: Auto-generated factory names

## Files

### 1. `app/models/factory-names.ts` (add export)

Append:

```ts
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateFactoryName(): string {
  const adjective = pick(adjectives); // first Math.random draw
  const noun = pick(nouns); // second Math.random draw
  return `${adjective} ${noun}`;
}
```

Order matters: adjective drawn first, noun second (locked by unit test).

### 2. `app/components/FactoryComponent.tsx` (3 edits)

- **Import**: add `generateFactoryName` to the existing
  `from "../models/factory-names"` import (or new import line if none).
- **Line ~88**: `useState("Unnamed Factory")` → `useState("")`. SSR-stable; no
  `Math.random()` during render. Empty value shows the `"Factory Name"`
  placeholder until the mount effect runs.
- **Mount effect (~307)**: after `restoreFactory(lib)`, assign a generated name
  only when nothing was restored. Make `restoreFactory` return a boolean
  (`true` when it restored a factory; `false` otherwise). **Branch inventory
  (verified):**
  - Priority 1 saved-by-URL: has `return;` at ~257 → `return true;`.
  - Priority 2 autosave: has `return;` at ~278 → `return true;`.
  - Priority 3 last-saved (~284-301): **falls through, NO existing return**.
    Add `return true;` *inside* its `if (restored)` block (after ~299).
    Mechanically converting only the existing `return;` statements would leave
    Priority 3 returning `false`, overwriting the restored name with a random
    one — must add the explicit `return true;` here.
  - Final fall-through (~303): `return false;`.
  Then in the effect:
  ```ts
  // KEEP the existing autosave-pref block (308-312) above this.
  if (!hasConsent()) {
    setFactoryName(generateFactoryName());
    return;
  }
  const lib = loadLibrary();
  setLibrary(lib);
  if (!restoreFactory(lib)) setFactoryName(generateFactoryName());
  ```
  The no-consent early return at ~314 currently leaves the name at the initial
  value — it must now also generate. Preserve the autosave-pref `if (hasConsent())`
  block at 308-312; only the `if (!hasConsent()) return;` at 314 changes.
- **Line ~446** (back-nav clean URL) and **~835** (`performClearFactory`):
  `setFactoryName("Unnamed Factory")` → `setFactoryName(generateFactoryName())`.

## Order

1. Add `generateFactoryName` → unit test goes green.
2. Wire `FactoryComponent` (import + 4 touch points: useState, mount effect,
   446, 835) and convert `restoreFactory` to return boolean.
3. Run unit + E2E.

## Risks

- **`restoreFactory` boolean refactor**: it has multiple early-return branches
  (saved-by-URL, autosave, last-saved, and an implicit fall-through). Each must
  return the right boolean; missing one would either skip a generated name on a
  fresh load or overwrite a restored name. Mitigation: the fallback E2E specs +
  the existing restore E2E specs (factory switch, bookmark roundtrip) cover both
  paths.
- **No-consent path**: must still generate (it returns before
  `restoreFactory`). Easy to miss.
- **Flicker**: empty placeholder shows for one frame before the mount effect
  fills the generated name. Matches existing restore behavior (also effect-based);
  acceptable.

## Design skills note

`modern-web-guidance` / `frontend-design` target HTML/CSS/visual work. This
change is a pure data/string + React-state change with no new markup, styling,
or layout, so those skills do not apply. The only DOM-facing surface (the name
`TextField` + its `aria-label`) was added in the prior task.
