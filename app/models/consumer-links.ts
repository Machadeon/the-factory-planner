import type Factory from "./factory";
import type { StorageLibrary } from "./factory-storage";
import { deserializeFactory } from "./factory-storage";
import { RATE_EPSILON } from "./game-data";

/**
 * Consumer factories per output part: library factories whose supplierIds include
 * this factory, net-consuming one of its outputs. Shared by the logistics graph
 * model and the overview's Consumers section.
 */
export function deriveConsumers(
  factory: Factory,
  opts: { library?: StorageLibrary; currentFactoryId?: string | null },
): Map<string, { id: string; name: string; rate: number }[]> {
  const map = new Map<string, { id: string; name: string; rate: number }[]>();
  const { library, currentFactoryId } = opts;
  if (!library || !currentFactoryId) return map;
  const outputs = factory.allOutputs();
  for (const sf of library.factories) {
    if (!sf.supplierIds?.includes(currentFactoryId)) continue;
    const consumerFactory = deserializeFactory(sf, library);
    if (!consumerFactory) continue;
    for (const output of outputs) {
      const rate = consumerFactory.rateLookup[output.slug];
      if (!rate) continue;
      const net = rate.consumptionRate - rate.productionRate;
      if (net <= RATE_EPSILON) continue;
      const list = map.get(output.slug) ?? [];
      list.push({ id: sf.id, name: sf.name, rate: net });
      map.set(output.slug, list);
    }
  }
  return map;
}
