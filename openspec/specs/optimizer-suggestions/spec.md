# optimizer-suggestions Specification

## Purpose
TBD - created by archiving change split-factory-god-class. Update Purpose after archive.
## Requirements
### Requirement: R1 Suggestions module home
`app/models/suggestions.ts` SHALL export the suggestion reject policy as module functions operating on a `RecipeOptimizerConfig`: `shouldPromptReject(config)`, `applyRejectChoice(config, recipeSlugs, choice)`, and `applyRejectSilent(config, recipeSlugs)`. The deny-recipes helper SHALL be module-internal (not exported). The corresponding `Factory` methods (`shouldPromptReject`, `applyRejectChoice`, `applyRejectSilent`, `_denyRecipes`) SHALL be deleted — no delegating facade remains — and all call sites SHALL invoke the module functions with `factory.optimizer`. The module SHALL NOT import the `Factory` class.

#### Scenario: R1.S1 Functions callable with a bare config
- **WHEN** a test calls the three exported functions with a `RecipeOptimizerConfig` object (no `Factory` instance constructed)
- **THEN** they execute correctly, and `suggestions.ts` contains no import from `./factory`

#### Scenario: R1.S2 Factory methods gone
- **WHEN** `factory.ts` is searched for `shouldPromptReject`, `applyRejectChoice`, `applyRejectSilent`, and `_denyRecipes`
- **THEN** none are defined there; components (`OptimizationSection`, `ProductionLineComponent`, etc.) import from `suggestions.ts`

### Requirement: R2 Reject policy semantics preserved
The moved functions SHALL preserve current behavior. `shouldPromptReject` returns true iff `config.rejectPrompt === "ask"`. `applyRejectChoice`: choice `"never"` sets `rejectPrompt` to `"never"` without denying; `"always"` sets `rejectPrompt` to `"always"` and denies the given slugs; `"yes"` denies without changing `rejectPrompt`; `"no"` changes nothing. `applyRejectSilent` denies the slugs only when `rejectPrompt === "always"`. Denying replaces `config.enabledRecipes` with a filtered copy excluding the slugs (the config object is mutated; the array is reassigned, not mutated in place), ignoring falsy slug entries. Neither function removes production lines — callers own removal.

#### Scenario: R2.S1 Choice matrix
- **WHEN** `applyRejectChoice` is called once per choice value against fresh configs containing the target slugs in `enabledRecipes`
- **THEN** `rejectPrompt` and `enabledRecipes` end in the states described above for each choice

#### Scenario: R2.S2 Silent reject honors remembered preference
- **WHEN** `applyRejectSilent` is called with `rejectPrompt` set to `"always"`, then to `"never"`, then to `"ask"`
- **THEN** slugs are removed from `enabledRecipes` only in the `"always"` case

#### Scenario: R2.S3 Falsy slugs ignored
- **WHEN** `applyRejectChoice(config, ["", validSlug], "yes")` runs
- **THEN** only `validSlug` is removed from `enabledRecipes`
