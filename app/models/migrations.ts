import {
  CURRENT_SCHEMA_VERSION,
  generateId,
  type SerializedFactory,
  type StorageLibrary,
} from "./factory-storage";

// Reshape data on the way in: structural-shape normalization and
// import id-remapping. No per-schema-version repair logic — this project is
// pre-alpha with no persisted real-user libraries, so legacy field shapes
// (slooped rename, embedded nestedFactoryData hoisting) are not migrated;
// deserializeFactory's own tolerant skip/default handling covers them.

/**
 * Guarantees only structural shape on the output: `schemaVersion: 1`,
 * `folders`/`factories` default to `[]` when absent. Performs no field-level
 * rewrites.
 */
// biome-ignore lint/suspicious/noExplicitAny: operates on untyped raw JSON
export function migrateLibrary(raw: any): StorageLibrary {
  return {
    ...raw,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    folders: raw.folders ?? [],
    factories: raw.factories ?? [],
  };
}

// Pure import-merge logic. No React, no storage access — callers own
// persistence and UI side effects.

// Migrate incoming data (structural-shape guarantee only), then assign
// fresh ids while preserving every cross-reference (folder parent, supplier,
// nested recipe). Returns the remapped entries plus the id mapping.
export function remapImportedLibrary(data: StorageLibrary): {
  folders: StorageLibrary["folders"];
  factories: SerializedFactory[];
  idMap: Map<string, string>;
} {
  const migrated = migrateLibrary(data);
  const now = new Date().toISOString();
  const idMap = new Map<string, string>();
  for (const folder of migrated.folders) idMap.set(folder.id, generateId());
  for (const f of migrated.factories) idMap.set(f.id, generateId());

  const folders = migrated.folders.map((f) => ({
    ...f,
    id: idMap.get(f.id) ?? generateId(),
    parentId: f.parentId ? (idMap.get(f.parentId) ?? null) : null,
  }));
  const factories = migrated.factories.map((f) => ({
    ...f,
    id: idMap.get(f.id) ?? generateId(),
    folderId: f.folderId ? (idMap.get(f.folderId) ?? null) : null,
    supplierIds: f.supplierIds?.map((sid) => idMap.get(sid) ?? sid),
    createdAt: now,
    updatedAt: now,
    productionLines: f.productionLines.map((pl) => ({
      ...pl,
      assemblyLines: pl.assemblyLines.map((al) => ({
        ...al,
        nestedFactoryId: al.nestedFactoryId
          ? (idMap.get(al.nestedFactoryId) ?? al.nestedFactoryId)
          : undefined,
      })),
    })),
  }));
  return { folders, factories, idMap };
}

// Legacy single-factory files may embed nested factories via
// `nestedFactoryData`; that embedding is no longer hoisted into an
// independent entry (see migrateLibrary above) — the assembly line just
// passes through untouched and deserializeFactory skips it with a warning.
// No root resolved → import failed; caller persists and loads nothing.
export function mergeSingleFactory(
  current: StorageLibrary,
  data: SerializedFactory,
): { library: StorageLibrary; root?: SerializedFactory } {
  const { folders, factories, idMap } = remapImportedLibrary({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    folders: [],
    factories: [data],
  });
  const rootId = idMap.get(data.id);
  const root = factories.find((f) => f.id === rootId);
  const library: StorageLibrary = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    folders: [...current.folders, ...folders],
    factories: [...current.factories, ...factories],
  };
  if (!root) return { library: current };
  return { library, root };
}

// Exported bundles carry the root factory's id; plain libraries don't have
// one and the caller opens the drawer instead.
export function mergeLibrary(
  current: StorageLibrary,
  data: StorageLibrary,
): { library: StorageLibrary; root?: SerializedFactory } {
  const { folders, factories, idMap } = remapImportedLibrary(data);
  const library: StorageLibrary = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    folders: [...current.folders, ...folders],
    factories: [...current.factories, ...factories],
  };
  const newRootId = data.rootId ? idMap.get(data.rootId) : undefined;
  const root = newRootId
    ? factories.find((f) => f.id === newRootId)
    : undefined;
  return { library, root };
}
