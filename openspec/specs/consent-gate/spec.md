# consent-gate

The storage-consent pending-action state machine, extracted to `app/hooks/useConsentGate.ts`.

## Requirements

### Requirement: R1 — requireConsent executes or defers
`requireConsent(action)` SHALL execute the action immediately when `hasConsent()` is true; otherwise it SHALL record the action as pending and open the consent dialog.

#### Scenario: R1.S1 — consent already granted
- **WHEN** `requireConsent` is called with consent present
- **THEN** the action runs synchronously and no dialog opens

#### Scenario: R1.S2 — consent absent
- **WHEN** `requireConsent` is called without consent
- **THEN** the consent dialog opens and the action does not run yet

#### Scenario: R1.S3 — re-entrant requireConsent replaces pending action
- **WHEN** `requireConsent(B)` is called while the dialog is already open with pending action A
- **THEN** B replaces A as the pending action (today's behavior); allow executes only B

### Requirement: R2 — allow replays the pending action
When the user allows, the hook SHALL close the dialog, signal the caller so freshly-consented storage can be read (today: reload the library), execute the pending action exactly once, and clear it.

#### Scenario: R2.S1 — pending action replay
- **WHEN** the user clicks allow after a deferred "save" action
- **THEN** the library is reloaded from storage and the save executes exactly once

### Requirement: R3 — cancel drops the pending action
When the user cancels, the hook SHALL close the dialog and discard the pending action without executing it.

#### Scenario: R3.S1 — cancel discards
- **WHEN** the user cancels the consent dialog with a pending action
- **THEN** the action never executes and a subsequent allow-less flow starts clean
