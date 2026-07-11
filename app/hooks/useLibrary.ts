"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  FactoryFolder,
  SerializedFactory,
  StorageLibrary,
} from "../models/factory-storage";
import { generateId } from "../models/factory-storage";
import {
  addFactory,
  addFolder as addFolderToStorage,
  loadLibrary,
  moveFactory as moveFactoryInStorage,
  removeFactory,
  removeFolder,
  renameFolder as renameFolderInStorage,
  saveLibrary,
  updateFactory,
} from "../models/storage-service";

// Owns the StorageLibrary React state and pairs every persisting mutation
// with saveLibrary, so callers never hand-roll the set+save pair.
export default function useLibrary() {
  const [library, setLibrary] = useState<StorageLibrary>({
    schemaVersion: 1,
    folders: [],
    factories: [],
  });

  // addFolder needs the created folder back synchronously (D5), but
  // setLibrary's functional updater isn't invoked synchronously — this ref
  // gives addFolder a synchronous read of the latest library.
  const libraryRef = useRef(library);
  useEffect(() => {
    libraryRef.current = library;
  }, [library]);

  // Read storage into state and hand the fresh library back so callers can
  // use it synchronously (state updates are async).
  const reload = useCallback((): StorageLibrary => {
    const lib = loadLibrary();
    setLibrary(lib);
    return lib;
  }, []);

  const replaceLibrary = useCallback((lib: StorageLibrary) => {
    setLibrary(lib);
    saveLibrary(lib);
  }, []);

  const updatePartPointOverrides = useCallback(
    (overrides: Record<string, number>) => {
      setLibrary((prev) => {
        const next = { ...prev, partPointOverrides: overrides };
        saveLibrary(next);
        return next;
      });
    },
    [],
  );

  const renameFactory = useCallback((id: string, name: string) => {
    setLibrary((prev) => {
      const factory = prev.factories.find((f) => f.id === id);
      if (!factory) return prev;
      const next = updateFactory(prev, { ...factory, name });
      saveLibrary(next);
      return next;
    });
  }, []);

  const renameFolder = useCallback((id: string, name: string) => {
    setLibrary((prev) => {
      const next = renameFolderInStorage(prev, id, name);
      saveLibrary(next);
      return next;
    });
  }, []);

  const deleteFactory = useCallback((id: string) => {
    setLibrary((prev) => {
      const next = removeFactory(prev, id);
      saveLibrary(next);
      return next;
    });
  }, []);

  const deleteFolder = useCallback((id: string) => {
    setLibrary((prev) => {
      const next = removeFolder(prev, id);
      saveLibrary(next);
      return next;
    });
  }, []);

  const duplicateFactory = useCallback((factory: SerializedFactory) => {
    const now = new Date().toISOString();
    const dupe: SerializedFactory = {
      ...factory,
      id: generateId(),
      name: `${factory.name} (copy)`,
      createdAt: now,
      updatedAt: now,
    };
    setLibrary((prev) => {
      const next = addFactory(prev, dupe);
      saveLibrary(next);
      return next;
    });
  }, []);

  const addFolder = useCallback(
    (name: string, parentId: string | null): { folder: FactoryFolder } => {
      const { lib, folder } = addFolderToStorage(
        libraryRef.current,
        name,
        parentId,
      );
      libraryRef.current = lib;
      setLibrary(lib);
      saveLibrary(lib);
      return { folder };
    },
    [],
  );

  const moveFactory = useCallback(
    (factoryId: string, folderId: string | null) => {
      setLibrary((prev) => {
        const next = moveFactoryInStorage(prev, factoryId, folderId);
        saveLibrary(next);
        return next;
      });
    },
    [],
  );

  return {
    library,
    setLibrary,
    reload,
    replaceLibrary,
    updatePartPointOverrides,
    renameFactory,
    renameFolder,
    deleteFactory,
    deleteFolder,
    duplicateFactory,
    addFolder,
    moveFactory,
  };
}
