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

interface SerializedAssemblyLine {
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

interface SerializedProductionLine {
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

export const CURRENT_SCHEMA_VERSION = 1;

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

// Tolerate an older availableParts shape (string[]) and missing fields by
// merging onto the current defaults.
function normalizeRecipeOptimizer(
  raw:
    | (Omit<RecipeOptimizerConfig, "availableParts"> & {
        availableParts?: (string | AvailablePart)[];
      })
    | undefined,
): RecipeOptimizerConfig {
  const base = defaultRecipeOptimizerConfig();
  if (!raw) return base;
  const availableParts = (raw.availableParts ?? []).map((p) =>
    typeof p === "string" ? { partSlug: p, rate: 0 } : p,
  );
  return { ...base, ...raw, availableParts };
}

export function deserializeFactory(
  data: SerializedFactory,
  resolveNested: (id: string) => SerializedFactory | null = () => null,
  _visiting: Set<string> = new Set(),
): Factory | null {
  // A cycle through nested-factory or supplier references breaks by building
  // this occurrence in stub mode: every reference resolves to null (R2/R3 —
  // the same skip-with-warning path as any other unresolved reference), so
  // recursion terminates without a separate stub function.
  const resolve = _visiting.has(data.id) ? () => null : resolveNested;
  const visiting = new Set(_visiting).add(data.id);

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
        const nestedSerialized = resolve(alData.nestedFactoryId);
        if (!nestedSerialized) {
          console.warn(
            `[deserialize] Nested factory not found: ${alData.nestedFactoryId}, skipping assembly line`,
          );
          continue;
        }
        const nestedFactory = deserializeFactory(
          nestedSerialized,
          resolveNested,
          visiting,
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
    const nestedSerialized = resolve(supplierId);
    if (!nestedSerialized) {
      console.warn(
        `[deserialize] Supplier factory not found: ${supplierId}, skipping`,
      );
      continue;
    }
    const nestedFactory = deserializeFactory(
      nestedSerialized,
      resolveNested,
      visiting,
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
