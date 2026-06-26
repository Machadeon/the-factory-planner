import AssemblyLine from "./assembly-line";
import Factory from "./factory";
import FactoryRecipe from "./factory-recipe";
import { partSlugLookup, recipes } from "./library";
import ProductionLine from "./production-line";

export interface SerializedAssemblyLine {
  recipeSlug?: string;
  nestedFactoryId?: string;
  nestedFactoryData?: SerializedFactory;
  rate: number;
  slooped: boolean;
}

export interface SerializedProductionLine {
  partSlug: string;
  rate: number;
  outputRate: number;
  autoCalculateRate: boolean;
  autoCreated: boolean;
  assemblyLines: SerializedAssemblyLine[];
}

export interface SerializedFactory {
  schemaVersion: 1;
  id: string;
  name: string;
  folderId: string | null;
  icon?: string;
  autoAddProductLines: boolean;
  productionLines: SerializedProductionLine[];
  supplierIds?: string[];
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
  schemaVersion: 1;
  folders: FactoryFolder[];
  factories: SerializedFactory[];
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function emptyLibrary(): StorageLibrary {
  return { schemaVersion: 1, folders: [], factories: [] };
}

export function serializeFactory(
  factory: Factory,
  meta: {
    id: string;
    name: string;
    folderId: string | null;
    createdAt: string;
    updatedAt: string;
  },
  library?: StorageLibrary,
): SerializedFactory {
  return {
    schemaVersion: 1,
    id: meta.id,
    name: meta.name,
    folderId: meta.folderId,
    icon: factory.icon,
    autoAddProductLines: factory.autoAddProductLines,
    supplierIds:
      factory.supplierFactories.length > 0
        ? factory.supplierFactories.map((fr) =>
            fr.slug.slice("factory:".length),
          )
        : undefined,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
    productionLines: factory.productionLines.map((pl) => ({
      partSlug: pl.part.slug,
      rate: pl.rate,
      outputRate: pl.outputRate,
      autoCalculateRate: pl.autoCalculateRate,
      autoCreated: pl.autoCreated,
      assemblyLines: pl.assemblyLines.map((al) => {
        if (al.recipe.isFactoryRecipe) {
          const nestedId = al.recipe.slug.slice("factory:".length);
          return {
            nestedFactoryId: nestedId,
            nestedFactoryData: library?.factories.find(
              (f) => f.id === nestedId,
            ),
            rate: al.rate,
            slooped: false,
          };
        }
        return {
          recipeSlug: al.recipe.slug,
          rate: al.rate,
          slooped: al.isSlooped(),
        };
      }),
    })),
  };
}

const recipeSlugLookup: Record<string, import("./recipe").default> = {};
for (const recipe of recipes) {
  recipeSlugLookup[recipe.slug] = recipe;
}

// When a cycle is detected, deserialize the factory using only its standard
// recipe assembly lines (no nested factory links) to break the recursion while
// still providing usable output rates.
function deserializeFactoryStub(data: SerializedFactory): Factory {
  const factory = new Factory();
  factory.icon = data.icon;
  factory.autoAddProductLines = data.autoAddProductLines;
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
    pl.assemblyLines = [];
    for (const alData of plData.assemblyLines) {
      if (alData.nestedFactoryId || !alData.recipeSlug) continue;
      const recipe = recipeSlugLookup[alData.recipeSlug];
      if (!recipe) continue;
      pl.assemblyLines.push(new AssemblyLine(recipe, alData.rate, alData.slooped));
    }
    factory.productionLines.push(pl);
  }
  factory._updateRates();
  return factory;
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
    pl.assemblyLines = [];

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
        pl.assemblyLines.push(new AssemblyLine(fr, alData.rate, false));
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
        new AssemblyLine(recipe, alData.rate, alData.slooped),
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
