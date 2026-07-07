"use client";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tab,
  Tabs,
  Tooltip,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSnapshot } from "valtio";
import { sanitizeFilename } from "@/app/lib/filenames";
import { formatSolverError } from "@/app/lib/format-solver-error";
import useAutosave from "../hooks/useAutosave";
import useConsentGate from "../hooks/useConsentGate";
import useDragResize from "../hooks/useDragResize";
import useFactorySession from "../hooks/useFactorySession";
import useFactoryUrlSync, { type Section } from "../hooks/useFactoryUrlSync";
import useLibrary from "../hooks/useLibrary";
import { downloadJson } from "../lib/download";
import {
  CURRENT_SCHEMA_VERSION,
  collectFactoryBundle,
  deserializeFactory,
  type SerializedFactory,
  type StorageLibrary,
} from "../models/factory-storage";
import { mergeLibrary, mergeSingleFactory } from "../models/library-ops";
import type Part from "../models/part";
import {
  getLibraryPinned,
  hasConsent,
  setLibraryPinned as persistLibraryPinned,
} from "../models/storage-service";
import FactoryHeader from "./FactoryHeader";
import FactoryLibraryDrawer from "./FactoryLibraryDrawer";
import FactoryOverviewComponent from "./FactoryOverviewComponent";
import LogisticsSection from "./LogisticsSection";
import OptimizationSection from "./OptimizationSection";
import PlanningSection from "./PlanningSection";
import StorageConsentDialog from "./StorageConsentDialog";
import ConfirmDialog from "./ui/ConfirmDialog";

