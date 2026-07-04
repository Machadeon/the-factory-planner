## Why

`Factory.autoCalculateRates()`'s minimize-inputs objective builder (`factory.tsx:1247-1248`) has a variable-name typo: it *reads* `coefficients.obj` but *writes* `coefficients._obj`, so the intended accumulation `_obj = (_obj ?? 0) + delta` degrades into `_obj = delta` every iteration.

Investigation during the M0 code read (`plans/model-refactor.md` §2.5.1) confirms this is **currently inert**: `createBaseModel` guarantees each LP variable can carry at most one `_raw_X`-prefixed coefficient (only the dedicated per-resource extraction pseudo-variables carry that key at all; ordinary recipe variables key on the plain part slug, e.g. `"coal"`, never `"_raw_coal"`). So the loop at 1243-1251 never actually revisits the same variable's `_obj` twice today, and buggy vs. correct code produce byte-identical LP models.

This is a **latent-bug hardening fix, not a live-bug fix**: the accumulation is only correct today by accident of the current model shape. Any future change that lets a single variable carry more than one raw-resource coefficient (e.g. a recipe variable gaining a direct `_raw_X` key) would silently corrupt the minimize-inputs objective with no visible symptom beyond "sometimes suboptimal solver output." Fixing the typo now, while it's free and side-effect-free, and pinning the accumulation invariant with a test closes that landmine before the M1-M5 model refactor starts touching this code.

## What Changes

- Fix `coefficients.obj` → `coefficients._obj` at `factory.tsx:1248` so the accumulation reads the same key it writes.
- Add a regression test that exercises the accumulation logic with a variable carrying two raw-resource-linked deltas, proving the coefficients sum instead of overwrite. Since the real LP model can't produce that shape today, the test constructs the scenario directly against the loop's logic (exact mechanism decided in design.md) rather than asserting an end-to-end change in `autoCalculateRates()`'s solved output.
- No change to `Factory`'s public API, no extraction of the objective-building code into new files (that's Phase M2's `solver/*` split, out of scope here).

## Capabilities

### New Capabilities
- `rate-solver`: the correctness invariant of `Factory.autoCalculateRates()`'s minimize-inputs LP objective — coefficients linked to a given raw resource accumulate via summation per variable, never overwrite. Named to align with the eventual `solver/rate-solver.ts` home planned for Phase M2 of `plans/model-refactor.md`, even though the logic stays inline in `factory.tsx` for this change.

### Modified Capabilities
(none)

## Impact

- **Code**: `app/models/factory.tsx` (one-line fix in `autoCalculateRates`).
- **Tests**: new unit test in `tests/unit/models/` targeting the objective-coefficient accumulation.
- **Runtime behavior**: none observable today (dead-code path); defensive against future model changes.
- **Sequencing**: first of 3 Phase M0 bug fixes in `plans/model-refactor.md`; independent of bugs 2 and 3, no shared files with bug 3 (`_productionLineLookup`), touches the same method (`autoCalculateRates`) as no other M0 bug.
