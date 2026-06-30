# Agentic Development Process

Agents MUST follow this development process for all changes, no matter how small. Begin as soon as the user requests to
make a change, before any investigation.

Agentic dev happens in eight phases:

1. Spec drafting
2. Spec review
3. Validation drafting
4. Validation review
5. Implementation planning
6. Implementation review
7. Implementation loop
8. Final review

All phase artifacts go under `plans/`. No session plan — artifacts live at `plans/<change name>`. Minor changes may
minimize each phase but must still run all eight.

## Spec Drafting

Define exactly what changes. Interview user, assume nothing. Bias toward small, compartmentalized specs. Break large
projects into individually verifiable tasks.

Spec lives at `plans/<change name>/spec.md`.

## Spec Review

Different agent from drafter. If same session, spawn subagent.

Reviewer reads spec cold, checks: ambiguity, missing edge cases, scope creep, arch conflicts. Output: concerns list or
approval. Unresolved concerns block next phase. Return to spec drafting and repeat review on unresolved concerns. Cannot
move to validation drafting until a review returns clean.

## Validation Drafting

Same agent as spec drafter.

Define acceptance criteria and test plan before any code. Interview user, assume nothing. Per spec requirement:

- What behavior gets verified
- Which test type (unit / integration / E2E) — see Tests section
- Pass condition

Write tests now. Fully writable tests go to `tests/` as failing stubs. Lock "done" definition before implementation
temptation.

Plan lives at `plans/<change name>/validation.md`.

## Validation Review

Same agent as spec reviewer.

Checks: all spec requirements covered, correct test types, no missing edge cases, no trivially-passing tests. Output:
concerns or approval. Unresolved concerns block implementation. Return to validation drafting to resolve concerns then
repeat review. Continue this loop until a review returns clean.

## Implementation Planning

Same agent as spec and validation drafter.

Write concrete plan of required code changes. Lives at `plans/<change name>/implementation.md`.

Include:

- Files to create or modify
- Existing functions/utilities to reuse (with paths)
- Change order and which steps are independently verifiable
- Schema migrations or data-format changes
- Known risks or side effects

No coding. Enough detail another agent could execute. Minor changes: one-paragraph plan.

## Implementation Review

Same agent as spec and validation reviewer.

Checks: all spec and validation requirements covered, correct frontend design, no outdated patterns, no code
anti-patterns. Use skills from modern-web-guidance@googlechrome and frontend-design@claude-plugins-official. Output:
concerns or approval. Unresolved concerns block implementation. Return to implementation planning to resolve concerns
then repeat review. Continue this loop until a review returns clean.

## Implementation Loop

Same agent that reviewed spec and validation. Create new git branch before any work.

Execute plan iteratively:

1. Smallest verifiable change
2. Run relevant tests (`npm run test:run` or specific file)
3. Fix failures before proceeding — no broken state accumulation
4. Full suite (`npm run test:run && npm run test:e2e`) before committing
5. Commit at logical checkpoints, not end

If major issues arise, hand off knowledge to planning agent to determine which phase to return to.

After all changes: full test suite (`npm run test:run && npm run test:e2e`), then `lighthouse_audit` if any UI changed.

## Final Review

Same agent as spec and validation drafter and implementation planner.

Execute the `/caveman:caveman-review` skill on all changes. Return to implementation loop to resolve concerns then
repeat review. Continue this loop until a review returns clean.
