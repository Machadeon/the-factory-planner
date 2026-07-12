# Satisfactory Planner

Next.js web app for planning factories in [Satisfactory](https://www.satisfactorygame.com/).

---

## ⚠ Development Process Required

The OpenSpec `spec-driven-reviewed` schema is **mandatory** for any material change:

- Feature development
- Bug fixes
- Refactors
- Any change to application code or tests

**Read-only investigation** (e.g., "why is this behavior occurring?", "where is X defined?") does **not** require the process.

**If unsure** whether a prompt will lead to material changes, ask the user: *"Should I follow the development process for this?"* before proceeding.

### Artifact sequence — all artifacts under `openspec/changes/<change-name>/`

| Command | Artifact | Gate |
|---|---|---|
| `/opsx:new` | `proposal.md` | `/grill-me` before drafting |
| `/opsx:continue` | `specs/**/*.md` | `/grill-me` before drafting |
| `/opsx:continue` | `spec-review.md` | Subagent cold-read loop; BLOCKS until APPROVED |
| `/opsx:continue` | `design.md` | — |
| `/opsx:continue` | `design-review.md` | Subagent + `modern-web-guidance` + `frontend-design` + `caveman-review`; BLOCKS |
| `/opsx:continue` | `tasks.md` | Test stubs in Group 1 |
| `/opsx:continue` | `tasks-review.md` | Subagent + `caveman-review`; BLOCKS |
| `/opsx:apply` | *(implementation)* | Run stubs first, confirm failure; then implement |
| `/opsx:continue` | `review.md` | `caveman-review` on full diff; BLOCKS until APPROVED |
| `/opsx:archive` | *(archive)* | — |

All review artifacts are **append-only** — each pass adds a new section recording what was resolved and how. opsx:continue MUST NOT advance past a review artifact while its latest pass shows Status: CONCERNS.

---

## Development commands

```bash
npm run dev          # start dev server (localhost:3000)
npm run build        # production build
npm run lint-fix     # auto-fix Biome findings
npm run test         # watch mode unit tests (vitest)
npm run test:run     # one-shot unit tests
npm run test:e2e     # Playwright E2E tests (requires running dev server)

# Run a single unit test file
npx vitest run tests/unit/utils.test.ts

# Run a single Playwright test file
npx playwright test tests/e2e/seed.spec.ts
```

### Pre-commit verification (REQUIRED)

Before committing any changes, **must run and pass**:

```bash
make verify
```

This command runs:
- Biome formatting/linting check
- Unit test suite
- Build validation

Commit hooks enforce this automatically, but verify explicitly to catch issues early.

## Domain model

Core hierarchy: `Factory → ProductionLine → AssemblyLine → RecipeLike`

- **`Factory`** (`app/models/factory.ts`): Top-level container. Holds `ProductionLine[]`, maintains rate/lookup indexes (`rateLookup`, `_assemblyLineLookup`, `_productionLineLookup`), owns LP solver (`autoCalculateRates()`). `Factory.update()` injected by `FactoryComponent` at mount.
- **`ProductionLine`** (`app/models/production-line.ts`): One per output part. Tracks `rate`, `outputRate` (desired export), `autoCalculateRate`, `autoCreated` flags.
- **`AssemblyLine`** (`app/models/assembly-line.ts`): One per recipe within production line. Holds `rate`, `machineSpeed`, `powerShards`, `sloopedSlots`, `allowRemainder`.
- **`RecipeLike`** (`app/models/recipe-like.ts`): Interface satisfied by `Recipe` (game recipe) and `FactoryRecipe` (supplier factory). Distinguish via `isFactoryRecipe` flag.

## State management pattern (valtio + mutation contract)

The `Factory` graph is a mutable class model wrapped in a valtio `proxy` created once in `useFactorySession` (`proxy({ factory: new Factory() })`) and distributed via `FactoryContext`. There is no `update` field and no version counter — render notification is automatic: a mutation on the proxied graph publishes itself, and every `useSnapshot` consumer re-renders on the fields it read.

**Reads-from-snapshot / writes-to-proxy:**

- Components render from `useSnapshot(...)` / the context read hooks.
- Components mutate **only** through named model methods on the **proxy** (`factory.setClockSpeed(al, n)`, `factory.setConstraints(next)`, `factory.setOutputRate(pl, r)`, …). Never assign a model field from a component, never call `factory.update()` / `autoCalculateRates()` / `optimizeRecipes()` directly, and never mutate a `useSnapshot` result. Method arguments must be proxy-derived model refs (reached through the context proxy), not snapshot objects — a snapshot child is frozen and the write would no-op.
- Each mutator owns its recompute: rate-affecting mutators end with `_updateRates()` or a re-solve (`autoCalculateRates` / `optimizeRecipes` / `autoSetPartRate`); presentation mutators (`setIcon`, `setNodePosition`, `pruneGraphLayout`, `setAssemblyLineRows`/`RowSpacing`) skip recompute. Never add a rate-affecting mutator that leaves derived state stale.
- The standing tests in `tests/unit/mutation-contract.test.ts` fail CI if a component reintroduces a direct field write or recompute/solve call.
- Solver scratch (`_autoSetPartRateInProgress`) is the only `ref()`-exempt field; every derived lookup stays tracked so components (and future read accessors) remain reactive.

## Rate units and Somersloop math

- Solids: items/min; Fluids: m³/min
- Use `assemblyLine.getPartProductionRate()` / `getPartConsumptionRate()` not `AssemblyLine.rate` directly. Somersloops halve machine rate, double output; `getSloopMultiplier()` encapsulates.

## Static game data

`app/models/game-data/` loads `app/models/data.json` at module init:

- `constants.ts` — `rawResources`, `defaultResourceLimits`, `notAutomatable`, `syntheticSinkPoints`, `RATE_EPSILON`, `SOLVER_EQUALITY_FUDGE`
- `load.ts` — parts/buildings/base-recipe parsing; single `registerRecipe()` path
- `generator-recipes.ts` — synthetic burn-recipe generation
- `index.ts` — public barrel: `parts`, `partLookup` (by className), `partSlugLookup`, `buildings`, `buildingLookup`, `recipes`, `recipeLookup` (partSlug → Recipe[]), `recipeSlugLookup` (slug → Recipe)

`recipeLookup` primary way to find recipes producing a given part. Import from `@/app/models/game-data`; model files that `game-data` itself imports (e.g. `recipe.ts`) import `game-data/constants` directly to stay acyclic. Rate tolerance comparisons always use `RATE_EPSILON` — never literal epsilons.

## Storage layer

`app/models/storage-service.ts` uses localStorage (keys prefixed `sfp:`). Consent gated via `sfp:consent`. `StorageLibrary` holds `folders`, `factories` at `schemaVersion` 2. `factory-storage.ts` owns serialization, deserialization, migration. Nested factories inlined into assembly lines during serialization.

## Tests

- **Unit tests** (`tests/unit/`): vitest + jsdom for models and utils.
- **Integration tests** (`tests/integration/`): vitest + jsdom + React Testing Library for components.
- **E2E tests** (`tests/e2e/`): Playwright browser tests (run dev server first).
- **Bug fixes**: add regression test before fixing. Choose test type by what broke:
  - **Unit** (`tests/unit/`): model/utility logic (rate calculation, serialization)
  - **Integration** (`tests/integration/`): component behavior, user interactions, React state (button didn't update UI)
  - **E2E** (`tests/e2e/`): multi-step flows, localStorage persistence, drawer/dialog lifecycle, real browser needs.

## Test selectors

Every interactable UI element must have a stable handle for Playwright:

- Prefer `aria-label` on semantic elements (buttons, inputs, checkboxes) where the label is descriptive and stable.
- Use `data-testid` for elements that lack meaningful ARIA semantics or where the aria-label would be awkward.
- Never select by CSS class, element tag, or visible text in Playwright tests — these break on style/copy changes.

All Playwright tests must locate elements exclusively via these handles (e.g. `page.getByRole('button', { name: '...' })` or `page.getByTestId('...')`).

## MCP Servers & Performance Profiling

Two MCP servers in `.mcp.json`:

### Playwright Test Server

- `test_run`, `test_debug` — Run and debug tests
- `browser_*` — Browser automation (click, navigate, type, snapshot, verify, wait_for)
- `start_tracing`, `stop_tracing` — Record performance traces

### Chrome DevTools Server (performance analysis)

**Performance & profiling:**

- `lighthouse_audit` — Core Web Vitals & best-practices check (LCP, CLS, INP + diagnostics)
- `performance_start_trace` / `performance_stop_trace` / `performance_analyze_insight` — Profile interaction (start → perform action → stop → insights)

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
3. **Layout thrashing/animation loop** (drawer bug): trace + analyze repeated reflows, requestAnimationFrame chains, re-renders
4. **Network delays**: list_network_requests → get_network_request
5. **Errors/state**: list_console_messages → evaluate_script

## Code style

- Biome enforces formatting/linting; run `npm run lint-fix`.
- No comments unless why non-obvious.
- `a11y` rules are active (pre-commit biome hook enforces them); suppress only with a reasoned `biome-ignore` comment.
- One exported component per file in `app/components/`; internal sub-components in own files.

### Naming conventions

| Thing               | Convention           | Example                                          |
| ------------------- | -------------------- | ------------------------------------------------ |
| Component files     | PascalCase           | `AssemblyLineComponent.tsx`                      |
| Model/service files | kebab-case           | `assembly-line.ts`, `storage-service.ts`        |
| Functions           | camelCase            | `displayNum`, `serializeFactory`                 |
| Constants           | SCREAMING_SNAKE_CASE | `CURRENT_SCHEMA_VERSION`, `AUTOSAVE_DEBOUNCE_MS` |
| Props interfaces    | `XxxProps` suffix    | `AssemblyLineComponentProps`                     |

Use `interface` for plain data shapes. Use `class` for models with methods (`Factory`, `ProductionLine`, `AssemblyLine`).

### Error handling

- Storage ops: silent try/catch, return `null`/`undefined` on failure — never throw to callers.
- Deserialization: skip or stub missing references gracefully; tolerate missing fields by merging with defaults.
- Lookups: return `undefined` on miss; callers null-check, no exceptions expected.

## LP solver

`Factory.autoCalculateRates()` runs LP via `javascript-lp-solver`. Algorithm in method comments.
