import AssemblyLine, {
  DEFAULT_ROW_SPACING,
  shardsForClock,
} from "./assembly-line";
import Factory, { type PartConstraint } from "./factory";
import FactoryRecipe, { factoryRecipeId } from "./factory-recipe";
import { partSlugLookup, recipeSlugLookup } from "./game-data";
import {
  type AvailablePart,
  defaultRecipeOptimizerConfig,
  type RecipeOptimizerConfig,
} from "./optimizer-config";
import ProductionLine from "./production-line";

export interface SerializedAssemblyLine {
  id?: string;
  rows?: number;
  rowSpacing?: number;
  recipeSlug?: string;
  nestedFactoryId?: string;
  /**
   * @deprecated Schema <= 3 embedded the full nested factory here. Current saves
   * reference factories by `nestedFactoryId` only; `migrateLibrary` extracts any
   * embedded copies into independent library entries. Kept optional so legacy
   * files and bundles can still be read.
   */
  nestedFactoryData?: SerializedFactory;
  rate: number;
  sloopedSlots: number;
  machineSpeed: number;
  allowRemainder: boolean;
  autoCreated?: boolean;
}

export interface SerializedProductionLine {
  partSlug: string;
  rate: number;
  outputRate: number;
  autoCalculateRate: boolean;
  autoCreated: boolean;
  maximizeOutput?: boolean;
  assemblyLines: SerializedAssemblyLine[];
}

export interface SerializedFactory {
  schemaVersion: number;
  id: string;
  slug?: string;
  name: string;
  folderId: string | null;
  icon?: string;
  autoAddProductLines: boolean;
  productionLines: SerializedProductionLine[];
  supplierIds?: string[];
  constraints?: PartConstraint[];
  optimizer?: RecipeOptimizerConfig;
  graphLayout?: Record<string, { x: number; y: number }>;
  partPointOverrides?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface FactoryFolder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

export interface StorageLibrary {
  schemaVersion: number;
  folders: FactoryFolder[];
  factories: SerializedFactory[];
  partPointOverrides?: Record<string, number>;
  /**
   * Only set on exported bundles: the id of the factory the bundle was exported
   * for. Lets import auto-load that factory instead of just opening the library.
   * Absent on the persisted library.
   */
  rootId?: string;
}

export const CURRENT_SCHEMA_VERSION = 5;

export function generateId(): string {
  return crypto.randomUUID();
}

export function emptyLibrary(): StorageLibrary {
  return { schemaVersion: CURRENT_SCHEMA_VERSION, folders: [], factories: [] };
}

/** Ids of factories referenced (nested recipe or supplier) by `f`. */
export function directDependencyIds(f: SerializedFactory): string[] {
  const ids: string[] = [];
  for (const pl of f.productionLines) {
    for (const al of pl.assemblyLines) {
      if (al.nestedFactoryId) ids.push(al.nestedFactoryId);
    }
  }
  for (const sid of f.supplierIds ?? []) ids.push(sid);
  return ids;
}

/**
 * Collect `root` plus every factory it transitively references (by id) from
 * `library`, producing a self-contained set for export. Missing references are
 * skipped. The returned array starts with `root`.
 */
export function collectFactoryBundle(
  root: SerializedFactory,
  library: StorageLibrary,
): SerializedFactory[] {
  const byId = new Map(library.factories.map((f) => [f.id, f]));
  const out = new Map<string, SerializedFactory>([[root.id, root]]);
  const queue = [root];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    for (const depId of directDependencyIds(current)) {
      if (out.has(depId)) continue;
      const dep = byId.get(depId);
      if (!dep) continue;
      out.set(depId, dep);
      queue.push(dep);
    }
  }
  return [...out.values()];
}

