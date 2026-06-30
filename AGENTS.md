# Satisfactory Planner

Next.js web app for planning factories in [Satisfactory](https://www.satisfactorygame.com/).

---

## ⚠ Development Process Required

The [Agentic Development Cycle](plans/agentic-dev-cycle.md) is **mandatory** for any material change:

- Feature development
- Bug fixes
- Refactors
- Any change to application code or tests

**Read-only investigation** (e.g., "why is this behavior occurring?", "where is X defined?") does **not** require the process.

**If unsure** whether a prompt will lead to material changes, ask the user: *"Should I follow the development process for this?"* before proceeding.

Eight mandatory phases — all artifacts under `plans/<change-name>/`:

1. **Spec drafting** → `spec.md` (interview user, define scope)
2. **Spec review** → subagent cold-reads, blocks on unresolved concerns
3. **Validation drafting** → `validation.md` + failing test stubs in `tests/`
4. **Validation review** → subagent checks coverage, blocks on gaps
5. **Implementation planning** → `implementation.md` (files, order, risks — no code yet)
6. **Implementation review** → subagent checks plan; run `modern-web-guidance` + `frontend-design` skills
7. **Implementation loop** → new git branch; smallest change → test → fix → repeat; full suite before commit
8. **Final review** → `/caveman:caveman-review` on all changes; fix concerns; repeat until clean

Full test suite (`npm run test:run && npm run test:e2e`) and `lighthouse_audit` before calling any UI change done.

---

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

Core hierarchy: `Factory → ProductionLine → AssemblyLine → RecipeLike`

- **`Factory`** (`app/models/factory.tsx`): Top-level container. Holds `ProductionLine[]`, maintains rate/lookup indexes (`rateLookup`, `_assemblyLineLookup`, `_productionLineLookup`), owns LP solver (`autoCalculateRates()`). `Factory.update()` injected by `FactoryComponent` at mount.
- **`ProductionLine`** (`app/models/production-line.tsx`): One per output part. Tracks `rate`, `outputRate` (desired export), `autoCalculateRate`, `autoCreated` flags.
- **`AssemblyLine`** (`app/models/assembly-line.tsx`): One per recipe within production line. Holds `rate`, `machineSpeed`, `powerShards`, `sloopedSlots`, `allowRemainder`.
- **`RecipeLike`** (`app/models/recipe-like.ts`): Interface satisfied by `Recipe` (game recipe) and `FactoryRecipe` (supplier factory). Distinguish via `isFactoryRecipe` flag.

## State management pattern

`FactoryComponent` stores `factory` in **`useRef`** (not `useState`) with version counter for re-renders:

```ts
const factoryRef = useRef<Factory>(new Factory());
const factory = factoryRef.current;
const [, setVersion] = useState(0);
// factory.update is set to: () => setVersion(v => v + 1)
```

Never mutate `Factory` directly without `factory.update()` after — shallow-clones state, triggers React reconciliation.

## Rate units and Somersloop math

- Solids: items/min; Fluids: m³/min
- Use `assemblyLine.getPartProductionRate()` / `getPartConsumptionRate()` not `AssemblyLine.rate` directly. Somersloops halve machine rate, double output; `getSloopMultiplier()` encapsulates.

## Static game data

`app/models/library.tsx` loads `app/models/data.json` at module init, exports:

- `parts`, `partLookup` (by className), `partSlugLookup`
- `buildings`, `buildingLookup`
- `recipes`, `recipeLookup` (partSlug → Recipe[])

`recipeLookup` primary way to find recipes producing a given part.

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
- `a11y` rules disabled in Biome config.
- One exported component per file in `app/components/`; internal sub-components in own files.

### Naming conventions

| Thing               | Convention           | Example                                          |
| ------------------- | -------------------- | ------------------------------------------------ |
| Component files     | PascalCase           | `AssemblyLineComponent.tsx`                      |
| Model/service files | kebab-case           | `assembly-line.tsx`, `storage-service.ts`        |
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
