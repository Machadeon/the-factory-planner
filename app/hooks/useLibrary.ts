"use client";

import { useCallback, useState } from "react";
import type { StorageLibrary } from "../models/factory-storage";
import { loadLibrary, saveLibrary } from "../models/storage-service";

// Owns the StorageLibrary React state and pairs every persisting mutation
// with saveLibrary, so callers never hand-roll the set+save pair.
export default function useLibrary() {
  const [library, setLibrary] = useState<StorageLibrary>({
    schemaVersion: 1,
    folders: [],
    factories: [],
  });

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

  return {
    library,
    setLibrary,
    reload,
    replaceLibrary,
    updatePartPointOverrides,
  };
}
