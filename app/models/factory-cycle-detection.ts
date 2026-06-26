import type { SerializedFactory } from "./factory-storage";

export function wouldCreateCycle(
  hostId: string,
  candidateId: string,
  factories: SerializedFactory[],
): boolean {
  const visited = new Set<string>();
  const factoryIndex = new Map(factories.map((f) => [f.id, f]));

  function dfs(id: string): boolean {
    if (id === hostId) return true;
    if (visited.has(id)) return false;
    visited.add(id);
    const f = factoryIndex.get(id);
    if (!f) return false;
    for (const pl of f.productionLines) {
      for (const al of pl.assemblyLines) {
        if (al.nestedFactoryId && dfs(al.nestedFactoryId)) return true;
      }
    }
    for (const supplierId of f.supplierIds ?? []) {
      if (dfs(supplierId)) return true;
    }
    return false;
  }

  return dfs(candidateId);
}
