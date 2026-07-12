"use client";

import { useMemo, useRef, useState } from "react";
import type useAutosave from "@/app/hooks/useAutosave";
import type useFactorySession from "@/app/hooks/useFactorySession";
import type useLibrary from "@/app/hooks/useLibrary";
import { downloadJson } from "@/app/lib/download";
import { sanitizeFilename } from "@/app/lib/filenames";
import {
  CURRENT_SCHEMA_VERSION,
  collectFactoryBundle,
  deserializeFactory,
  type SerializedFactory,
  type StorageLibrary,
} from "@/app/models/factory-storage";
import { mergeLibrary, mergeSingleFactory } from "@/app/models/library-ops";
import type Part from "@/app/models/part";
import { hasConsent } from "@/app/models/storage-service";

interface UseFactoryPageFlowsDeps {
  session: ReturnType<typeof useFactorySession>;
  autosave: ReturnType<typeof useAutosave>;
  libraryApi: ReturnType<typeof useLibrary>;
  requireConsent: (action: () => void) => void;
}

// Page-level flow wiring: save/load/new-clear choreography (with their
// confirm dialogs), import/export, and library drawer open state. Keeps
// FactoryPage itself to hook calls + layout.
export default function useFactoryPageFlows({
  session,
  autosave,
  libraryApi,
  requireConsent,
}: UseFactoryPageFlowsDeps) {
  const { library, reload, replaceLibrary } = libraryApi;
  const {
    factory,
    factoryName,
    currentFactoryId,
    isDirty,
    loadSerialized,
    clearTo,
    buildSerialized,
    doSave,
  } = session;
  const { autosaveEnabled, setAutosaveEnabled, enableAutosave, cancelPending } =
    autosave;

  const [libraryOpen, setLibraryOpen] = useState(false);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [unsavedPromptOpen, setUnsavedPromptOpen] = useState(false);
  const [pendingLoadFactory, setPendingLoadFactory] =
    useState<SerializedFactory | null>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [pendingClearFolderId, setPendingClearFolderId] = useState<
    string | null
  >(null);

  const otherFactoriesKey = useMemo(
    () =>
      JSON.stringify(
        library.factories
          .filter((sf) => sf.id !== currentFactoryId)
          .map((sf) => {
            return {
              id: sf.id,
              products: sf.productionLines
                .filter((pl) => pl.outputRate > 0)
                .map((pl) => pl.partSlug),
            };
          }),
      ),
    [library.factories, currentFactoryId],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: only update when the lookup key updates
  const deserializedOtherFactories = useMemo(
    () =>
      library.factories.flatMap((sf) => {
        if (sf.id === currentFactoryId) return [];
        const f = deserializeFactory(sf, library);
        if (!f) return [];
        return [{ sf, factory: f }];
      }),
    [otherFactoriesKey],
  );

  function addProductionLine(part: Part) {
    const libraryProducesIt = library.factories
      .filter((f) => f.id !== currentFactoryId)
      .some((f) =>
        f.productionLines.some(
          (pl) => pl.partSlug === part.slug && pl.outputRate > 0,
        ),
      );
    factory.addProductionLine(part, false, libraryProducesIt);
  }

  function removeProductionLine(part: Part) {
    factory.removeProductionLine(part);
  }

  function handleOpenLibrary() {
    if (libraryOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement;
    reload();
    setLibraryOpen(true);
  }

  function handleCloseLibrary() {
    setLibraryOpen(false);
    requestAnimationFrame(() => {
      previousFocusRef.current?.focus();
    });
  }

  // --- Save ---

  // An explicit save supersedes any pending debounced autosave; the first
  // successful save of a new factory enables autosave.
  function performSave() {
    cancelPending();
    const { firstSave } = doSave();
    if (firstSave) enableAutosave();
  }

  function handleSave() {
    requireConsent(performSave);
  }

  // --- Export / import ---

  function handleExportCurrent() {
    const root = buildSerialized();
    // Self-contained bundle: the factory plus every factory it references, as
    // independent entries that point to each other by id. Imports via the
    // existing library-detection path ("factories" key).
    const factories = collectFactoryBundle(root, library);
    const bundle: StorageLibrary = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      folders: [],
      factories,
      rootId: root.id,
    };
    downloadJson(bundle, `${sanitizeFilename(factoryName)}.json`);
  }

  function handleImport(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        const isLibrary = "factories" in parsed;
        const isSingleFactory = "productionLines" in parsed;

        if (isLibrary) {
          importLibrary(parsed as StorageLibrary);
        } else if (isSingleFactory) {
          importSingleFactory(parsed as SerializedFactory);
        } else {
          alert("Unrecognized JSON format.");
        }
      } catch {
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
  }

  // Legacy single-factory files (schema <= 3) may embed nested factories. Run
  // them through the same bundle path so embedded copies become independent
  // entries, then load the imported factory.
  function importSingleFactory(data: SerializedFactory) {
    const { library: updatedLib, root } = mergeSingleFactory(library, data);
    if (!root) return;

    if (hasConsent()) {
      replaceLibrary(updatedLib);
    }

    // Resolve nested references against the freshly merged library, not the
    // stale state snapshot.
    loadSerialized(root, updatedLib);
  }

  function importLibrary(data: StorageLibrary) {
    if (!hasConsent()) {
      requireConsent(handleOpenLibrary);
      return;
    }

    const { library: updatedLib, root } = mergeLibrary(library, data);
    replaceLibrary(updatedLib);

    // Exported bundles carry the root factory's id — load it directly (resolving
    // references against the freshly merged library) instead of opening the drawer.
    if (root) {
      loadSerialized(root, updatedLib);
    } else {
      handleOpenLibrary();
    }
  }

  // --- Load factory from library ---

  function handleLoadFactory(serialized: SerializedFactory) {
    if (isDirty) {
      setPendingLoadFactory(serialized);
      setUnsavedPromptOpen(true);
    } else {
      loadSerialized(serialized, library);
      setLibraryOpen(false);
    }
  }

  function handleUnsavedSaveAndLoad() {
    performSave();
    if (pendingLoadFactory) {
      loadSerialized(pendingLoadFactory, library);
      setLibraryOpen(false);
    }
    setUnsavedPromptOpen(false);
    setPendingLoadFactory(null);
  }

  function handleUnsavedDiscardAndLoad() {
    if (pendingLoadFactory) {
      loadSerialized(pendingLoadFactory, library);
      setLibraryOpen(false);
    }
    setUnsavedPromptOpen(false);
    setPendingLoadFactory(null);
  }

  function handleUnsavedCancel() {
    setUnsavedPromptOpen(false);
    setPendingLoadFactory(null);
  }

  // --- New factory ---

  function handleNewFactory(folderId: string | null) {
    if (isDirty) {
      if (autosaveEnabled && hasConsent()) {
        // Auto-save then clear without prompting — autosave is on so no data is lost
        performSave();
        performClearFactory(folderId);
        return;
      }
      setPendingClearFolderId(folderId);
      setClearConfirmOpen(true);
      return;
    }
    performClearFactory(folderId);
  }

  function performClearFactory(folderId: string | null) {
    clearTo(folderId);
    setLibraryOpen(false);
    setAutosaveEnabled(false, { persist: false });
  }

  function handleClearSaveAndContinue() {
    if (hasConsent()) performSave();
    setClearConfirmOpen(false);
    performClearFactory(pendingClearFolderId);
    setPendingClearFolderId(null);
  }

  function handleClearDiscardAndContinue() {
    setClearConfirmOpen(false);
    performClearFactory(pendingClearFolderId);
    setPendingClearFolderId(null);
  }

  function handleClearCancel() {
    setClearConfirmOpen(false);
    setPendingClearFolderId(null);
  }

  function handleNavigateToFactory(id: string) {
    const sf = library.factories.find((f) => f.id === id);
    if (sf) handleLoadFactory(sf);
  }

  function handleToggleAutosave() {
    setAutosaveEnabled(!autosaveEnabled);
  }

  function handleIconChange(icon: string | undefined) {
    factory.setIcon(icon);
  }

  return {
    libraryOpen,
    unsavedPromptOpen,
    clearConfirmOpen,
    deserializedOtherFactories,
    addProductionLine,
    removeProductionLine,
    handleOpenLibrary,
    handleCloseLibrary,
    performSave,
    handleSave,
    handleExportCurrent,
    handleImport,
    handleLoadFactory,
    handleUnsavedSaveAndLoad,
    handleUnsavedDiscardAndLoad,
    handleUnsavedCancel,
    handleNewFactory,
    handleClearSaveAndContinue,
    handleClearDiscardAndContinue,
    handleClearCancel,
    handleNavigateToFactory,
    handleToggleAutosave,
    handleIconChange,
  };
}
