"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { proxy, subscribe } from "valtio/vanilla";
import Factory from "../models/factory";
import { generateFactoryName } from "../models/factory-names";
import {
  deserializeFactory,
  generateId,
  generateSlug,
  type SerializedFactory,
  type StorageLibrary,
  serializeFactory,
} from "../models/factory-storage";
import {
  addFactory,
  clearAutosave,
  clearCurrentFactoryId,
  setCurrentFactoryId as persistCurrentFactoryId,
  saveLibrary,
  updateFactory,
} from "../models/storage-service";

export interface LoadSerializedOptions {
  markDirty?: boolean;
  backfillSlug?: boolean;
  persistCurrentId?: boolean;
}

interface UseFactorySessionDeps {
  library: StorageLibrary;
  setLibrary: (lib: StorageLibrary) => void;
}

// Recompute-only shim (model M4 deletes it along with the update field).
// Deliberately a `function` using `this`: model methods call `this.update()`
// through the valtio proxy, so `this` is the proxy and the rebuilt lookups are
// tracked writes. Assigned on the raw instance before proxying/swapping so the
// assignment itself never fires the subscription.
function installUpdateShim(raw: Factory) {
  raw.update = function (this: Factory) {
    this._updateRates();
  };
}

// Session-level Factory state: the valtio proxy container, session identity
// fields, the single loadSerialized restore path, and new/clear + save flows.
// The container is the only place the session's Factory is created or swapped.
export default function useFactorySession({
  library,
  setLibrary,
}: UseFactorySessionDeps) {
  const storeRef = useRef<{ factory: Factory } | null>(null);
  if (storeRef.current === null) {
    const raw = new Factory();
    installUpdateShim(raw);
    storeRef.current = proxy({ factory: raw });
  }
  const store = storeRef.current;

  const [factoryName, setFactoryNameState] = useState(() =>
    generateFactoryName(),
  );
  const [currentFactoryId, setCurrentFactoryId] = useState<string | null>(null);
  const [currentSlug, setCurrentSlug] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  // Muted during restore/clear so deserialization-driven writes and the
  // post-swap recompute never mark a fresh load dirty. valtio batches
  // notification into a microtask queued on the first mutation; queueMicrotask
  // runs after it (FIFO), so the unmute lands after the muted notification.
  const muted = useRef(false);
  const mutateListeners = useRef<Set<() => void>>(new Set());
  const swapListeners = useRef<Set<() => void>>(new Set());

  useEffect(() => {
    // One subscription on the container: survives factory swaps.
    return subscribe(store, () => {
      if (muted.current) return;
      setIsDirty(true);
      for (const cb of mutateListeners.current) cb();
    });
  }, [store]);

  const onFactoryMutate = useCallback((cb: () => void) => {
    mutateListeners.current.add(cb);
    return () => {
      mutateListeners.current.delete(cb);
    };
  }, []);

  const onSessionSwap = useCallback((cb: () => void) => {
    swapListeners.current.add(cb);
    return () => {
      swapListeners.current.delete(cb);
    };
  }, []);

  function muteDuring(fn: () => void) {
    muted.current = true;
    try {
      fn();
    } finally {
      queueMicrotask(() => {
        muted.current = false;
      });
    }
  }

  function emitSwap() {
    for (const cb of swapListeners.current) cb();
  }

  // Name edits mark the session dirty and count as a mutation for autosave.
  function setFactoryName(name: string) {
    setFactoryNameState(name);
    setIsDirty(true);
    for (const cb of mutateListeners.current) cb();
  }

  // The single restore path (replaces the four duplicated pre-refactor restore
  // blocks). Persistence writes are unconditional, matching the old call
  // sites — storage-service functions don't check consent themselves.
  function loadSerialized(
    sf: SerializedFactory,
    lib: StorageLibrary,
    opts: LoadSerializedOptions = {},
  ): boolean {
    const {
      markDirty = false,
      backfillSlug = true,
      persistCurrentId = true,
    } = opts;

    const loaded = deserializeFactory(sf, lib);
    if (!loaded) {
      alert(
        "Could not restore factory — some recipe or part data may be missing.",
      );
      return false;
    }

    // Backfill a missing slug so the URL immediately shows a readable slug.
    let slug = sf.slug ?? null;
    if (backfillSlug && !sf.slug) {
      const existingSlugs = lib.factories.flatMap((f) =>
        f.slug && f.id !== sf.id ? [f.slug] : [],
      );
      slug = generateSlug(sf.name, existingSlugs);
      const updatedLib = updateFactory(lib, { ...sf, slug });
      saveLibrary(updatedLib);
      setLibrary(updatedLib);
    }

    installUpdateShim(loaded);
    muteDuring(() => {
      store.factory = loaded;
    });
    setFactoryNameState(sf.name);
    setCurrentFactoryId(sf.id);
    setCurrentSlug(slug);
    setCurrentFolderId(sf.folderId);
    setCreatedAt(sf.createdAt);
    setIsDirty(markDirty);
    if (persistCurrentId) persistCurrentFactoryId(sf.id);
    emitSwap();
    return true;
  }

  // Reset to a fresh factory in the given folder. Drawer close and autosave
  // disable are page-level concerns wired by the caller.
  function clearTo(folderId: string | null) {
    const raw = new Factory();
    installUpdateShim(raw);
    muteDuring(() => {
      store.factory = raw;
    });
    setFactoryNameState(generateFactoryName());
    setCurrentFactoryId(null);
    setCurrentSlug(null);
    setCurrentFolderId(folderId);
    setCreatedAt("");
    setIsDirty(false);
    clearCurrentFactoryId();
    emitSwap();
  }

  // Same-content rebuild (overview's re-layout escape hatch): swap only, no
  // identity or dirty changes — mirrors the old rebuildFactory.
  function rebuild() {
    const raw = new Factory(store.factory);
    muteDuring(() => {
      store.factory = raw;
    });
  }

  function buildSerialized(overrideName?: string): SerializedFactory {
    const now = new Date().toISOString();
    return serializeFactory(store.factory, {
      id: currentFactoryId ?? generateId(),
      slug: currentSlug ?? undefined,
      name: overrideName ?? factoryName,
      folderId: currentFolderId,
      createdAt: createdAt || now,
      updatedAt: now,
    });
  }

  function doSave(): { firstSave: boolean } {
    const now = new Date().toISOString();
    const id = currentFactoryId ?? generateId();
    const isFirstSave = !currentFactoryId;
    if (!currentFactoryId) {
      setCurrentFactoryId(id);
      setCreatedAt(now);
    }

    // Slug is stable: assigned on first save, never regenerated on rename.
    const existingSlugs = library.factories
      .filter((f) => f.id !== id)
      .flatMap((f) => (f.slug ? [f.slug] : []));
    const slug = currentSlug ?? generateSlug(factoryName, existingSlugs);
    if (!currentSlug) setCurrentSlug(slug);

    const existingEntry = library.factories.find((f) => f.id === id);

    if (currentFactoryId && !existingEntry) {
      // Factory was deleted from the library while loaded — save as new entry
      const newId = generateId();
      const newSlug = generateSlug(
        factoryName,
        library.factories.flatMap((f) => (f.slug ? [f.slug] : [])),
      );
      setCurrentFactoryId(newId);
      setCurrentSlug(newSlug);
      setCreatedAt(now);
      const reserialised = serializeFactory(store.factory, {
        id: newId,
        slug: newSlug,
        name: factoryName,
        folderId: currentFolderId,
        createdAt: now,
        updatedAt: now,
      });
      const updatedLib = addFactory(library, reserialised);
      saveLibrary(updatedLib);
      setLibrary(updatedLib);
      clearAutosave();
      persistCurrentFactoryId(newId);
      setIsDirty(false);
      return { firstSave: isFirstSave };
    }

    const serialized = serializeFactory(store.factory, {
      id,
      slug,
      name: factoryName,
      folderId: currentFolderId,
      createdAt: currentFactoryId ? createdAt : now,
      updatedAt: now,
    });
    const updatedLib = existingEntry
      ? updateFactory(library, serialized)
      : addFactory(library, serialized);

    saveLibrary(updatedLib);
    setLibrary(updatedLib);
    clearAutosave();
    persistCurrentFactoryId(id);
    setIsDirty(false);
    return { firstSave: isFirstSave };
  }

  return {
    store,
    factory: store.factory,
    factoryName,
    setFactoryName,
    currentFactoryId,
    currentSlug,
    currentFolderId,
    setCurrentFolderId,
    createdAt,
    isDirty,
    loadSerialized,
    clearTo,
    rebuild,
    buildSerialized,
    doSave,
    onFactoryMutate,
    onSessionSwap,
  };
}
