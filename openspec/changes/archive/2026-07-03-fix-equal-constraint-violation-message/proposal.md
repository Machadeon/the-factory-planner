## Why

`Factory.autoCalculateRates`'s post-solve constraint verification (`factory.tsx:1328`) builds the user-facing error message for an `equal` constraint violation by interpolating `constraint.min` instead of `constraint.equal`. Since `equal` constraints never set `min`, the message reads "must be exactly undefined/min" — unreadable and useless for diagnosing why the solve failed. This is Phase M0 item 2 in `plans/model-refactor.md`.

## What Changes

- Fix the interpolated field in the equal-constraint violation message at `factory.tsx:1328` from `constraint.min` to `constraint.equal`.
- Add a regression unit test asserting the message text for an equal-constraint violation includes the correct target value.

## Capabilities

### New Capabilities
- `rate-solver-verification`: the correctness invariant of `Factory.autoCalculateRates()`'s post-solve constraint-verification callback — each violation message interpolates the bound value belonging to the violated constraint kind (`min`/`max`/`equal`), never a different kind's field. Named to align with the eventual `solver/verify.ts` home planned for Phase M2 of `plans/model-refactor.md`, even though the logic stays inline in `factory.tsx` for this change.

### Modified Capabilities
(none)

## Impact

- `app/models/factory.tsx` — one-line fix inside `autoCalculateRates`'s deferred constraint-verification callback.
- `tests/unit/models/` — new regression test exercising the equal-constraint violation message.
- No API, schema, or UI changes.
