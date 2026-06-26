import AssemblyLine from "./assembly-line";
import Factory from "./factory";
import { partSlugLookup, recipes } from "./library";
import ProductionLine from "./production-line";

export interface SerializedAssemblyLine {
  recipeSlug: string;
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
): SerializedFactory {
  return {
    schemaVersion: 1,
    id: meta.id,
    name: meta.name,
    folderId: meta.folderId,
    icon: factory.icon,
    autoAddProductLines: factory.autoAddProductLines,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
    productionLines: factory.productionLines.map((pl) => ({
      partSlug: pl.part.slug,
      rate: pl.rate,
      outputRate: pl.outputRate,
      autoCalculateRate: pl.autoCalculateRate,
      autoCreated: pl.autoCreated,
      assemblyLines: pl.assemblyLines.map((al) => ({
        recipeSlug: al.recipe.slug,
        rate: al.rate,
        slooped: al.isSlooped(),
      })),
    })),
  };
}

const recipeSlugLookup: Record<string, import("./recipe").default> = {};
for (const recipe of recipes) {
  recipeSlugLookup[recipe.slug] = recipe;
}

export function deserializeFactory(data: SerializedFactory): Factory | null {
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
  return factory;
}
