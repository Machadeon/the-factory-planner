import {
  emptyLibrary,
  type FactoryFolder,
  generateId,
  type SerializedFactory,
  type StorageLibrary,
} from "./factory-storage";

const KEY_CONSENT = "sfp:consent";
const KEY_LIBRARY = "sfp:library";
const KEY_AUTOSAVE = "sfp:autosave";
const KEY_CURRENT = "sfp:current";
const KEY_AUTOSAVE_PREF = "sfp:autosave-pref";

export function hasConsent(): boolean {
  try {
    return localStorage.getItem(KEY_CONSENT) === "true";
  } catch {
    return false;
  }
}

export function grantConsent(): void {
  localStorage.setItem(KEY_CONSENT, "true");
}

export function loadLibrary(): StorageLibrary {
  try {
    const raw = localStorage.getItem(KEY_LIBRARY);
    if (!raw) return emptyLibrary();
    return JSON.parse(raw) as StorageLibrary;
  } catch {
    return emptyLibrary();
  }
}

export function saveLibrary(library: StorageLibrary): void {
  localStorage.setItem(KEY_LIBRARY, JSON.stringify(library));
}

export function writeAutosave(factory: SerializedFactory): void {
  try {
    localStorage.setItem(KEY_AUTOSAVE, JSON.stringify(factory));
  } catch {
    // quota exceeded — silently ignore
  }
}

export function readAutosave(): SerializedFactory | null {
  try {
    const raw = localStorage.getItem(KEY_AUTOSAVE);
    if (!raw) return null;
    return JSON.parse(raw) as SerializedFactory;
  } catch {
    return null;
  }
}

export function clearAutosave(): void {
  localStorage.removeItem(KEY_AUTOSAVE);
}

export function setCurrentFactoryId(id: string): void {
  localStorage.setItem(KEY_CURRENT, id);
}

export function getCurrentFactoryId(): string | null {
  try {
    return localStorage.getItem(KEY_CURRENT);
  } catch {
    return null;
  }
}

export function clearCurrentFactoryId(): void {
  localStorage.removeItem(KEY_CURRENT);
}

export function getAutosavePref(): boolean {
  try {
    const val = localStorage.getItem(KEY_AUTOSAVE_PREF);
    return val === null ? true : val === "true";
  } catch {
    return true;
  }
}

export function setAutosavePref(enabled: boolean): void {
  localStorage.setItem(KEY_AUTOSAVE_PREF, String(enabled));
}

// --- Library CRUD helpers (pure — callers must call saveLibrary) ---

export function addFactory(
  lib: StorageLibrary,
  factory: SerializedFactory,
): StorageLibrary {
  return { ...lib, factories: [...lib.factories, factory] };
}

export function updateFactory(
  lib: StorageLibrary,
  factory: SerializedFactory,
): StorageLibrary {
  return {
    ...lib,
    factories: lib.factories.map((f) => (f.id === factory.id ? factory : f)),
  };
}

export function removeFactory(lib: StorageLibrary, id: string): StorageLibrary {
  return { ...lib, factories: lib.factories.filter((f) => f.id !== id) };
}

export function addFolder(
  lib: StorageLibrary,
  name: string,
  parentId: string | null,
): { lib: StorageLibrary; folder: FactoryFolder } {
  const folder: FactoryFolder = {
    id: generateId(),
    name,
    parentId,
    createdAt: new Date().toISOString(),
  };
  return { lib: { ...lib, folders: [...lib.folders, folder] }, folder };
}

export function renameFolder(
  lib: StorageLibrary,
  id: string,
  name: string,
): StorageLibrary {
  return {
    ...lib,
    folders: lib.folders.map((f) => (f.id === id ? { ...f, name } : f)),
  };
}

export function removeFolder(lib: StorageLibrary, id: string): StorageLibrary {
  const deletedFolderIds = new Set<string>();
  const queue = [id];
  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) break;
    deletedFolderIds.add(current);
    for (const f of lib.folders) {
      if (f.parentId === current) queue.push(f.id);
    }
  }
  return {
    ...lib,
    folders: lib.folders.filter((f) => !deletedFolderIds.has(f.id)),
    factories: lib.factories.filter(
      (f) => f.folderId === null || !deletedFolderIds.has(f.folderId),
    ),
  };
}

export function moveFactory(
  lib: StorageLibrary,
  factoryId: string,
  folderId: string | null,
): StorageLibrary {
  return {
    ...lib,
    factories: lib.factories.map((f) =>
      f.id === factoryId ? { ...f, folderId } : f,
    ),
  };
}

export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