export function generateSlug(name: string, existingSlugs: string[]): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "factory";
  if (!existingSlugs.includes(base)) return base;
  let i = 2;
  while (existingSlugs.includes(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

export function serializeFactory(
  factory: Factory,
  meta: {
    id: string;
    slug?: string;
    name: string;
    folderId: string | null;
    createdAt: string;
    updatedAt: string;
  },
): SerializedFactory {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: meta.id,
    slug: meta.slug,
    name: meta.name,
    folderId: meta.folderId,
    icon: factory.icon,
    autoAddProductLines: factory.autoAddProductLines,
    supplierIds:
      factory.supplierFactories.length > 0
        ? factory.supplierFactories.map((fr) => factoryRecipeId(fr.slug))
        : undefined,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
    constraints:
      factory.constraints.length > 0 ? factory.constraints : undefined,
    optimizer: factory.optimizer,
    graphLayout:
      Object.keys(factory.graphLayout).length > 0
        ? factory.graphLayout
        : undefined,
    partPointOverrides:
      Object.keys(factory.partPointOverrides).length > 0
        ? factory.partPointOverrides
        : undefined,
    productionLines: factory.productionLines.map((pl) => ({
      partSlug: pl.part.slug,
      rate: pl.rate,
      outputRate: pl.outputRate,
      autoCalculateRate: pl.autoCalculateRate,
      autoCreated: pl.autoCreated,
      maximizeOutput: pl.maximizeOutput || undefined,
      assemblyLines: pl.assemblyLines.map((al) => {
        if (al.recipe.isFactoryRecipe) {
          // Reference the nested factory by id only — it lives as its own
          // independent library entry, not embedded here.
          const nestedId = factoryRecipeId(al.recipe.slug);
          return {
            id: al.id,
            rows: al.rows > 0 ? al.rows : undefined,
            nestedFactoryId: nestedId,
            rate: al.rate,
            sloopedSlots: 0,
            machineSpeed: al.machineSpeed,
            allowRemainder: al.allowRemainder,
            autoCreated: al.autoCreated || undefined,
          };
        }
        return {
          id: al.id,
          rows: al.rows > 0 ? al.rows : undefined,
          rowSpacing:
            al.rowSpacing !== DEFAULT_ROW_SPACING ? al.rowSpacing : undefined,
          recipeSlug: al.recipe.slug,
          rate: al.rate,
          sloopedSlots: al.sloopedSlots,
          machineSpeed: al.machineSpeed,
          allowRemainder: al.allowRemainder,
          autoCreated: al.autoCreated || undefined,
        };
      }),
    })),
  };
}

// optimizer is unreleased, but tolerate an older availableParts shape (string[])
// and missing fields by merging onto the current defaults.
function normalizeRecipeOptimizer(
  raw: RecipeOptimizerConfig | undefined,
): RecipeOptimizerConfig {
  const base = defaultRecipeOptimizerConfig();
  if (!raw) return base;
  const rawParts = (raw.availableParts ?? []) as unknown as (
    | string
    | AvailablePart
  )[];
  const availableParts = rawParts.map((p) =>
    typeof p === "string" ? { partSlug: p, rate: 0 } : p,
  );
  return { ...base, ...raw, availableParts };
}

// When a cycle is detected, deserialize the factory using only its standard
// recipe assembly lines (no nested factory links) to break the recursion while
// still providing usable output rates.
function deserializeFactoryStub(data: SerializedFactory): Factory {
  const factory = new Factory();
  factory.icon = data.icon;
  factory.autoAddProductLines = data.autoAddProductLines;
  factory.constraints = data.constraints ?? [];
  factory.optimizer = normalizeRecipeOptimizer(data.optimizer);
  factory.graphLayout = data.graphLayout ?? {};
  factory.partPointOverrides = data.partPointOverrides ?? {};
  for (const plData of data.productionLines) {
    const part = partSlugLookup[plData.partSlug];
    if (!part) continue;
    const pl = new ProductionLine(
      part,
      plData.rate,
      plData.outputRate,
      plData.autoCalculateRate,
      plData.autoCreated,
    );
    pl.maximizeOutput = plData.maximizeOutput ?? false;
    for (const alData of plData.assemblyLines) {
      if (alData.nestedFactoryId || !alData.recipeSlug) continue;
      const recipe = recipeSlugLookup[alData.recipeSlug];
      if (!recipe) continue;
      pl.assemblyLines.push(
        new AssemblyLine({
          recipe,
          rate: alData.rate,
          sloopedSlots: alData.sloopedSlots,
          machineSpeed: alData.machineSpeed,
          powerShards: shardsForClock(alData.machineSpeed),
          allowRemainder: alData.allowRemainder,
          autoCreated: alData.autoCreated ?? false,
          id: alData.id ?? generateId(),
          rows: alData.rows ?? 0,
          rowSpacing: alData.rowSpacing ?? DEFAULT_ROW_SPACING,
        }),
      );
    }
    factory.productionLines.push(pl);
  }
  factory._updateRates();
  return factory;
}

// biome-ignore lint/suspicious/noExplicitAny: migration operates on untyped raw JSON
function migrateAssemblyLineRaw(al: any): SerializedAssemblyLine {
  const result = { ...al };
  if ("slooped" in result && !("sloopedSlots" in result)) {
    result.sloopedSlots = result.slooped ? 1 : 0;
  }
  delete result.slooped;
  if (!("machineSpeed" in result)) result.machineSpeed = 100;
  if (!("allowRemainder" in result)) result.allowRemainder = true;
  // Schema <= 3 embedded the nested factory; recover the id reference and drop
  // the embedded copy (it's been hoisted to an independent library entry).
  if (result.nestedFactoryData && !result.nestedFactoryId) {
    result.nestedFactoryId = result.nestedFactoryData.id;
  }
  delete result.nestedFactoryData;
  return result as SerializedAssemblyLine;
}

// biome-ignore lint/suspicious/noExplicitAny: migration operates on untyped raw JSON
function migrateSerializedFactoryRaw(f: any): SerializedFactory {
  return {
    ...f,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    // biome-ignore lint/suspicious/noExplicitAny: migration operates on untyped raw JSON
    productionLines: (f.productionLines ?? []).map((pl: any) => ({
      ...pl,
      assemblyLines: (pl.assemblyLines ?? []).map(migrateAssemblyLineRaw),
    })),
  };
}

// Recursively gather every factory embedded via `nestedFactoryData` (schema <= 3)
// into `acc`, keyed by id. Does not overwrite ids already present, so callers can
// seed higher-precedence entries first.
// biome-ignore lint/suspicious/noExplicitAny: migration operates on untyped raw JSON
function collectEmbeddedFactories(f: any, acc: Map<string, any>): void {
  for (const pl of f.productionLines ?? []) {
    for (const al of pl.assemblyLines ?? []) {
      const nested = al.nestedFactoryData;
      if (nested?.id != null) {
        if (!acc.has(nested.id)) acc.set(nested.id, nested);
        collectEmbeddedFactories(nested, acc);
      }
    }
  }
}

// biome-ignore lint/suspicious/noExplicitAny: migration operates on untyped raw JSON
export function migrateLibrary(raw: any): StorageLibrary {
  // biome-ignore lint/suspicious/noExplicitAny: migration operates on untyped raw JSON
  const topLevel: any[] = raw.factories ?? [];
  // Hoist embedded factories to independent entries. Top-level entries are the
  // source of truth, so seed them last to override any embedded copy.
  // biome-ignore lint/suspicious/noExplicitAny: migration operates on untyped raw JSON
  const byId = new Map<string, any>();
  for (const f of topLevel) collectEmbeddedFactories(f, byId);
  for (const f of topLevel) byId.set(f.id, f);

  return {
    ...raw,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    folders: raw.folders ?? [],
    factories: [...byId.values()].map(migrateSerializedFactoryRaw),
  };
}

export function deserializeFactory(
  data: SerializedFactory,
  library?: StorageLibrary,
  _visiting: Set<string> = new Set(),
): Factory | null {
  if (_visiting.has(data.id)) {
    return deserializeFactoryStub(data);
  }
  _visiting.add(data.id);
  const factory = new Factory();
  factory.icon = data.icon;
  factory.autoAddProductLines = data.autoAddProductLines;
  factory.constraints = data.constraints ?? [];
  factory.optimizer = normalizeRecipeOptimizer(data.optimizer);
  factory.graphLayout = data.graphLayout ?? {};
  factory.partPointOverrides = data.partPointOverrides ?? {};

  for (const plData of data.productionLines) {
    const part = partSlugLookup[plData.partSlug];
    if (!part) {
      console.warn(
        `[deserialize] Unknown part slug: ${plData.partSlug}, skipping production line`,
      );
      continue;
    }

    const pl = new ProductionLine(
      part,
      plData.rate,
      plData.outputRate,
      plData.autoCalculateRate,
      plData.autoCreated,
    );
    pl.maximizeOutput = plData.maximizeOutput ?? false;

    for (const alData of plData.assemblyLines) {
      if (alData.nestedFactoryId) {
        const nestedSerialized =
          library?.factories.find((f) => f.id === alData.nestedFactoryId) ??
          alData.nestedFactoryData;
        if (!nestedSerialized) {
          console.warn(
            `[deserialize] Nested factory not found: ${alData.nestedFactoryId}, skipping assembly line`,
          );
          continue;
        }
        const nestedFactory = deserializeFactory(
          nestedSerialized,
          library,
          new Set(_visiting),
        );
        if (!nestedFactory) {
          console.warn(
            `[deserialize] Failed to deserialize nested factory: ${alData.nestedFactoryId}, skipping assembly line`,
          );
          continue;
        }
        const fr = new FactoryRecipe(
          alData.nestedFactoryId,
          nestedSerialized.name,
          nestedFactory,
        );
        pl.assemblyLines.push(
          new AssemblyLine({
            recipe: fr,
            rate: alData.rate,
            sloopedSlots: 0,
            machineSpeed: alData.machineSpeed,
            powerShards: shardsForClock(alData.machineSpeed),
            allowRemainder: alData.allowRemainder,
            autoCreated: alData.autoCreated ?? false,
            id: alData.id ?? generateId(),
            rows: alData.rows ?? 0,
            rowSpacing: alData.rowSpacing ?? DEFAULT_ROW_SPACING,
          }),
        );
        continue;
      }

      if (!alData.recipeSlug) {
        console.warn(
          "[deserialize] Assembly line has neither recipeSlug nor nestedFactoryId, skipping",
        );
        continue;
      }
      const recipe = recipeSlugLookup[alData.recipeSlug];
      if (!recipe) {
        console.warn(
          `[deserialize] Unknown recipe slug: ${alData.recipeSlug}, skipping assembly line`,
        );
        continue;
      }
      pl.assemblyLines.push(
        new AssemblyLine({
          recipe,
          rate: alData.rate,
          sloopedSlots: alData.sloopedSlots,
          machineSpeed: alData.machineSpeed,
          powerShards: shardsForClock(alData.machineSpeed),
          allowRemainder: alData.allowRemainder,
          autoCreated: alData.autoCreated ?? false,
          id: alData.id ?? generateId(),
          rows: alData.rows ?? 0,
          rowSpacing: alData.rowSpacing ?? DEFAULT_ROW_SPACING,
        }),
      );
    }

    factory.productionLines.push(pl);
  }

  if (factory.productionLines.length === 0 && data.productionLines.length > 0) {
    return null;
  }

  factory._updateRates();

  for (const supplierId of data.supplierIds ?? []) {
    const nestedSerialized = library?.factories.find(
      (f) => f.id === supplierId,
    );
    if (!nestedSerialized) {
      console.warn(
        `[deserialize] Supplier factory not found: ${supplierId}, skipping`,
      );
      continue;
    }
    const nestedFactory = deserializeFactory(
      nestedSerialized,
      library,
      new Set(_visiting),
    );
    if (!nestedFactory) {
      console.warn(
        `[deserialize] Failed to deserialize supplier factory: ${supplierId}, skipping`,
      );
      continue;
    }
    factory.supplierFactories.push(
      new FactoryRecipe(supplierId, nestedSerialized.name, nestedFactory),
    );
  }

  return factory;
}
