# Validation: Custom Part Point Values

## Test plan

### Unit tests — `tests/unit/models/point-values.test.ts`

| # | Behavior | Pass condition |
|---|----------|----------------|
| U1 | Raw resource default value | `computeDefaultPointValues()["iron-ore"]` ≈ `1_000_000 / 92_100` (≈10.856) |
| U2 | Raw resource scarcity ordering | `value["uranium"] > value["iron-ore"]` (uranium limit 2100 < iron ore 92100) |
| U3 | Zero-cost unlisted resource | `computeDefaultPointValues()["water"]` === 0 |
| U4 | Derivative via default recipe | Iron Ingot (smelted from Iron Ore) has value > 0, derived from iron ore cost |
| U5 | Co-product equal per-unit value | Fuel refinery outputs share same per-unit value |
| U6 | Cycle → cyclic parts get 0 | Construct fake cyclic parts in a mock; confirm value === 0 |
| U7 | Global override pins slug | `resolveEffectivePointValues({ "iron-ore": 999 }, {})["iron-ore"]` === 999 |
| U8 | Global override propagates downstream | Iron Ingot value changes when iron-ore override changes |
| U9 | Factory override takes precedence | `resolveEffectivePointValues({ "iron-ore": 50 }, { "iron-ore": 200 })["iron-ore"]` === 200 |
| U10 | Factory override downstream recompute | Iron Ingot value derived from factory iron-ore override, not global |
| U11 | Empty overrides → same as defaults | `resolveEffectivePointValues({}, {})` deep-equals `computeDefaultPointValues()` |
| U12 | Override does not mutate defaults | Call `computeDefaultPointValues()` twice; results are equal (no shared mutable state) |

### Unit tests — `tests/unit/models/factory-point-values.test.ts`

| # | Behavior | Pass condition |
|---|----------|----------------|
| F1 | `partPointOverrides` serializes | `serializeFactory` output includes `partPointOverrides` when non-empty |
| F2 | `partPointOverrides` omitted when empty | `serializeFactory` output omits `partPointOverrides` when `{}` |
| F3 | `partPointOverrides` deserializes | `deserializeFactory` restores `partPointOverrides` from serialized data |
| F4 | Missing field defaults to `{}` | `deserializeFactory` on legacy data (no `partPointOverrides`) sets `{}` |
| F5 | `StorageLibrary.partPointOverrides` round-trips | Library with global overrides survives `JSON.stringify` → `JSON.parse` → `loadLibrary` |

### E2E tests — `tests/e2e/custom-point-values/`

| # | File | Behavior | Pass condition |
|---|------|----------|----------------|
| E1 | `default-values.spec.ts` | Panel shows correct iron ore default | Search "iron ore" in panel; value cell shows ~10.9 |
| E2 | `global-override.spec.ts` | Global override persists and updates downstream | Set iron ore global override; reload; override present; iron ingot value changed |
| E3 | `factory-override.spec.ts` | Factory override takes precedence over global | Set global iron ore 50, factory override 200; iron ore effective = 200 in tooltip |
| E4 | `objective-selection.spec.ts` | `inputValue` objective selectable and LP runs | Select inputValue radio; add iron plate target; solve; no solver error |
| E5 | `panel-toggle.spec.ts` | Button toggles panel open/close | Click "Customize Point Values"; panel appears; click "Hide Values"; panel gone |

---

## Acceptance criteria

- All U1–U12 pass
- All F1–F5 pass
- All E1–E5 pass
- `npm run test:run` exits 0
- `npm run test:e2e` exits 0
- `lighthouse_audit` performance score does not regress vs baseline (no new render-blocking added)
