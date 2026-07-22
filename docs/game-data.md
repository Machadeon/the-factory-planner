# Game data (`app/models/data.json`)

## What it is

`app/models/data.json` is the single source of truth for every part, building,
recipe, generator, miner, resource, and schematic the planner knows about. It
is loaded once at module init by `app/models/game-data/load.ts` and exposed
through the `app/models/game-data` barrel (`parts`, `buildings`, `recipes`,
etc.) — see the "Static game data" section of `AGENTS.md` for the loading
architecture.

**Current contents** (checked 2026-07-21):

| Key | Count |
|---|---|
| `items` | 175 |
| `recipes` | 276 |
| `schematics` | 437 |
| `generators` | 4 |
| `resources` | 13 |
| `miners` | 5 |
| `buildings` | 16 |

File size: ~825KB / 26,191 lines.

## Which game version it reflects

**Unknown.** The repo's git history was searched (`git log --diff-filter=A -- app/models/data.json`
and the commit that later pruned it, `e3a8519`) and neither the initial
commit (`b8179d2`, "Theme and basic layout") nor the pruning commit records a
Satisfactory game/patch version, a source URL, or a generation tool. No
`docs.json`, `satisfactory-tools`, `ficsit`, or similar extractor reference
exists anywhere in the repository.

This is recorded here as an honest "unknown, predates this doc" rather than a
retroactively invented provenance chain. If a future contributor can confirm
the source (e.g. by diffing against a known Satisfactory Community Resources
`docs.json` dump for a specific game version), update this section with the
confirmed version and source.

## Regeneration

**No regeneration script exists in this repository.** `scripts/` contains
only `run-openspec-full.sh`, `verify-export.sh`, and `verify-library-split.sh`
— none of which touch `data.json`. Updating the data today is a fully manual
process: hand-edit `data.json` to match its existing shape (see
`app/models/game-data/load.ts` for the exact fields each section's parser
reads) and re-run `npm run test:run` — the unit/integration suite exercises
enough of the data (recipe lookups, part rate calculations) to catch obvious
shape mismatches, though it is not a formal schema validator.

**Presumed (unconfirmed) origin:** community Satisfactory data extracts are
typically sourced from the game's own `docs.json` (bundled with the game,
enumerated by tools like Satisfactory Tools / Satisfactory Calculator) via a
transform step that isn't present in this repo. This is a plausible guess
based on the shape of the data, not a confirmed fact — do not treat it as
provenance.

## Why this matters

Satisfactory game patches change recipe rates, add/remove parts, and
rebalance buildings. Because there is no recorded version or regeneration
procedure, a "the numbers look off" bug report should first ask "does
`data.json` still match the live game?" before assuming a bug in the LP
solver or rate math.
