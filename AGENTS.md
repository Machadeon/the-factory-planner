# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Satisfactory Planner

A Next.js web app for planning production factories in the game [Satisfactory](https://www.satisfactorygame.com/).

## Development commands

```bash
npm run dev          # start dev server (localhost:3000)
npm run build        # production build
npm run lint-fix     # auto-fix Biome findings (always before commit)
npm run test         # watch mode unit tests (vitest)
npm run test:run     # one-shot unit tests
npm run test:e2e     # Playwright E2E tests (requires running dev server)

# Run a single unit test file
npx vitest run tests/unit/utils.test.ts

# Run a single Playwright test file
npx playwright test tests/e2e/seed.spec.ts
```

## Domain model

The core hierarchy: `Factory → ProductionLine → AssemblyLine → RecipeLike`

- **`Factory`** (`app/models/factory.tsx`): Top-level container. Holds `ProductionLine[]`, maintains rate/lookup indexes (`rateLookup`, `_assemblyLineLookup`, `_productionLineLookup`), and owns the LP solver (`autoCalculateRates()`). `Factory.update()` is injected by `FactoryComponent` at mount time.
- **`ProductionLine`** (`app/models/production-line.tsx`): One per output part. Tracks `rate` (total production), `outputRate` (desired factory export), `autoCalculateRate`, and `autoCreated` flags.
- **`AssemblyLine`** (`app/models/assembly-line.tsx`): One per recipe within a production line. Holds `rate` (recipe completions/min), `machineSpeed`, `powerShards`, `sloopedSlots`, `allowRemainder`.
- **`RecipeLike`** (`app/models/recipe-like.ts`): Interface satisfied by both `Recipe` (game recipe) and `FactoryRecipe` (another factory used as a supplier). Distinguish with the `isFactoryRecipe` flag.

## State management pattern

`FactoryComponent` stores `factory` in a **`useRef`** (not `useState`) alongside a version counter for re-renders:

```ts
const factoryRef = useRef<Factory>(new Factory());
const factory = factoryRef.current;
const [, setVersion] = useState(0);
// factory.update is set to: () => setVersion(v => v + 1)
```

Never mutate `Factory` directly without calling `factory.update()` afterward — it shallow-clones internal state and triggers React reconciliation.

## Rate units and Somersloop math

- Solids: items/min; Fluids: m³/min
- Always use `assemblyLine.getPartProductionRate()` / `getPartConsumptionRate()` rather than reading `AssemblyLine.rate` directly. Somersloops halve the machine rate while doubling output; `getSloopMultiplier()` encapsulates this.

## Static game data

`app/models/library.tsx` loads `app/models/data.json` at module init and exports:
- `parts`, `partLookup` (by className), `partSlugLookup`
- `buildings`, `buildingLookup`
- `recipes`, `recipeLookup` (partSlug → Recipe[])

`recipeLookup` is the primary way to find what recipes can produce a given part.

## Storage layer

`app/models/storage-service.ts` uses localStorage (all keys prefixed `sfp:`). Consent is gated via `sfp:consent`. The library format (`StorageLibrary`) holds `folders` and `factories` at `schemaVersion` 2. `factory-storage.ts` owns serialization, deserialization, and migration logic. Nested factories are inlined into assembly lines during serialization.

## Tests

- **Unit tests** (`tests/unit/`): vitest + jsdom, for models and utils.
- **Integration tests** (`tests/integration/`): vitest + jsdom + React Testing Library, for components.
- **E2E tests** (`tests/e2e/`): Playwright browser tests. Run dev server first.
- **Bug fixes**: Always add a regression test before fixing. Choose the test type by what broke:
  - **Unit** (`tests/unit/`): model or utility logic (e.g. rate calculation, serialization)
  - **Integration** (`tests/integration/`): component behavior, user interactions, React state (e.g. a button that didn't update the UI correctly)
  - **E2E** (`tests/e2e/`): multi-step flows, localStorage persistence, drawer/dialog lifecycle, or anything that requires a real browser

## MCP Servers & Performance Profiling

Two MCP servers are configured in `.mcp.json`:

### Playwright Test Server
- `test_run`, `test_debug` — Run and debug tests
- `browser_*` — Browser automation (click, navigate, type, snapshot, verify, wait_for)
- `start_tracing`, `stop_tracing` — Record performance traces

### Chrome DevTools Server (primary tool for performance analysis)

**Performance & profiling:**
- `lighthouse_audit` — Quick Core Web Vitals & best-practices check (LCP, CLS, INP scores + diagnostics)
- `performance_start_trace` / `performance_stop_trace` / `performance_analyze_insight` — Profile a specific interaction (start trace → perform action → stop trace → get AI insights on bottlenecks)

**Debugging & inspection:**
- `list_network_requests` / `get_network_request` — Inspect HTTP timing
- `list_console_messages` — View logs & errors
- `take_screenshot` — Capture visual state
- `evaluate_script` — Execute JS to inspect state or DOM
- `click`, `type_text`, `fill_form` — User interactions
- `wait_for` — Wait for conditions

**Typical workflows:**
1. **Quick regression check**: lighthouse_audit
2. **Slow interaction**: performance_start_trace → perform action → performance_stop_trace → performance_analyze_insight
3. **Layout thrashing/animation loop** (e.g., drawer bug): trace + analyze for repeated reflows, requestAnimationFrame chains, excessive re-renders
4. **Network delays**: list_network_requests → get_network_request
5. **Errors/state**: list_console_messages → evaluate_script

## Code style

- Biome enforces formatting/linting; run `npm run lint-fix` before committing.
- No comments unless the why is non-obvious.
- `a11y` rules are disabled in Biome config.
- One exported component per file in `app/components/`; internal sub-components in their own files.

## LP solver (two-phase)

`Factory.autoCalculateRates()` runs a two-phase LP via `javascript-lp-solver`:

1. **Phase 1**: Strict intermediate balancing — intermediates constrained to zero net, raw inputs maximized.
2. **Phase 2** (if Phase 1 infeasible): Slack variables absorb intermediate surplus/deficit, minimizing imbalance. Reports imbalanced parts in `factory.solverError`.

Known issues:
- Recycled rubber/plastic loop (`recipe-alternate-plastic-1-c` + `recipe-alternate-recycledrubber-c`) is circular — skipped with a console warning.
- Water excluded from minimization by design.
- Infeasible results set `factory.solverError` to a descriptive message.
