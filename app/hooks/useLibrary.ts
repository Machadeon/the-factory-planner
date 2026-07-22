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
  estimateStorageBytesFromString,
  LOCALSTORAGE_WARN_THRESHOLD_BYTES,
  loadLibrary,
  moveFactory as moveFactoryInStorage,
  removeFactory,
  removeFolder,
  renameFolder as renameFolderInStorage,
  saveLibrarySerialized,
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
  //
  // Must be called outside any setLibrary updater — show() dispatches into
  // ToastProvider, and calling it from inside a setState updater is a
  // cross-component update during React's render phase (React warns, and
  // strict-mode's double-invoke would double-fire the toast). Every mutator
  // below computes `next` from libraryRef.current, then calls plain
  // setLibrary(next) followed by persist(next) — both post-render.
  //
  // Single JSON.stringify per persist call: saveLibrarySerialized and
  // estimateStorageBytesFromString both take the same pre-serialized string
  // instead of each re-stringifying the library.
  const persist = useCallback(
    (lib: StorageLibrary): StorageLibrary => {
      const json = JSON.stringify(lib);
      const ok = saveLibrarySerialized(json);
      if (!ok) {
        show({
          variant: "error",
          message:
            "Couldn't save your library — your browser's local storage may be full. Export a backup to avoid losing work.",
        });
      } else if (
        !warnedQuota.current &&
        estimateStorageBytesFromString(json) > LOCALSTORAGE_WARN_THRESHOLD_BYTES
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
      libraryRef.current = lib;
      setLibrary(lib);
      persist(lib);
    },
    [persist],
  );

  const updatePartPointOverrides = useCallback(
    (overrides: Record<string, number>) => {
      const next = { ...libraryRef.current, partPointOverrides: overrides };
      libraryRef.current = next;
      setLibrary(next);
      persist(next);
    },
    [persist],
  );

  const renameFactory = useCallback(
    (id: string, name: string) => {
      const factory = libraryRef.current.factories.find((f) => f.id === id);
      if (!factory) return;
      const next = updateFactory(libraryRef.current, { ...factory, name });
      libraryRef.current = next;
      setLibrary(next);
      persist(next);
    },
    [persist],
  );

  const renameFolder = useCallback(
    (id: string, name: string) => {
      const next = renameFolderInStorage(libraryRef.current, id, name);
      libraryRef.current = next;
      setLibrary(next);
      persist(next);
    },
    [persist],
  );

  const deleteFactory = useCallback(
    (id: string) => {
      const next = removeFactory(libraryRef.current, id);
      libraryRef.current = next;
      setLibrary(next);
      persist(next);
    },
    [persist],
  );

  const deleteFolder = useCallback(
    (id: string) => {
      const next = removeFolder(libraryRef.current, id);
      libraryRef.current = next;
      setLibrary(next);
      persist(next);
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
      const next = addFactory(libraryRef.current, dupe);
      libraryRef.current = next;
      setLibrary(next);
      persist(next);
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
      const next = moveFactoryInStorage(
        libraryRef.current,
        factoryId,
        folderId,
      );
      libraryRef.current = next;
      setLibrary(next);
      persist(next);
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