export default function FactoryComponent() {
  const [activeSection, setActiveSection] = useState<Section>("planning");
  const [forceExpanded, setForceExpanded] = useState<boolean | null>(null);
  const [libraryPinned, setLibraryPinned] = useState(false);
  const { sidebarWidth, handleResizeDividerMouseDown } = useDragResize();

  const {
    library,
    setLibrary,
    reload,
    replaceLibrary,
    updatePartPointOverrides,
  } = useLibrary();

  const {
    store,
    factory,
    factoryName,
    setFactoryName,
    currentFactoryId,
    currentSlug,
    currentFolderId,
    createdAt,
    isDirty,
    loadSerialized,
    clearTo,
    rebuild,
    buildSerialized,
    doSave,
    onFactoryMutate,
    onSessionSwap,
  } = useFactorySession({ library, setLibrary });

  const { autosaveEnabled, setAutosaveEnabled, enableAutosave, cancelPending } =
    useAutosave({
      onFactoryMutate,
      onSessionSwap,
      buildSerialized,
      doSave: () => performSave(),
    });

  // Re-render trigger only — children receive the proxy, not the snapshot.
  // Every model mutation funnels through update() → _updateRates, which
  // rebuilds rateLookup, so this single tracked read covers all edits.
  const _rateTrigger = useSnapshot(store).factory.rateLookup;
  const [libraryOpen, setLibraryOpen] = useState(false);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const { consentOpen, requireConsent, handleAllow, handleCancel } =
    useConsentGate({ onConsentGranted: () => reload() });
  const [unsavedPromptOpen, setUnsavedPromptOpen] = useState(false);
  const [pendingLoadFactory, setPendingLoadFactory] =
    useState<SerializedFactory | null>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [pendingClearFolderId, setPendingClearFolderId] = useState<
    string | null
  >(null);
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false);

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

  useFactoryUrlSync({
    session: { loadSerialized, clearTo, currentFactoryId, currentSlug },
    libraryApi: { reload },
    activeSection,
    setActiveSection,
    onOrphanAutosaveRestore: () =>
      setAutosaveEnabled(false, { persist: false }),
  });

  // On mount: read drawer-pinned pref (restore itself lives in useFactoryUrlSync).
  useEffect(() => {
    setLibraryPinned(getLibraryPinned());
  }, []);

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

  // --- Consent gate (state machine lives in useConsentGate) ---

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

  const handlePinChange = useCallback((pinned: boolean) => {
    setLibraryPinned(pinned);
    persistLibraryPinned(pinned);
  }, []);

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

  // --- Export ---

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

  // --- Import ---

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

  function handleUnsavedCancel() {
    setUnsavedPromptOpen(false);
    setPendingLoadFactory(null);
  }

  function handleNavigateToFactory(id: string) {
    const sf = library.factories.find((f) => f.id === id);
    if (sf) handleLoadFactory(sf);
  }

  function handleToggleAutosave() {
    setAutosaveEnabled(!autosaveEnabled);
  }

  function handleIconChange(icon: string | undefined) {
    factory.icon = icon;
    factory.update();
  }

  function handleUpdateGlobalPointOverrides(overrides: Record<string, number>) {
    updatePartPointOverrides(overrides);
  }

  return (
    <>
      <StorageConsentDialog
        open={consentOpen}
        onAllow={handleAllow}
        onCancel={handleCancel}
      />

      {!libraryPinned && (
        <FactoryLibraryDrawer
          open={libraryOpen}
          onClose={handleCloseLibrary}
          library={library}
          currentFactoryId={currentFactoryId}
          onLibraryChange={setLibrary}
          onLoadFactory={handleLoadFactory}
          onNewFactory={handleNewFactory}
          onImport={handleImport}
          pinned={false}
          onPinChange={handlePinChange}
        />
      )}

      <ConfirmDialog
        open={unsavedPromptOpen}
        title="Unsaved changes"
        message="You have unsaved changes in the current factory. What would you like to do?"
        confirmLabel="Save & load"
        secondaryLabel="Discard & load"
        onSecondary={handleUnsavedDiscardAndLoad}
        onConfirm={handleUnsavedSaveAndLoad}
        onCancel={handleUnsavedCancel}
      />

      <Dialog
        open={jsonDialogOpen}
        onClose={() => setJsonDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle className="flex items-center justify-between">
          Factory JSON
          <Tooltip title="Copy to clipboard">
            <IconButton
              size="small"
              onClick={() =>
                navigator.clipboard.writeText(
                  JSON.stringify(buildSerialized(), null, 2),
                )
              }
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </DialogTitle>
        <DialogContent>
          <pre className="text-xs overflow-auto whitespace-pre-wrap break-all">
            {JSON.stringify(buildSerialized(), null, 2)}
          </pre>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJsonDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={clearConfirmOpen}
        title="Clear factory?"
        message="You have unsaved changes in the current factory. What would you like to do?"
        confirmLabel="Save & clear"
        secondaryLabel="Discard & clear"
        onSecondary={handleClearDiscardAndContinue}
        onConfirm={handleClearSaveAndContinue}
        onCancel={handleClearCancel}
      />

      <div className="flex flex-row grow min-h-full min-w-full">
        {libraryPinned && (
          <FactoryLibraryDrawer
            open={true}
            onClose={handleCloseLibrary}
            library={library}
            currentFactoryId={currentFactoryId}
            onLibraryChange={setLibrary}
            onLoadFactory={handleLoadFactory}
            onNewFactory={handleNewFactory}
            onImport={handleImport}
            pinned={true}
            onPinChange={handlePinChange}
          />
        )}
        <div
          className={`flex flex-col min-h-full grow ${libraryPinned ? "min-w-0" : "min-w-full"}`}
        >
          <FactoryHeader
            factoryName={factoryName}
            factoryIcon={factory.icon}
            isDirty={isDirty}
            autosaveEnabled={autosaveEnabled}
            onNameChange={setFactoryName}
            onIconChange={handleIconChange}
            onOpenLibrary={
              libraryPinned
                ? undefined
                : () => requireConsent(handleOpenLibrary)
            }
            onSave={handleSave}
            onToggleAutosave={handleToggleAutosave}
            onExport={handleExportCurrent}
            onImport={handleImport}
            onNewFactory={() => handleNewFactory(null)}
            onViewJson={() => setJsonDialogOpen(true)}
            onExpandAll={() => setForceExpanded(true)}
            onCollapseAll={() => setForceExpanded(false)}
            productionLineCount={factory.productionLines.length}
          />

          <Tabs
            value={activeSection}
            onChange={(_, v) => setActiveSection(v as Section)}
            className="border-b border-gray-700"
          >
            <Tab label="Planning" value="planning" />
            <Tab label="Optimization" value="optimization" />
            <Tab label="Logistics" value="logistics" />
          </Tabs>

          {factory.solverError && (
            <Alert severity="warning" className="m-2 text-sm">
              {formatSolverError(factory.solverError)}
            </Alert>
          )}

          <div className="flex flex-row grow">
            <div className="flex flex-col grow min-w-0">
              {activeSection === "planning" && (
                <PlanningSection
                  factory={factory}
                  library={library}
                  currentFactoryId={currentFactoryId}
                  candidateFactories={deserializedOtherFactories}
                  forceExpanded={forceExpanded}
                  onToggle={() => setForceExpanded(null)}
                  onAddProduct={addProductionLine}
                  onRemoveProduct={removeProductionLine}
                  onNavigateToFactory={handleNavigateToFactory}
                />
              )}
              {activeSection === "optimization" && (
                <OptimizationSection
                  factory={factory}
                  library={library}
                  currentFactoryId={currentFactoryId}
                  onUpdateLibrary={handleUpdateGlobalPointOverrides}
                />
              )}
              {activeSection === "logistics" && (
                <LogisticsSection
                  factory={factory}
                  library={library}
                  currentFactoryId={currentFactoryId}
                  onNavigateToFactory={handleNavigateToFactory}
                />
              )}
            </div>
            {/* biome-ignore lint/a11y/noStaticElementInteractions: mouse-only resize handle; keyboard-accessible version tracked separately */}
            <div
              className="w-1.5 cursor-ew-resize flex-none hover:bg-blue-500/40 bg-black/20 dark:bg-white/20 min-h-full transition-colors"
              onMouseDown={handleResizeDividerMouseDown}
            />
            <div
              style={{ width: sidebarWidth }}
              className="flex-none overflow-y-auto"
            >
              <FactoryOverviewComponent
                factory={factory}
                onRebuild={rebuild}
                library={library}
                currentFactoryId={currentFactoryId}
                onNavigateToFactory={handleNavigateToFactory}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
