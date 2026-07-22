"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "../components/ui/toast/ToastProvider";
import type {
  FactoryFolder,
  SerializedFactory,
  StorageLibrary,
} from "../models/factory-storage";
import { generateId } from "../models/factory-storage";
import {
  addFactory,
  addFolder as addFolderToStorage,
  estimateStorageBytes,
  LOCALSTORAGE_WARN_THRESHOLD_BYTES,
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
  const { show } = useToast();
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

  // One-shot-per-session quota-approaching warning (D-C3.3) — a ref so it
  // survives re-renders without re-triggering on every subsequent save.
  const warnedQuota = useRef(false);

  // Wraps saveLibrary with the failure toast (D-C3.2) and the quota warning
  // so every mutation callback below gets both for free. Persist failures
  // are surfaced but non-fatal: the in-memory library state (already
  // updated by the caller) is the source of truth for this session.
  const persist = useCallback(
    (lib: StorageLibrary): StorageLibrary => {
      const ok = saveLibrary(lib);
      if (!ok) {
        show({
          variant: "error",
          message:
            "Couldn't save your library — your browser's local storage may be full. Export a backup to avoid losing work.",
        });
      } else if (
        !warnedQuota.current &&
        estimateStorageBytes(lib) > LOCALSTORAGE_WARN_THRESHOLD_BYTES
      ) {
        warnedQuota.current = true;
        show({
          variant: "info",
          message:
            "Your factory library is approaching the browser storage limit. Consider exporting a backup.",
        });
      }
      return lib;
    },
    [show],
  );

  // Read storage into state and hand the fresh library back so callers can
  // use it synchronously (state updates are async).
  const reload = useCallback((): StorageLibrary => {
    const lib = loadLibrary();
    setLibrary(lib);
    return lib;
  }, []);

  const replaceLibrary = useCallback(
    (lib: StorageLibrary) => {
      setLibrary(lib);
      persist(lib);
    },
    [persist],
  );

  const updatePartPointOverrides = useCallback(
    (overrides: Record<string, number>) => {
      setLibrary((prev) => {
        const next = { ...prev, partPointOverrides: overrides };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const renameFactory = useCallback(
    (id: string, name: string) => {
      setLibrary((prev) => {
        const factory = prev.factories.find((f) => f.id === id);
        if (!factory) return prev;
        const next = updateFactory(prev, { ...factory, name });
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const renameFolder = useCallback(
    (id: string, name: string) => {
      setLibrary((prev) => {
        const next = renameFolderInStorage(prev, id, name);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const deleteFactory = useCallback(
    (id: string) => {
      setLibrary((prev) => {
        const next = removeFactory(prev, id);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const deleteFolder = useCallback(
    (id: string) => {
      setLibrary((prev) => {
        const next = removeFolder(prev, id);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const duplicateFactory = useCallback(
    (factory: SerializedFactory) => {
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
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const addFolder = useCallback(
    (name: string, parentId: string | null): { folder: FactoryFolder } => {
      const { lib, folder } = addFolderToStorage(
        libraryRef.current,
        name,
        parentId,
      );
      libraryRef.current = lib;
      setLibrary(lib);
      persist(lib);
      return { folder };
    },
    [persist],
  );

  const moveFactory = useCallback(
    (factoryId: string, folderId: string | null) => {
      setLibrary((prev) => {
        const next = moveFactoryInStorage(prev, factoryId, folderId);
        persist(next);
        return next;
      });
    },
    [persist],
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
